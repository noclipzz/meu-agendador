
import { db } from "../lib/db";
async function check() {
  const lastOrders = await db.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { company: true }
  });
  console.log(JSON.stringify(lastOrders.map(o => ({
    id: o.id,
    customer: o.customerName,
    status: o.status,
    createdAt: o.createdAt,
    paymentId: o.paymentId,
    slug: o.company.slug
  })), null, 2));
}
check();
