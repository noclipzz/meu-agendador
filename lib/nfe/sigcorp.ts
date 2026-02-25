import axios from 'axios';
import { SignedXml } from 'xml-crypto';
import * as forge from 'node-forge';
import crypto from 'crypto';

function cleanXMLWhitespace(xml: string) {
    return xml.replace(/\s*(<[^>]+>)\s*/g, '$1').trim();
}

/**
 * Assina um elemento XML usando Padrão ABRASF (RSA-SHA1 com certificado A1)
 */
function signXML(xml: string, tagToSign: string, pfxBase64OrBuffer: any, password: string) {
    try {
        // Converte P12/PFX para resgatar Chave Privada e Certificado
        const p12Der = forge.util.decode64(Buffer.isBuffer(pfxBase64OrBuffer) ? pfxBase64OrBuffer.toString('base64') : pfxBase64OrBuffer);
        const p12Asn1 = forge.asn1.fromDer(p12Der);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

        let privateKeyForge: any = null;
        let certForge: any = null;

        // Pega as bags
        for (const safeContents of p12.safeContents) {
            for (const safeBags of safeContents.safeBags) {
                if (safeBags.type === forge.pki.oids.keyBag || safeBags.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
                    privateKeyForge = safeBags.key;
                } else if (safeBags.type === forge.pki.oids.certBag) {
                    certForge = safeBags.cert;
                }
            }
        }

        if (!privateKeyForge || !certForge) {
            throw new Error("Certificado PFX inválido ou senha incorreta. Não foi possível extrair a chave privada.");
        }

        const pemKey = forge.pki.privateKeyToPem(privateKeyForge);
        const pemCert = forge.pki.certificateToPem(certForge);
        const certB64 = pemCert.split('\n').filter((line: string) => !line.includes('CERTIFICATE') && line.trim() !== '').join('');

        // 📝 Prepara a assinatura usando xml-crypto
        const sig = new SignedXml();

        // No RPS Padrão ABRASF, geralmente assinamos a Tag do <InfDeclaracaoPrestacaoServico> ou <Rps> se for RPS simples
        // @ts-ignore
        sig.addReference(`//*[local-name(.)='${tagToSign}']`, ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"], "http://www.w3.org/2000/09/xmldsig#sha1", "", "", "", true);

        // @ts-ignore
        sig.signingKey = pemKey;
        sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";

        // Inclui o Certificado Publico no XML Envelopado (<KeyInfo>)
        // @ts-ignore
        sig.keyInfoProvider = {
            getKeyInfo: () => `<X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`,
            getKey: () => pemCert
        };

        const cleanedXml = cleanXMLWhitespace(xml);
        sig.computeSignature(cleanedXml);

        return sig.getSignedXml();
    } catch (e: any) {
        throw new Error(`Erro na assinatura do XML: ${e.message}`);
    }
}

/**
 * Função Principal para Emitir NFe em Homologação/Produção pelo SigCorp (Abrasf 2.04)
 */
export async function emitirNfeSigcorp({ invoice, company, environment = 'HOMOLOGATION', discriminacao }: { invoice: any, company: any, environment?: 'HOMOLOGATION' | 'PRODUCTION', discriminacao?: string }) {

    // 1. Checa Informações da Empresa
    if (!company.certificadoA1Url || !company.certificadoSenha) {
        throw new Error("Sua empresa precisa ter um Certificado A1 (.pfx) com a respectiva Senha para emitir/assinar Notas Fiscais.");
    }
    if (!company.cnpj || !company.inscricaoMunicipal || !company.codigoServico) {
        throw new Error("Preencha o CNPJ, Inscrição Municipal e o Código do Serviço (NFS-e) nas Configurações Fiscais.");
    }

    // 2. Faz o download do PFX salvo na nuvem
    let pfxBuffer: Buffer;
    try {
        const certResponse = await axios.get(company.certificadoA1Url, { responseType: 'arraybuffer' });
        pfxBuffer = Buffer.from(certResponse.data);
    } catch {
        throw new Error("Erro ao tentar baixar o certificado digital do nosso servidor para assinar a nota. Tente reenviar o arquivo na tela de configurações.");
    }

    // 3. Monta o XML do RPS padrão Abrasf v2.04
    // Identificador único do RPS
    const rpsIdNumerico = invoice.nfeNumber || String(new Date().getTime()).slice(-8); // Gera um numero auto se n tiver
    const rpsIdName = `rps${rpsIdNumerico}`;

    const dataEmissao = new Date().toISOString().split(".")[0];

    // Validação Basico do Cliente / Tomador
    const tomadorClient = invoice.client || {};
    const cpfCnpjTomador = (tomadorClient.cpf || tomadorClient.cnpj || "").replace(/\D/g, "");
    const cepTomador = (tomadorClient.cep || "").replace(/\D/g, "");

    // TRAVA DE SEGURANÇA
    if (cpfCnpjTomador.length !== 11 && cpfCnpjTomador.length !== 14) {
        throw new Error("⚠️ BLOQUEIO: O Cliente associado a esta fatura não possui um CPF ou CNPJ válido salvo em sua Ficha.");
    }
    if (cepTomador.length !== 8) {
        throw new Error("⚠️ BLOQUEIO: O Cliente associado a esta fatura não possui um CEP válido salvo em sua Ficha.");
    }

    // DISCRIMINAÇÃO DOS SERVIÇOS
    const textoDiscriminacao = discriminacao || invoice.description;

    let xmlInfDeclaracao = `
        <InfDeclaracaoPrestacaoServico Id="${rpsIdName}">
            <Rps>
                <IdentificacaoRps>
                    <Numero>${rpsIdNumerico}</Numero>
                    <Serie>1</Serie>
                    <Tipo>1</Tipo>
                </IdentificacaoRps>
                <DataEmissao>${dataEmissao}</DataEmissao>
                <Status>1</Status>
            </Rps>
            <Competencia>${dataEmissao.substring(0, 10)}</Competencia>
            <Servico>
                <Valores>
                    <ValorServicos>${Number(invoice.value).toFixed(2)}</ValorServicos>
                </Valores>
                <IssRetido>2</IssRetido>
                <ItemListaServico>${company.codigoServico.replace(/[^0-9]/g, '')}</ItemListaServico>
                <CodigoTributacaoMunicipio>${company.codigoServico}</CodigoTributacaoMunicipio>
                <Discriminacao>${textoDiscriminacao.substring(0, 200)}</Discriminacao>
                <CodigoMunicipio>3131307</CodigoMunicipio> <!-- IBGE IPATINGA-MG (Ajustar dinamicamente se mult-cidade) -->
                <ExigibilidadeIss>1</ExigibilidadeIss>
                <MunicipioIncidencia>3131307</MunicipioIncidencia>
            </Servico>
            <Prestador>
                <CpfCnpj>
                    <Cnpj>${company.cnpj.replace(/\D/g, "")}</Cnpj>
                </CpfCnpj>
                <InscricaoMunicipal>${company.inscricaoMunicipal.replace(/\D/g, "")}</InscricaoMunicipal>
            </Prestador>
            <Tomador>
                <IdentificacaoTomador>
                    <CpfCnpj>
                        ${cpfCnpjTomador.length === 14 ? `<Cnpj>${cpfCnpjTomador}</Cnpj>` : `<Cpf>${cpfCnpjTomador}</Cpf>`}
                    </CpfCnpj>
                </IdentificacaoTomador>
                <RazaoSocial>${tomadorClient.name || "CLIENTE CONSUMIDOR FINAL"}</RazaoSocial>
                <Endereco>
                    <Endereco>${tomadorClient.address || "Não informado"}</Endereco>
                    <Numero>${tomadorClient.number || "0"}</Numero>
                    <Bairro>${tomadorClient.neighborhood || "Centro"}</Bairro>
                    <CodigoMunicipio>3131307</CodigoMunicipio> 
                    <Uf>${tomadorClient.state || "MG"}</Uf>
                    <Cep>${(tomadorClient.cep || "00000000").replace(/\D/g, "")}</Cep>
                </Endereco>
            </Tomador>
            <OptanteSimplesNacional>${company.regimeTributario === 1 ? '1' : '2'}</OptanteSimplesNacional>
            <IncentivoFiscal>2</IncentivoFiscal>
        </InfDeclaracaoDeclaracaoPrestacaoServico>
    `;

    // Fechamento da tag no xmlBase 
    // CORRIGIDO erro na tag InfDeclaracaoPrestacaoServico q escrevei dupla
    xmlInfDeclaracao = xmlInfDeclaracao.replace('</InfDeclaracaoDeclaracaoPrestacaoServico>', '</InfDeclaracaoPrestacaoServico>');

    // Como o padrão Abrasf normalmente envia EnviarLoteRpsEnvio (Envio assíncrono ou síncrono). Vamos usar o metodo GerarNfse (que é sincrono e direto) da versão 2.04.
    const baseXml = `<?xml version="1.0" encoding="utf-8"?>
    <GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
        ${xmlInfDeclaracao}
    </GerarNfseEnvio>
    `;

    // 4. Assina o RPS (<InfDeclaracaoPrestacaoServico>)
    const signedXml = signXML(baseXml, "InfDeclaracaoPrestacaoServico", pfxBuffer, company.certificadoSenha);

    // 5. Monta o Envelope SOAP a ser enviado via POST para WebService
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfse="http://nfse.abrasf.org.br">
    <soapenv:Header/>
    <soapenv:Body>
        <nfse:GerarNfseRequest>
            <nfse:nfseCabecMsg><![CDATA[<cabecalho xmlns="http://www.abrasf.org.br/nfse.xsd" versao="2.04"><versaoDados>2.04</versaoDados></cabecalho>]]></nfse:nfseCabecMsg>
            <nfse:nfseDadosMsg><![CDATA[${signedXml}]]></nfse:nfseDadosMsg>
        </nfse:GerarNfseRequest>
    </soapenv:Body>
    </soapenv:Envelope>`;

    // 6. Define URL
    const wsUrl = environment === 'HOMOLOGATION'
        ? "https://testeipatinga.meumunicipio.online/abrasf/ws/nfs"
        : "https://abrasfipatinga.meumunicipio.online/ws/nfs";

    // 7. Envia pro Sigcorp!
    try {
        const response = await axios.post(wsUrl, soapEnvelope, {
            headers: {
                "Content-Type": "text/xml;charset=UTF-8",
                "SOAPAction": "http://nfse.abrasf.org.br/GerarNfse"
            },
            timeout: 15000 // 15 secs
        });

        return {
            success: true,
            soapResponse: response.data,
            requestXml: soapEnvelope // Retornamos para depuração
        };

    } catch (error: any) {
        // Sigcorp tbm retorna erro dentro do proprio corpo XML mesmo se SOAP Falhar (Status 500 etc)
        const errorData = error.response ? error.response.data : error.message;
        console.error("NFSE_SOAP_ERROR", errorData);
        return {
            success: false,
            error: errorData,
            requestXml: soapEnvelope
        };
    }
}
