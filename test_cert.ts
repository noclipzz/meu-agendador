import * as forge from 'node-forge';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst({ where: { cnpj: { not: null } } });
    if (!company || !company.certificadoA1Url || !company.certificadoSenha) {
        console.log("Nenhuma empresa com certificado encontrada");
        return;
    }

    const certResponse = await axios.get(company.certificadoA1Url, { responseType: 'arraybuffer' });
    const pfxBuffer = Buffer.from(certResponse.data);
    const p12Der = pfxBuffer.toString('binary');
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, (company.certificadoSenha || "").trim());

    let certCount = 0;
    for (const safeContents of p12.safeContents) {
        for (const safeBag of safeContents.safeBags) {
            if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
                certCount++;
                const cert = safeBag.cert;
                console.log(`\n=== Certificado #${certCount} ===`);
                console.log("Subject CN:", cert.subject.getField('CN')?.value);
                console.log("Issuer CN:", cert.issuer.getField('CN')?.value);
                console.log("Serial:", cert.serialNumber);
                console.log("Not Before:", cert.validity.notBefore);
                console.log("Not After:", cert.validity.notAfter);
                console.log("Is CA:", cert.getExtension('basicConstraints')?.cA || false);
            }
            if (safeBag.type === forge.pki.oids.keyBag || safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
                console.log("\n=== Chave Privada encontrada ===");
            }
        }
    }
    console.log(`\nTotal certificados no PFX: ${certCount}`);
}

main().then(() => process.exit(0));
