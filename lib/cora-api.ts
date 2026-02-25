import axios from 'axios';
import { db } from './db';
import fs from 'fs';
import path from 'path';
import https from 'https';

// URLs de STAGE/SANDBOX (conforme arquivos recebidos)
const CORA_AUTH_URL = 'https://matls-auth.stage.cora.com.br/token';
const CORA_API_URL = 'https://matls-api.stage.cora.com.br';

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

    // Caso contrário, tenta renovar usando refresh_token ou buscar novo access_token via client_credentials
    try {
        const authHeader = Buffer.from(`${company.coraClientId}:${company.coraClientSecret}`).toString('base64');

        // Simplificando para busca de novo token via client_credentials para facilitar o MVP
        // Nota: Em produção, boletos/pix PJ geralmente exigem mTLS (Certificados A1) na Cora
        // Obrigatório uso de mTLS (Agente com Certificado) para comunicação com a Cora
        const response = await axios.post(CORA_AUTH_URL, 'grant_type=client_credentials', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authHeader}`,
            },
            httpsAgent: getCoraAgent()
        });

        const { access_token, expires_in, refresh_token } = response.data;
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + expires_in - 60); // 1 min de margem

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
        console.error('Erro ao autenticar na Cora:', error.response?.data || error.message);
        throw new Error('Falha na autenticação com o Banco Cora.');
    }
}

export async function createCoraCharge(companyId: string, invoiceId: string) {
    const token = await getCoraValidToken(companyId);
    const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: true },
    });

    if (!invoice) throw new Error('Fatura não encontrada.');
    if (!invoice.client) throw new Error('Cliente não vinculado à fatura.');

    try {
        const response = await axios.post(`${CORA_API_URL}/invoices`, {
            code: invoice.id,
            customer: {
                name: invoice.client.name,
                email: invoice.client.email,
                cpf_cnpj: invoice.client.cpf?.replace(/\D/g, '') || invoice.client.cnpj?.replace(/\D/g, ''),
            },
            services: [{
                name: invoice.description || 'Serviço prestado',
                amount: Math.round(Number(invoice.value) * 100), // Cora usa centavos
            }],
            payment_methods: ['PIX', 'BANK_SLIP'],
            due_date: invoice.dueDate.toISOString().split('T')[0],
        }, {
            headers: { 'Authorization': `Bearer ${token}` },
            httpsAgent: getCoraAgent()
        });

        const coraData = response.data;

        // Atualiza a Invoice com os dados do banco
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
        console.error('Erro ao criar cobrança na Cora:', error.response?.data || error.message);
        throw new Error('Erro ao gerar cobrança no banco Cora.');
    }
}
