
import { db } from "../lib/db";

async function checkOrders() {
  try {
    console.log("--- BUSCANDO ÚLTIMOS PEDIDOS ---");
    const lastOrders = await db.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            name: true,
            slug: true,
            mercadopagoAccessToken: true
          }
        }
      }
    });

    console.log(JSON.stringify(lastOrders.map(o => ({
      id: o.id,
      customer: o.customerName,
      status: o.status,
      total: o.totalAmount,
      slug: o.company.slug,
      paymentId: o.paymentId,
      createdAt: o.createdAt,
      tokenType: o.company.mercadopagoAccessToken ? (o.company.mercadopagoAccessToken.startsWith('TEST-') ? 'SANDBOX' : 'PRODUCTION') : 'MISSING'
    })), null, 2));

    const nohud = await db.company.findUnique({
      where: { slug: 'nohud' }
    });

    if (nohud) {
      console.log("\n--- CONFIGURAÇÃO NOHUD ---");
      console.log({
        id: nohud.id,
        name: nohud.name,
        mpToken: nohud.mercadopagoAccessToken ? (nohud.mercadopagoAccessToken.startsWith('TEST-') ? 'SANDBOX' : 'PRODUCTION') : 'NÃO CONFIGURADO',
        hasToken: !!nohud.mercadopagoAccessToken
      });
    }

  } catch (error) {
    console.error("ERRO:", error);
  } finally {
    process.exit(0);
  }
}

checkOrders();
