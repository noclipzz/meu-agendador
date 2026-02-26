import { format } from 'date-fns';
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
async function getCoraAgent(certUrl?: string | null, keyUrl?: string | null) {
    if (certUrl && keyUrl) {
        try {
            console.log("📥 [CORA] Buscando certificados mTLS de URLs externas...");
            const [certRes, keyRes] = await Promise.all([
                axios.get(certUrl, { responseType: 'arraybuffer' }),
                axios.get(keyUrl, { responseType: 'arraybuffer' })
            ]);

            return new https.Agent({
                cert: Buffer.from(certRes.data),
                key: Buffer.from(keyRes.data),
            });
        } catch (error) {
            console.error("❌ [CORA] Erro ao baixar certificados mTLS:", error);
            throw new Error("Não foi possível carregar os certificados mTLS da Cora. Verifique as URLs.");
        }
    }

    // Fallback para arquivos locais (apenas para ambiente de desenvolvimento/seu uso)
    const certPath = path.join(process.cwd(), 'lib/cora/certs/certificate.pem');
    const keyPath = path.join(process.cwd(), 'lib/cora/certs/private-key.key');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        throw new Error('Certificados da Cora não encontrados/configurados.');
    }

    return new https.Agent({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
    });
}

export async function getCoraValidToken(companyId: string) {
    const company = await db.company.findUnique({
        where: { id: companyId }
    });

    if (!company?.coraClientId) {
        throw new Error('Empresa sem Client ID Cora configurado.');
    }

    // Retorna o token e as taxas para uso na criação da cobrança
    let accessToken = company.coraAccessToken;

    if (!company.coraAccessToken || !company.coraTokenExpiry || new Date(company.coraTokenExpiry) <= new Date()) {
        try {
            console.log(`🔐 [CORA] Autenticando Company: ${companyId}`);
            const agent = await getCoraAgent((company as any)?.coraCertUrl, (company as any)?.coraKeyUrl);

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

            accessToken = access_token;
        } catch (error: any) {
            const errInfo = error.response?.data || error.message;
            console.error('❌ [CORA_AUTH_ERROR]:', JSON.stringify(errInfo));
            throw new Error(`Cora Auth: ${JSON.stringify(errInfo)}`);
        }
    }

    return {
        token: accessToken,
        rules: {
            fine: Number(company.coraFineRate || 0),
            interest: Number(company.coraInterestRate || 0),
            discount: Number(company.coraDiscountRate || 0)
        }
    };
}

export async function createCoraCharge(companyId: string, invoiceId: string) {
    const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: true },
    });

    if (!invoice) throw new Error('Fatura não encontrada.');

    // Se já foi gerado na Cora, tenta buscar os dados mais recentes para garantir que temos o PIX
    if (invoice.gatewayId) {
        console.log("♻️ [CORA] Cobrança já iniciada. Sincronizando dados com a API...");
        try {
            const { token } = await getCoraValidToken(companyId);
            const companyData = await db.company.findUnique({ where: { id: companyId }, select: { coraCertUrl: true, coraKeyUrl: true } as any });

            const response = await axios.get(`${CORA_API_URL}/invoices/${invoice.gatewayId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                httpsAgent: await getCoraAgent((companyData as any)?.coraCertUrl, (companyData as any)?.coraKeyUrl)
            });
            const coraData = response.data;

            // Sincroniza nosso banco com os dados da Cora (caso o PIX tenha aparecido ou o boleto mudado)
            await db.invoice.update({
                where: { id: invoiceId },
                data: {
                    bankUrl: coraData.payment_options?.bank_slip?.url,
                    pixCopyPaste: coraData.payment_options?.pix?.emv,
                    pixQrCode: coraData.payment_options?.pix?.image_url,
                }
            });

            console.log("💎 [CORA] Dados sincronizados com sucesso.");
            return coraData;
        } catch (syncErr) {
            console.error("⚠️ [CORA] Erro ao sincronizar cobrança, retornando cache do banco.", syncErr);
            return {
                id: invoice.gatewayId,
                payment_options: {
                    bank_slip: { url: invoice.bankUrl },
                    pix: { emv: invoice.pixCopyPaste, image_url: invoice.pixQrCode }
                }
            };
        }
    }

    const { token, rules } = await getCoraValidToken(companyId);
    const company = await db.company.findUnique({ where: { id: companyId } });

    if (!invoice.client) throw new Error('Cliente não vinculado à fatura.');

    try {
        const docNumber = invoice.client.cpf?.replace(/\D/g, '') || invoice.client.cnpj?.replace(/\D/g, '');
        const docType = (invoice.client.cnpj && invoice.client.cnpj.replace(/\D/g, '').length > 11) ? 'CNPJ' : 'CPF';

        const totalAmount = Math.round(Number(invoice.value) * 100);

        const payload: any = {
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
                due_date: format(invoice.dueDate, 'yyyy-MM-dd'),
            },
        };

        // Adiciona Multa se configurado
        if (rules.fine > 0) {
            payload.payment_terms.fine = { rate: rules.fine };
        }

        // Adiciona Juros se configurado
        if (rules.interest > 0) {
            payload.payment_terms.interest = { rate: rules.interest };
        }

        // Adiciona Desconto se configurado
        if (rules.discount > 0) {
            payload.payment_terms.discount = {
                type: 'PERCENT',
                value: rules.discount
            };
        }

        console.log("📤 [CORA] Enviando Payload:", JSON.stringify(payload));

        const response = await axios.post(`${CORA_API_URL}/invoices`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Idempotency-Key': crypto.randomUUID()
            },
            httpsAgent: await getCoraAgent((company as any)?.coraCertUrl, (company as any)?.coraKeyUrl)
        });

        console.log("✅ [CORA] Cobrança criada!");
        const coraData = response.data;
        console.log("📦 [CORA_RESPONSE_DATA]:", JSON.stringify(coraData, null, 2));

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
