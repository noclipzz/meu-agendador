import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isBefore, addMinutes, subMinutes } from "date-fns";

const prisma = new PrismaClient();

// Função para garantir a formatação (xx) xxxxx-xxxx no banco de dados
function formatarTelefone(telefone: string | null | undefined) {
  if (!telefone) return null;
  const apenasNumeros = telefone.replace(/\D/g, "");
  
  if (apenasNumeros.length === 11) {
    return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (apenasNumeros.length === 10) {
    return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return telefone;
}

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
    const telefoneFormatado = formatarTelefone(phone);

    // 1. Validação de horário passado com margem de 5 minutos (evita erro de fuso horário)
    const agoraComMargem = subMinutes(new Date(), 5);
    if (isBefore(startTime, agoraComMargem)) {
      return NextResponse.json({ error: "❌ Este horário já passou no relógio do sistema." }, { status: 400 });
    }

    // --- LÓGICA PARA AGENDAMENTO DE CLIENTE ---
    if (tipo === "CLIENTE") {
        if (!serviceId || !professionalId) {
            return NextResponse.json({ error: "Serviço e Profissional são obrigatórios." }, { status: 400 });
        }

        const service = await prisma.service.findUnique({
            where: { id: serviceId }
        });

        if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
        
        const durationInMinutes = Number(service.duration) || 30;
        const endTime = addMinutes(startTime, durationInMinutes);

        // Verificação de conflito de horário para o profissional
        const conflito = await prisma.booking.findFirst({
            where: {
                professionalId: professionalId,
                companyId: companyId,
                type: "CLIENTE",
                date: startTime // Verifica se o profissional já começa algo nesse minuto exato
            }
        });

        if (conflito) {
            return NextResponse.json({ 
                error: "⚠️ Este profissional já tem um agendamento neste horário." 
            }, { status: 409 });
        }
    }

    // 2. Cria o registro no banco (CLIENTE ou EVENTO)
    const newBooking = await prisma.booking.create({
      data: {
        date: startTime,
        customerName: name,
        customerPhone: telefoneFormatado, // Salva formatado bonitinho
        type: tipo,
        location: location || null,
        // Campos nulos se for evento
        serviceId: tipo === "CLIENTE" ? serviceId : null,
        professionalId: tipo === "CLIENTE" ? professionalId : null,
        companyId: companyId,
        clientId: tipo === "CLIENTE" ? (clientId || null) : null,
        status: "PENDENTE"
      }
    });

    return NextResponse.json(newBooking);
  } catch (error) {
    console.error("ERRO_AGENDAR:", error);
    return NextResponse.json({ error: "Erro interno ao salvar no banco." }, { status: 500 });
  }
}