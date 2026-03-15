import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Payment } from "mercadopago";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { formData, orderId, companyId } = body;

    if (!formData || !orderId || !companyId) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // 1. Busca a empresa para pegar o Access Token
    const company = await (db as any).company.findUnique({
      where: { id: companyId }
    });

    if (!company?.mercadopagoAccessToken) {
      return NextResponse.json({ error: "Empresa não configurada" }, { status: 404 });
    }

    // 2. Busca o pedido para validar o valor
    const order = await (db as any).order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // 3. Configura o Mercado Pago
    const client = new MercadoPagoConfig({
      accessToken: company.mercadopagoAccessToken,
    });

    const payment = new Payment(client);

    // 4. Cria o pagamento no Mercado Pago
    const paymentResponse = await payment.create({
      body: {
        transaction_amount: Number(order.totalAmount),
        token: formData.token,
        description: `Pedido #${order.id.slice(-6).toUpperCase()}`,
        installments: formData.installments,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        payer: {
          email: formData.payer.email,
          identification: formData.payer.identification,
        },
        external_reference: `${company.id}__${order.id}`,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        metadata: {
            orderId: order.id,
            companyId: company.id
        }
      },
    });

    // O webhook já cuida da atualização do status, mas podemos retornar o resultado aqui para o front reagir
    return NextResponse.json({ 
        id: paymentResponse.id,
        status: paymentResponse.status,
        status_detail: paymentResponse.status_detail
    });

  } catch (error: any) {
    console.error("ERRO_PROCESS_PAYMENT:", error);
    // Erros do MP costumam vir em error.cause ou error.message
    const errorMessage = error.cause?.[0]?.description || error.message || "Erro desconhecido";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
