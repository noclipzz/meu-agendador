import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { enviarMensagemWhats } from "@/lib/whatsapp";
import { addHours, subHours, startOfMinute } from "date-fns";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  // Proteção simples para apenas o serviço de cron chamar esta URL
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  try {
    const agora = new Date();
    const duasHorasDepois = addHours(agora, 2);

    // 1. Busca agendamentos que acontecem daqui a exatas 2 horas
    const agendamentos = await prisma.booking.findMany({
      where: {
        reminderSent: false,
        status: "PENDENTE",
        date: {
          gte: startOfMinute(duasHorasDepois),
          lte: addHours(startOfMinute(duasHorasDepois), 1/60) // Janela de 1 minuto
        }
      },
      include: { company: true }
    });

    for (const ag of agendamentos) {
      const msg = `Olá ${ag.customerName}! 🔔 Passando para lembrar do seu horário hoje às ${ag.date.getHours()}:${ag.date.getMinutes().toString().padStart(2,'0')}.\n\nDigite *1* para Confirmar ou *2* para Cancelar.`;
      
      await enviarMensagemWhats(ag.customerPhone!, msg);
      
      // Marca como enviado para não repetir
      await prisma.booking.update({
        where: { id: ag.id },
        data: { reminderSent: true }
      });
    }

    return NextResponse.json({ enviados: agendamentos.length });
  } catch (error) {
    return NextResponse.json({ error: "Erro no Cron" }, { status: 500 });
  }
}