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

        let customMessage = "Falha na comunicação com a prefeitura.";
        if (typeof errorData === 'string') {
            const matchFault = /<faultstring>(.*?)<\/faultstring>/i.exec(errorData);
            if (matchFault) customMessage = `Erro Prefeitura: ${matchFault[1]}`;
        }

        return {
            success: false,
            error: customMessage,
            details: errorData,
            requestXml: soapEnvelope
        };
    }
}

/**
 * Analisa a resposta SOAP da GerarNfse e retorna um objeto estruturado.
 * Detecta corretamente: NFS-e gerada (síncrono), processamento assíncrono, e erros reais.
 */
export function parseGerarNfseResponse(soapXml: string) {
    const result = {
        nfseGerada: false,
        numeroNfse: '',
        codigoVerificacao: '',
        protocolo: '',
        mensagens: [] as { codigo: string, mensagem: string }[],
        isSuccess: false,
        isProcessing: false,
        isError: false,
        errorMessage: ''
    };

    // 1. Verifica se a NFS-e foi gerada com sucesso (resposta síncrona)
    const hasCompNfse = /<CompNfse>/i.test(soapXml) || /<ListaNfse>/i.test(soapXml);
    if (hasCompNfse) {
        result.nfseGerada = true;
        result.isSuccess = true;

        // Extrai número da NFS-e (dentro de InfNfse, NÃO o número do RPS)
        const matchNumNfse = /<InfNfse[^>]*>[\s\S]*?<Numero>(.*?)<\/Numero>/i.exec(soapXml);
        if (matchNumNfse) result.numeroNfse = matchNumNfse[1];

        const matchCodVerif = /<CodigoVerificacao>(.*?)<\/CodigoVerificacao>/i.exec(soapXml);
        if (matchCodVerif) result.codigoVerificacao = matchCodVerif[1];
    }

    // 2. Extrai protocolo (processamento assíncrono aceito)
    const matchProtocol = /<Protocolo>(.*?)<\/Protocolo>/i.exec(soapXml);
    if (matchProtocol) result.protocolo = matchProtocol[1];

    // 3. Extrai TODAS as mensagens de retorno (estruturadas)
    const mensagemRegex = /<MensagemRetorno>\s*[\s\S]*?<Codigo>(.*?)<\/Codigo>\s*[\s\S]*?<Mensagem>(.*?)<\/Mensagem>[\s\S]*?<\/MensagemRetorno>/gi;
    let match;
    while ((match = mensagemRegex.exec(soapXml)) !== null) {
        result.mensagens.push({ codigo: match[1], mensagem: match[2] });
    }

    // Fallback: tenta pegar <Mensagem> solta se não encontrou estruturadas
    if (result.mensagens.length === 0) {
        const msgRegex = /<Mensagem>(.*?)<\/Mensagem>/gi;
        const codRegex = /<Codigo>(.*?)<\/Codigo>/gi;
        const msgs: string[] = [];
        const codes: string[] = [];
        let m;
        while ((m = msgRegex.exec(soapXml)) !== null) msgs.push(m[1]);
        while ((m = codRegex.exec(soapXml)) !== null) codes.push(m[1]);
        for (let i = 0; i < msgs.length; i++) {
            result.mensagens.push({ codigo: codes[i] || '', mensagem: msgs[i] });
        }
    }

    // 4. Determina status final
    if (result.nfseGerada) {
        result.isSuccess = true;
    } else if (result.protocolo) {
        result.isProcessing = true;
    } else if (result.mensagens.length > 0) {
        // Códigos "L" = lote aceito/processando | "E" = erro real
        const hasErrorCode = result.mensagens.some(m =>
            m.codigo.toUpperCase().startsWith('E')
        );
        const hasSuccessIndicator = result.mensagens.some(m =>
            m.codigo.toUpperCase().startsWith('L') ||
            m.mensagem.toLowerCase().includes('sucesso') ||
            m.mensagem.toLowerCase().includes('recebida')
        );

        if (hasSuccessIndicator && !hasErrorCode) {
            result.isProcessing = true;
        } else if (hasErrorCode) {
            result.isError = true;
            result.errorMessage = result.mensagens
                .filter(m => m.codigo.toUpperCase().startsWith('E'))
                .map(m => `[${m.codigo}] ${m.mensagem}`)
                .join(' | ');
        } else {
            // Mensagem sem código — assume processando se não parece erro
            const pareceErro = result.mensagens.some(m =>
                m.mensagem.toLowerCase().includes('erro') ||
                m.mensagem.toLowerCase().includes('invalid') ||
                m.mensagem.toLowerCase().includes('rejeit')
            );
            if (pareceErro) {
                result.isError = true;
                result.errorMessage = result.mensagens.map(m => m.mensagem).join(' | ');
            } else {
                result.isProcessing = true;
            }
        }
    }

    console.log("[SIGCORP] parseGerarNfseResponse =>", JSON.stringify(result, null, 2));
    return result;
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
        <proc:ConsultarNfsePorRpsRequest>
            <nfseCabecMsg><![CDATA[<?xml version="1.0" encoding="utf-8"?><cabecalho xmlns="http://www.abrasf.org.br/nfse.xsd" versao="2.04"><versaoDados>2.04</versaoDados></cabecalho>]]></nfseCabecMsg>
            <nfseDadosMsg><![CDATA[${consultaXml}]]></nfseDadosMsg>
        </proc:ConsultarNfsePorRpsRequest>
    </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(wsUrl, soapEnvelope, {
            headers: {
                "Content-Type": "text/xml;charset=UTF-8",
                "SOAPAction": "nfs#ConsultarNfsePorRps"
            },
            timeout: 15000
        });

        const xml = response.data;
        console.log("[SIGCORP] consultarNfsePorRps RESPOSTA COMPLETA:", xml);

        // Extrai dados da NFS-e (dentro de InfNfse para pegar o nº correto, não o do RPS)
        const matchNumero = /<InfNfse[^>]*>[\s\S]*?<Numero>(.*?)<\/Numero>/i.exec(xml);
        const matchCodVerif = /<CodigoVerificacao>(.*?)<\/CodigoVerificacao>/i.exec(xml);
        const matchDataEmissao = /<DataEmissao>(.*?)<\/DataEmissao>/i.exec(xml);

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

        // Se não encontrou os dados, pode ser que ainda esteja processando ou tenha dado erro de schema
        const matchMsg = /<Mensagem>(.*?)<\/Mensagem>/i.exec(xml);
        const matchFault = /<faultstring>(.*?)<\/faultstring>/i.exec(xml);

        let errorMsg = "NFS-e ainda não processada pela prefeitura.";

        if (matchMsg) errorMsg = `Erro Prefeitura: ${matchMsg[1]}`;
        else if (matchFault) errorMsg = `Erro SOAP: ${matchFault[1]}`;
        else if (xml && !xml.includes("<Numero>")) {
            // Último recurso: mostra o começo da resposta se ela não tiver uma mensagem amigável e falhou
            const plainResponse = xml.replace(/(<([^>]+)>)/gi, "").trim();
            if (plainResponse.length > 0) {
                errorMsg = `Retorno: ${plainResponse.substring(0, 100)}...`;
            }
        }

        return {
            success: false,
            message: errorMsg,
            soapResponse: xml
        };

    } catch (error: any) {
        const errorData = error.response ? error.response.data : error.message;
        let msg = "Erro ao consultar NFS-e na prefeitura.";

        if (error.response?.status === 500) {
            msg = "🏦 O servidor da Prefeitura está com um erro interno (Erro 500). Tente novamente mais tarde.";
            if (typeof errorData === 'string') {
                const matchFault = /<faultstring>(.*?)<\/faultstring>/i.exec(errorData);
                if (matchFault) msg = `Erro Prefeitura: ${matchFault[1]}`;
            }
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            msg = "⚡ Servidor da Prefeitura demorou muito a responder (Time-out). Pode estar instável.";
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            msg = "🔌 Não foi possível conectar ao servidor da Prefeitura. O serviço pode estar FORA DO AR.";
        }

        return {
            success: false,
            message: msg,
            error: errorData
        };
    }
}

/**
 * Cancela uma NFS-e emitida no SigCorp (Abrasf 2.04)
 * Requer o número da NFS-e (não o RPS) e o código de verificação
 */
export async function cancelarNfse({ numeroNfse, codigoVerificacao, company, motivo, environment = 'HOMOLOGATION' }: {
    numeroNfse: string,
    codigoVerificacao?: string,
    company: any,
    motivo?: string,
    environment?: 'HOMOLOGATION' | 'PRODUCTION'
}) {
    if (!company.certificadoA1Url || !company.certificadoSenha) {
        throw new Error("Certificado A1 necessário para cancelar NFS-e.");
    }

    // 1. Faz o download do PFX
    let pfxBuffer: Buffer;
    try {
        const certResponse = await axios.get(company.certificadoA1Url, { responseType: 'arraybuffer' });
        pfxBuffer = Buffer.from(certResponse.data);
    } catch {
        throw new Error("Erro ao baixar o certificado digital.");
    }

    const isHomologation = environment === 'HOMOLOGATION';
    const wsUrl = isHomologation
        ? "https://testeipatinga.meumunicipio.online/abrasf/ws/nfs"
        : "https://abrasfipatinga.meumunicipio.online/ws/nfs";

    const soapNamespace = isHomologation
        ? "https://testeipatingaabrasf.meumunicipio.online/ws/nfs"
        : "https://abrasfipatinga.meumunicipio.online/ws/nfs";

    const cnpj = (company.cnpj || "").replace(/\D/g, "");
    const im = (company.inscricaoMunicipal || "").replace(/\D/g, "");

    // 2. Monta o XML de Cancelamento (ABRASF 2.04)
    const cancelXmlInner = `<Pedido>
        <InfPedidoCancelamento Id="cancel_${numeroNfse}">
            <IdentificacaoNfse>
                <Numero>${numeroNfse}</Numero>
                <CpfCnpj>
                    <Cnpj>${cnpj}</Cnpj>
                </CpfCnpj>
                <InscricaoMunicipal>${im}</InscricaoMunicipal>
                <CodigoMunicipio>3131307</CodigoMunicipio>
            </IdentificacaoNfse>
            <CodigoCancelamento>1</CodigoCancelamento>
        </InfPedidoCancelamento>
    </Pedido>`;

    const cancelXml = `<CancelarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">${cancelXmlInner}</CancelarNfseEnvio>`;

    // 3. Assina o XML
    let signedXml: string;
    try {
        signedXml = signXML(cancelXml, "InfPedidoCancelamento", pfxBuffer, company.certificadoSenha);
    } catch (e: any) {
        throw new Error(`Erro ao assinar XML de cancelamento: ${e.message}`);
    }

    // 4. Monta o Envelope SOAP
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:proc="${soapNamespace}">
    <soapenv:Header/>
    <soapenv:Body>
        <proc:CancelarNfseRequest>
            <nfseCabecMsg><![CDATA[<?xml version="1.0" encoding="utf-8"?><cabecalho xmlns="http://www.abrasf.org.br/nfse.xsd" versao="2.04"><versaoDados>2.04</versaoDados></cabecalho>]]></nfseCabecMsg>
            <nfseDadosMsg><![CDATA[${signedXml}]]></nfseDadosMsg>
        </proc:CancelarNfseRequest>
    </soapenv:Body>
    </soapenv:Envelope>`;

    // 5. Envia para a prefeitura
    try {
        const response = await axios.post(wsUrl, soapEnvelope, {
            headers: {
                "Content-Type": "text/xml;charset=UTF-8",
                "SOAPAction": "nfs#CancelarNfse"
            },
            timeout: 15000
        });

        const xml = response.data;
        console.log("[SIGCORP] cancelarNfse RESPOSTA:", xml);

        // Verifica se o cancelamento foi aceito
        const hasCancelamento = /<Cancelamento>/i.test(xml) || /<ConfirmacaoCancelamento>/i.test(xml) || /<RetCancelamento>/i.test(xml);
        const hasSuccess = /<Sucesso>/i.test(xml) || hasCancelamento;

        // Verifica erros
        const matchMsg = /<Mensagem>(.*?)<\/Mensagem>/i.exec(xml);
        const matchCod = /<Codigo>(.*?)<\/Codigo>/i.exec(xml);

        if (hasSuccess || hasCancelamento) {
            return {
                success: true,
                message: "NFS-e cancelada com sucesso.",
                soapResponse: xml
            };
        }

        return {
            success: false,
            message: matchMsg?.[1] || "A prefeitura não confirmou o cancelamento. Verifique o portal.",
            codigo: matchCod?.[1] || "",
            soapResponse: xml
        };

    } catch (error: any) {
        const errorData = error.response ? error.response.data : error.message;
        console.error("NFSE_CANCEL_SOAP_ERROR", errorData);

        let msg = "Erro ao cancelar NFS-e na prefeitura.";
        if (error.response?.status === 500) {
            msg = "🏦 O servidor da Prefeitura retornou erro interno (500). Tente novamente.";
            if (typeof errorData === 'string') {
                const matchFault = /<faultstring>(.*?)<\/faultstring>/i.exec(errorData);
                if (matchFault) msg = `Erro Prefeitura: ${matchFault[1]}`;
            }
        } else if (error.code === 'ECONNABORTED') {
            msg = "⚡ Timeout ao conectar com a prefeitura.";
        }

        return {
            success: false,
            message: msg,
            error: errorData
        };
    }
}
