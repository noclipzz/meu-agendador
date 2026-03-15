import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, companyId, paymentMethod } = body;

    if (!orderId || !companyId || !paymentMethod) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const company = await (db as any).company.findUnique({ where: { id: companyId } });
    if (!company) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const order = await (db as any).order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const ASAAS_URL = process.env.ASAAS_URL || "https://www.asaas.com/api/v3";

    if (!ASAAS_API_KEY) {
       return NextResponse.json({ error: "Asaas não configurado na plataforma" }, { status: 500 });
    }

    // Se a empresa tem uma subconta, usamos a API Key dela ou o Token do admin com o Header da subconta
    // Para simplificar: usaremos o Header 'access_token' da plataforma e, se houver subconta, o Asaas permite transacionar?
    // Na verdade, a melhor forma é usar o API Key da subconta que salvamos: asaasApiKey
    
    const apiToken = company.asaasApiKey || ASAAS_API_KEY;

    // 1. Criar/Buscar Cliente no Asaas
    const customerRes = await fetch(`${ASAAS_URL}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": apiToken },
      body: JSON.stringify({
        name: order.customerName,
        email: order.customerEmail || `pedido_${order.id}@nohud.com.br`,
        externalReference: order.id
      })
    });
    const customerData = await customerRes.json();
    const asaasCustomerId = customerData.id;

    if (!asaasCustomerId) {
       console.error("Erro ao criar cliente asaas:", customerData);
       return NextResponse.json({ error: "Erro ao registrar cliente no gateway" }, { status: 500 });
    }

    // 2. Criar Cobrança com Split (Taxa da Plataforma)
    const ASAAS_WALLET_ID = process.env.ASAAS_WALLET_ID;
    const paymentPayload: any = {
      customer: asaasCustomerId,
      billingType: paymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD',
      value: Number(order.totalAmount),
      dueDate: new Date().toISOString().split('T')[0],
      description: `Pedido #${order.id.slice(-6).toUpperCase()}`,
      externalReference: order.id,
      postalService: false
    };

    // Se tivermos a Wallet ID da Nohud, aplicamos a taxa de R$ 0,51
    if (ASAAS_WALLET_ID) {
      paymentPayload.split = [
        {
          walletId: ASAAS_WALLET_ID,
          fixedValue: 0.51
        }
      ];
    }

    const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "access_token": apiToken },
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await paymentRes.json();
    if (!paymentRes.ok) {
       return NextResponse.json({ error: paymentData.errors?.[0]?.description || "Erro ao criar cobrança" }, { status: 400 });
    }

    // 3. Se for PIX, buscar QR Code
    if (paymentMethod === 'pix') {
      const pixRes = await fetch(`${ASAAS_URL}/payments/${paymentData.id}/pixQrCode`, {
        headers: { "access_token": apiToken }
      });
      const pixData = await pixRes.json();
      
      return NextResponse.json({
        id: paymentData.id,
        status: paymentData.status,
        paymentLink: paymentData.invoiceUrl,
        pix: {
          encodedImage: pixData.encodedImage,
          payload: pixData.payload,
          expirationDate: pixData.expirationDate
        }
      });
    }

    return NextResponse.json({
      id: paymentData.id,
      status: paymentData.status,
      paymentLink: paymentData.invoiceUrl
    });

  } catch (error) {
    console.error("ERRO_ASAAS_PROCESS:", error);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}
