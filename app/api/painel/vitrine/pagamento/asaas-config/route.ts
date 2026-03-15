import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Não autorizado", { status: 401 });

    const body = await req.json();
    const { bankCode, bankAgency, bankAccount, bankAccountDigit, cnpj, name, email, phone, mobilePhone } = body;

    const company = await db.company.findFirst({
      where: { ownerId: userId }
    });

    if (!company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // 1. Atualiza dados bancários no banco local
    const dataToUpdate: any = {
      asaasBankCode: bankCode,
      asaasBankAgency: bankAgency,
      asaasBankAccount: bankAccount,
      asaasBankAccountDigit: bankAccountDigit,
    };

    // 2. Lógica Asaas (Criar ou Atualizar Subconta)
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const ASAAS_URL = process.env.ASAAS_URL || "https://www.asaas.com/api/v3";

    if (ASAAS_API_KEY && !company.asaasSubaccountId) {
      console.log("🚀 Criando subconta no Asaas para:", company.name);
      
      try {
        const asaasRes = await fetch(`${ASAAS_URL}/accounts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "access_token": ASAAS_API_KEY
          },
          body: JSON.stringify({
            name: company.name,
            email: company.notificationEmail || email,
            cpfCnpj: company.cnpj || cnpj,
            phone: company.phone || phone,
            mobilePhone: company.phone || mobilePhone || phone,
            address: company.address || "Endereço não informado",
            addressNumber: company.number || "SN",
            province: company.neighborhood || "Bairro",
            postalCode: company.cep?.replace(/\D/g, "") || "00000000"
          })
        });

        const asaasData = await asaasRes.json();

        if (asaasRes.ok) {
          dataToUpdate.asaasSubaccountId = asaasData.id;
          dataToUpdate.asaasApiKey = asaasData.apiKey; // API Key específica da subconta (opcional guardar)
          dataToUpdate.asaasWalletId = asaasData.walletId;
          
          console.log("✅ Subconta criada com sucesso:", asaasData.id);

          // Configurar conta bancária para repasse no Asaas
          await fetch(`${ASAAS_URL}/bankAccounts/mainAccount`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "access_token": asaasData.apiKey // Usamos a key da própria subconta
              },
              body: JSON.stringify({
                  bank: bankCode,
                  agency: bankAgency,
                  account: bankAccount,
                  accountDigit: bankAccountDigit,
                  bankAccountType: "CONTA_CORRENTE", // Pode ser dinâmico depois
                  name: company.name,
                  cpfCnpj: company.cnpj || cnpj
              })
          });
        } else {
          console.error("❌ Erro Asaas:", asaasData);
          // Opcional: retornar erro se falhar criação no Asaas
        }
      } catch (err) {
        console.error("❌ Erro fetch Asaas:", err);
      }
    }

    const updatedCompany = await db.company.update({
      where: { id: company.id },
      data: dataToUpdate
    });

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("ERRO_ASAAS_CONFIG:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
