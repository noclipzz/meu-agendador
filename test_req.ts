import * as fs from 'fs';
import axios from 'axios';

async function run() {
    const soapNamespace = "https://testeipatingaabrasf.meumunicipio.online/ws/nfs";

    // Testing what expects InfDeclaracaoPrestacaoServico inside Rps
    const bodyXml = `<?xml version="1.0" encoding="utf-8"?>
<GerarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
    <Rps>
        <InfDeclaracaoPrestacaoServico Id="rps123">
            <Rps>
                <IdentificacaoRps>
                    <Numero>123</Numero>
                    <Serie>1</Serie>
                    <Tipo>1</Tipo>
                </IdentificacaoRps>
                <DataEmissao>2026-03-02T23:43:37</DataEmissao>
                <Status>1</Status>
            </Rps>
            <Competencia>2026-03-02</Competencia>
            <Servico>
                <Valores><ValorServicos>10.0</ValorServicos></Valores>
                <IssRetido>2</IssRetido>
                <ItemListaServico>0713</ItemListaServico>
                <CodigoTributacaoMunicipio>131307</CodigoTributacaoMunicipio>
                <Discriminacao>teste</Discriminacao>
                <CodigoMunicipio>3131307</CodigoMunicipio>
                <ExigibilidadeIss>1</ExigibilidadeIss>
                <MunicipioIncidencia>3131307</MunicipioIncidencia>
            </Servico>
            <Prestador>
                <Cnpj>15017880000186</Cnpj>
                <InscricaoMunicipal>17054400</InscricaoMunicipal>
            </Prestador>
            <Tomador>
                <IdentificacaoTomador>
                    <CpfCnpj><Cpf>09092703680</Cpf></CpfCnpj>
                </IdentificacaoTomador>
                <RazaoSocial>Teste</RazaoSocial>
            </Tomador>
            <OptanteSimplesNacional>1</OptanteSimplesNacional>
            <IncentivoFiscal>2</IncentivoFiscal>
        </InfDeclaracaoPrestacaoServico>
    </Rps>
</GerarNfseEnvio>`;

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:proc="${soapNamespace}">
    <soapenv:Header/>
    <soapenv:Body>
        <proc:GerarNfseRequest>
            <nfseCabecMsg><![CDATA[<?xml version="1.0" encoding=\"utf-8\"?><cabecalho xmlns=\"http://www.abrasf.org.br/nfse.xsd\" versao=\"2.04\"><versaoDados>2.04</versaoDados></cabecalho>]]></nfseCabecMsg>
            <nfseDadosMsg><![CDATA[${bodyXml}]]></nfseDadosMsg>
        </proc:GerarNfseRequest>
    </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post("https://testeipatinga.meumunicipio.online/abrasf/ws/nfs", soapEnvelope, {
            headers: {
                "Content-Type": "text/xml;charset=UTF-8",
                "SOAPAction": "nfs#GerarNfse"
            }
        });
        fs.writeFileSync('out3.xml', typeof response.data === 'string' ? response.data : JSON.stringify(response.data), 'utf8');
    } catch (e) {
        if (e.response) fs.writeFileSync('out3.xml', typeof e.response.data === 'string' ? e.response.data : JSON.stringify(e.response.data), 'utf8');
        else fs.writeFileSync('out3.xml', e.message, 'utf8');
    }
}

run();
