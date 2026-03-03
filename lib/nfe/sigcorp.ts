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
export function signXML(xml: string, tagToSign: string, pfxBuffer: Buffer, password: string): string {
    try {
        const trimmedPassword = (password || "").trim();

        let p12Der;
        p12Der = pfxBuffer.toString('binary');

        const p12Asn1 = forge.asn1.fromDer(p12Der);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, trimmedPassword);

        let privateKeyForge: any = null;
        let certForge: any = null;
        const allCerts: any[] = [];

        for (const safeContents of p12.safeContents) {
            for (const safeBags of safeContents.safeBags) {
                if (safeBags.type === forge.pki.oids.keyBag || safeBags.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
                    privateKeyForge = safeBags.key;
                } else if (safeBags.type === forge.pki.oids.certBag && safeBags.cert) {
                    allCerts.push(safeBags.cert);
                }
            }
        }

        // Seleciona o certificado do emitente (end-entity, não-CA)
        for (const cert of allCerts) {
            const bc = cert.getExtension('basicConstraints');
            if (!bc || !bc.cA) {
                certForge = cert;
                break;
            }
        }
        if (!certForge && allCerts.length > 0) certForge = allCerts[0];

        if (!privateKeyForge || !certForge) {
            throw new Error("Certificado PFX inválido ou senha incorreta. Não foi possível extrair a chave privada.");
        }

        const pemKey = forge.pki.privateKeyToPem(privateKeyForge);
        const pemCert = forge.pki.certificateToPem(certForge);

        // xml-crypto v6 API — com publicCert para incluir KeyInfo/X509Certificate
        const sig = new SignedXml({
            privateKey: pemKey,
            publicCert: pemCert,
            signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
            canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
        });

        sig.addReference({
            xpath: `//*[local-name(.)='${tagToSign}']`,
            transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
            digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
            uri: "",
            isEmptyUri: true
        });

        const cleanedXml = cleanXMLWhitespace(xml);
        sig.computeSignature(cleanedXml, {
            location: { reference: `//*[local-name(.)='${tagToSign}']`, action: "after" }
        });

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

    const camposFiscaisFaltando = [];
    if (!company.cnpj) camposFiscaisFaltando.push("CNPJ da Empresa");
    if (!company.inscricaoMunicipal) camposFiscaisFaltando.push("Inscrição Municipal");
    if (!company.codigoServico) camposFiscaisFaltando.push("Código Tributação Municipal (ISS)");
    if (!company.itemListaServico) camposFiscaisFaltando.push("ID do Serviço (Item LC 116)");

    if (camposFiscaisFaltando.length > 0) {
        throw new Error(`Preencha os seguintes campos nas Configurações da Empresa/Fiscais: ${camposFiscaisFaltando.join(", ")}`);
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
    const rpsIdNumerico = invoice.nfeNumber || String(new Date().getTime()).slice(-8);
    const rpsIdName = `rps${rpsIdNumerico}`;

    const dataEmissao = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');

    // Validação do Cliente / Tomador
    const tomadorClient = invoice.client || {};
    const cpfCnpjTomador = (tomadorClient.cpf || tomadorClient.cnpj || "").replace(/\D/g, "");
    const cepTomador = (tomadorClient.cep || "").replace(/\D/g, "");

    if (cpfCnpjTomador.length !== 11 && cpfCnpjTomador.length !== 14) {
        throw new Error("⚠️ BLOQUEIO: O Cliente associado a esta fatura não possui um CPF ou CNPJ válido salvo em sua Ficha.");
    }
    if (cepTomador.length !== 8) {
        throw new Error("⚠️ BLOQUEIO: O Cliente associado a esta fatura não possui um CEP válido salvo em sua Ficha.");
    }

    const textoDiscriminacao = discriminacao || invoice.description;

    let xmlInfDeclaracao = `
        <InfDeclaracaoPrestacaoServico Id="${rpsIdName}">
            <Rps>
                <IdentificacaoRps>
                    <Numero>${rpsIdNumerico}</Numero>
                    <Serie>1</Serie>
                    <Tipo>1</Tipo>
                </IdentificacaoRps>
                <DataEmissao>${dataEmissao.substring(0, 10)}</DataEmissao>
                <Status>1</Status>
            </Rps>
            <Competencia>${dataEmissao.substring(0, 10)}</Competencia>
            <Servico>
                <Valores>
                    <ValorServicos>${Number(invoice.value).toFixed(2)}</ValorServicos>
                </Valores>
                <IssRetido>2</IssRetido>
                <ItemListaServico>${company.itemListaServico.replace(/[^0-9]/g, '')}</ItemListaServico>
                <CodigoTributacaoMunicipio>${company.codigoServico}</CodigoTributacaoMunicipio>
                <Discriminacao>${textoDiscriminacao.substring(0, 200)}</Discriminacao>
                <CodigoMunicipio>3131307</CodigoMunicipio>
                <ExigibilidadeISS>1</ExigibilidadeISS>
                <MunicipioIncidencia>3131307</MunicipioIncidencia>
            </Servico>
            <Prestador>
                <CpfCnpj>
                    <Cnpj>${company.cnpj.replace(/\D/g, "")}</Cnpj>
                </CpfCnpj>
                <InscricaoMunicipal>${company.inscricaoMunicipal.replace(/\D/g, "")}</InscricaoMunicipal>
            </Prestador>
            <TomadorServico>
                <IdentificacaoTomador>
                    <CpfCnpj>
                        ${cpfCnpjTomador.length === 14 ? `<Cnpj>${cpfCnpjTomador}</Cnpj>` : `<Cpf>${cpfCnpjTomador}</Cpf>`}
                    </CpfCnpj>
                </IdentificacaoTomador>
                <RazaoSocial>${tomadorClient.name || "CLIENTE CONSUMIDOR FINAL"}</RazaoSocial>
                <Endereco>
                    <Endereco>${tomadorClient.address || "RUA EXEMPLO"}</Endereco>
                    <Numero>${tomadorClient.number || "00"}</Numero>
                    <Bairro>${tomadorClient.neighborhood || "BAIRRO"}</Bairro>
                    <CodigoMunicipio>3131307</CodigoMunicipio>
                    <Uf>${tomadorClient.state || "MG"}</Uf>
                    <Cep>${cepTomador || "35160000"}</Cep>
                </Endereco>
            </TomadorServico>
            <OptanteSimplesNacional>${company.regimeTributario === 1 ? '1' : '2'}</OptanteSimplesNacional>
            <IncentivoFiscal>2</IncentivoFiscal>
        </InfDeclaracaoPrestacaoServico>
    `;

    // NÃO inclui <?xml?> pois o conteúdo vai direto no CDATA
    const baseXml = `<GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd"><Rps>${xmlInfDeclaracao}</Rps></GerarNfseEnvio>`;

    // 4. Assina o RPS (<InfDeclaracaoPrestacaoServico>)
    let signedXml = signXML(baseXml, "InfDeclaracaoPrestacaoServico", pfxBuffer, company.certificadoSenha);

    // 6. Define URL e Namespace baseado no Ambiente
    const isHomologation = environment === 'HOMOLOGATION';
    const wsUrl = isHomologation
        ? "https://testeipatinga.meumunicipio.online/abrasf/ws/nfs"
        : "https://abrasfipatinga.meumunicipio.online/ws/nfs";

    const soapNamespace = isHomologation
        ? "https://testeipatingaabrasf.meumunicipio.online/ws/nfs"
        : "https://abrasfipatinga.meumunicipio.online/ws/nfs";

    // 5. Monta o Envelope SOAP
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:proc="${soapNamespace}">
    <soapenv:Header/>
    <soapenv:Body>
        <proc:GerarNfseRequest>
            <nfseCabecMsg><![CDATA[<?xml version="1.0" encoding="utf-8"?><cabecalho xmlns="http://www.abrasf.org.br/nfse.xsd" versao="2.04"><versaoDados>2.04</versaoDados></cabecalho>]]></nfseCabecMsg>
            <nfseDadosMsg><![CDATA[${signedXml}]]></nfseDadosMsg>
        </proc:GerarNfseRequest>
    </soapenv:Body>
    </soapenv:Envelope>`;

    // 7. Envia pro Sigcorp!
    try {
        const response = await axios.post(wsUrl, soapEnvelope, {
            headers: {
                "Content-Type": "text/xml;charset=UTF-8",
                "SOAPAction": "nfs#GerarNfse"
            },
            timeout: 15000
        });

        return {
            success: true,
            soapResponse: response.data,
            requestXml: soapEnvelope,
            rpsNumero: rpsIdNumerico
        };

    } catch (error: any) {
        const errorData = error.response ? error.response.data : error.message;
        console.error("NFSE_SOAP_ERROR", errorData);
        return {
            success: false,
            error: errorData,
            requestXml: soapEnvelope
        };
    }
}

/**
 * Consulta uma NFS-e pelo RPS no SigCorp (Abrasf 2.04)
 * Retorna o número da nota, código de verificação e link de impressão da prefeitura
 */
export async function consultarNfsePorRps({ rpsNumero, company, environment = 'HOMOLOGATION' }: { rpsNumero: string, company: any, environment?: 'HOMOLOGATION' | 'PRODUCTION' }) {
    const isHomologation = environment === 'HOMOLOGATION';
    const wsUrl = isHomologation
        ? "https://testeipatinga.meumunicipio.online/abrasf/ws/nfs"
        : "https://abrasfipatinga.meumunicipio.online/ws/nfs";

    const soapNamespace = isHomologation
        ? "https://testeipatingaabrasf.meumunicipio.online/ws/nfs"
        : "https://abrasfipatinga.meumunicipio.online/ws/nfs";

    const portalBase = isHomologation
        ? "https://testeipatinga.meumunicipio.online"
        : "https://ipatinga.meumunicipio.online";

    const cnpj = (company.cnpj || "").replace(/\D/g, "");
    const im = (company.inscricaoMunicipal || "").replace(/\D/g, "");

    const consultaXml = `<ConsultarNfseRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd"><IdentificacaoRps><Numero>${rpsNumero}</Numero><Serie>1</Serie><Tipo>1</Tipo></IdentificacaoRps><Prestador><CpfCnpj><Cnpj>${cnpj}</Cnpj></CpfCnpj><InscricaoMunicipal>${im}</InscricaoMunicipal></Prestador></ConsultarNfseRpsEnvio>`;

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:proc="${soapNamespace}">
    <soapenv:Header/>
    <soapenv:Body>
        <proc:ConsultarNfseRpsRequest>
            <nfseCabecMsg><![CDATA[<?xml version="1.0" encoding="utf-8"?><cabecalho xmlns="http://www.abrasf.org.br/nfse.xsd" versao="2.04"><versaoDados>2.04</versaoDados></cabecalho>]]></nfseCabecMsg>
            <nfseDadosMsg><![CDATA[${consultaXml}]]></nfseDadosMsg>
        </proc:ConsultarNfseRpsRequest>
    </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(wsUrl, soapEnvelope, {
            headers: {
                "Content-Type": "text/xml;charset=UTF-8",
                "SOAPAction": "nfs#ConsultarNfseRps"
            },
            timeout: 15000
        });

        const xml = response.data;

        // Extrai dados da NFS-e
        const matchNumero = /Numero>(.*?)<\/Numero/i.exec(xml);
        const matchCodVerif = /CodigoVerificacao>(.*?)<\/CodigoVerificacao/i.exec(xml);
        const matchDataEmissao = /DataEmissao>(.*?)<\/DataEmissao/i.exec(xml);

        if (matchNumero && matchCodVerif) {
            const numeroNfse = matchNumero[1];
            const codigoVerificacao = matchCodVerif[1];

            // Link de impressão da prefeitura
            const linkImpressao = `${portalBase}/contribuinte/nfse/impressao?inscricaoMunicipal=${im}&numero=${numeroNfse}&codigoVerificacao=${codigoVerificacao}`;

            return {
                success: true,
                numeroNfse,
                codigoVerificacao,
                dataEmissao: matchDataEmissao?.[1] || null,
                linkImpressao,
                soapResponse: xml
            };
        }

        // Se não encontrou os dados, pode ser que ainda esteja processando
        const matchMsg = /Mensagem>(.*?)<\/Mensagem/i.exec(xml);
        return {
            success: false,
            message: matchMsg?.[1] || "NFS-e ainda não processada pela prefeitura.",
            soapResponse: xml
        };

    } catch (error: any) {
        const errorData = error.response ? error.response.data : error.message;
        return {
            success: false,
            message: "Erro ao consultar NFS-e na prefeitura.",
            error: errorData
        };
    }
}
