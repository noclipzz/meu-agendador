import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isBefore, addMinutes } from "date-fns";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      clientId, 
      serviceId, 
      professionalId, 
      companyId, 
      date, 
      name, 
      phone, 
      type,     
      location  
    } = body;
    
    const startTime = new Date(date);
    const tipo = type || "CLIENTE";

    // 1. Validação comum: Bloquear agendamento no passado
    if (isBefore(startTime, new Date())) {
      return NextResponse.json({ error: "❌ Horário já passou." }, { status: 400 });
    }

    // --- LÓGICA ESPECÍFICA PARA AGENDAMENTO DE CLIENTE ---
    if (tipo === "CLIENTE") {
        if (!serviceId || !professionalId) {
            return NextResponse.json({ error: "Serviço e Profissional são obrigatórios para agendamentos." }, { status: 400 });
        }

        // Busca a duração do serviço
        const service = await prisma.service.findUnique({
            where: { id: serviceId }
        });

        if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
        
        const durationInMinutes = Number(service.duration) || 30;
        const endTime = addMinutes(startTime, durationInMinutes);

        // VERIFICAÇÃO DE CONFLITO (Apenas para Clientes com Profissional)
        const agendamentosDoDia = await prisma.booking.findMany({
            where: {
                professionalId: professionalId,
                companyId: companyId,
                type: "CLIENTE",
                date: {
                    gte: new Date(new Date(startTime).setHours(0,0,0,0)),
                    lte: new Date(new Date(startTime).setHours(23,59,59,999))
                }
            },
            include: { service: true }
        });

        const temConflito = agendamentosDoDia.some(ag => {
            const agExistenteInicio = new Date(ag.date);
            const agExistenteFim = addMinutes(agExistenteInicio, Number(ag.service?.duration || 30));
            // Verifica sobreposição
            return (startTime < agExistenteFim && endTime > agExistenteInicio);
        });

        if (temConflito) {
            return NextResponse.json({ 
                error: "⚠️ Este profissional já tem um agendamento neste horário." 
            }, { status: 409 });
        }
    }

    // 2. Cria o registro no banco
    // Usamos 'null' explicitamente para campos que não existem em 'EVENTO'
    const newBooking = await prisma.booking.create({
      data: {
        date: startTime,
        customerName: name,
        customerPhone: phone || null,
        type: tipo,
        location: location || null,
        // Se for EVENTO, esses campos ficam nulos no banco
        serviceId: tipo === "CLIENTE" ? serviceId : null,
        professionalId: tipo === "CLIENTE" ? professionalId : null,
        companyId: companyId,
        clientId: tipo === "CLIENTE" ? (clientId || null) : null
      }
    });

    return NextResponse.json(newBooking);
  } catch (error) {
    console.error("ERRO_AGENDAR:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao salvar." }, { status: 500 });
  }
}