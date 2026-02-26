import axios from 'axios';
import { db } from './db';
import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

// URLs de STAGE/SANDBOX (conforme arquivos recebidos)
// URLs de STAGE/SANDBOX corrigidas para a Modalidade Integração Direta (Direct Integration)
const CORA_AUTH_URL = 'https://matls-clients.api.stage.cora.com.br/token';
const CORA_API_URL = 'https://matls-clients.api.stage.cora.com.br/v2';

// Carrega os certificados para o mTLS
function getCoraAgent() {
    const certPath = path.join(process.cwd(), 'lib/cora/certs/certificate.pem');
    const keyPath = path.join(process.cwd(), 'lib/cora/certs/private-key.key');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        throw new Error('Certificados da Cora não encontrados em lib/cora/certs/');
    }

    return new https.Agent({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
    });
}

export async function getCoraValidToken(companyId: string) {
    const company = await db.company.findUnique({
        where: { id: companyId },
        select: {
            coraClientId: true,
            coraClientSecret: true,
            coraAccessToken: true,
            coraRefreshToken: true,
            coraTokenExpiry: true,
        },
    });

    if (!company?.coraClientId || !company?.coraClientSecret) {
        throw new Error('Empresa sem credenciais Cora configuradas.');
    }

    // Se o token ainda é válido, retorna ele mesmo
    if (company.coraAccessToken && company.coraTokenExpiry && new Date(company.coraTokenExpiry) > new Date()) {
        return company.coraAccessToken;
    }

    // No ambiente de Stage da Cora com mTLS, a autenticação geralmente espera o client_id no corpo
    try {
        console.log(`🔐 [CORA] Autenticando Company: ${companyId}`);
        const agent = getCoraAgent();

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', company.coraClientId);

        const response = await axios.post(CORA_AUTH_URL, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            httpsAgent: agent
        });

        console.log("✅ [CORA] Autenticado!");

        const { access_token, expires_in, refresh_token } = response.data;
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + expires_in - 60);

        await db.company.update({
            where: { id: companyId },
            data: {
                coraAccessToken: access_token,
                coraRefreshToken: refresh_token || company.coraRefreshToken,
                coraTokenExpiry: expiryDate,
            },
        });

        return access_token;
    } catch (error: any) {
        const errInfo = error.response?.data || error.message;
        console.error('❌ [CORA_AUTH_ERROR]:', JSON.stringify(errInfo));
        throw new Error(`Cora Auth: ${JSON.stringify(errInfo)}`);
    }
}

export async function createCoraCharge(companyId: string, invoiceId: string) {
    const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: true },
    });

    if (!invoice) throw new Error('Fatura não encontrada.');

    // Se já foi gerado na Cora, não gera de novo. Retorna o que já temos.
    if (invoice.gatewayId && invoice.bankUrl) {
        console.log("♻️ [CORA] Cobrança já existente para esta fatura. Retornando dados salvos.");
        return {
            id: invoice.gatewayId,
            payment_options: {
                bank_slip: { url: invoice.bankUrl },
                pix: { emv: invoice.pixCopyPaste, image_url: invoice.pixQrCode }
            }
        };
    }

    const token = await getCoraValidToken(companyId);

    if (!invoice.client) throw new Error('Cliente não vinculado à fatura.');

    try {
        const docNumber = invoice.client.cpf?.replace(/\D/g, '') || invoice.client.cnpj?.replace(/\D/g, '');
        const docType = (invoice.client.cnpj && invoice.client.cnpj.replace(/\D/g, '').length > 11) ? 'CNPJ' : 'CPF';

        const totalAmount = Math.round(Number(invoice.value) * 100);

        const payload = {
            amount: totalAmount,
            code: invoice.id,
            customer: {
                name: invoice.client.name,
                email: invoice.client.email || 'financeiro@nohud.com.br',
                document: {
                    identity: docNumber,
                    type: docType
                }
            },
            services: [{
                name: invoice.description || 'Serviço prestado',
                amount: totalAmount,
            }],
            payment_options: {
                methods: ['PIX', 'BANK_SLIP']
            },
            payment_terms: {
                due_date: invoice.dueDate.toISOString().split('T')[0],
            },
        };

        console.log("📤 [CORA] Enviando Payload:", JSON.stringify(payload));

        const response = await axios.post(`${CORA_API_URL}/invoices`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Idempotency-Key': crypto.randomUUID()
            },
            httpsAgent: getCoraAgent()
        });

        console.log("✅ [CORA] Cobrança criada!");

        const coraData = response.data;

        await db.invoice.update({
            where: { id: invoiceId },
            data: {
                gatewayId: coraData.id,
                bankUrl: coraData.payment_options?.bank_slip?.url,
                pixCopyPaste: coraData.payment_options?.pix?.emv,
                pixQrCode: coraData.payment_options?.pix?.image_url,
            }
        });

        return coraData;
    } catch (error: any) {
        const errInfo = error.response?.data || error.message;
        console.error('❌ [CORA_CHARGE_ERROR]:', JSON.stringify(errInfo));
        throw new Error(`Cora Charge: ${JSON.stringify(errInfo)}`);
    }
}
