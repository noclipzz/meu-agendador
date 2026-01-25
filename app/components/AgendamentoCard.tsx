// src/components/AgendamentoCard.tsx
import React from 'react';
import { formatarTelefone, formatarHorario } from '../utils/formatters';

interface AgendamentoProps {
  event: {
    start: Date | string; // Data de inicio
    clientName?: string;  // Nome do cliente
    clientPhone?: string; // Telefone
    serviceName?: string; // Nome do serviço
    professionalName?: string; // Profissional
    title?: string; // Caso o nome venha aqui
  }
}

export const AgendamentoCard = ({ event }: AgendamentoProps) => {
  // 1. Organiza os dados (se algum faltar, coloca um texto padrão)
  const hora = formatarHorario(event.start);
  const nome = event.clientName || event.title || "Cliente";
  const telefone = formatarTelefone(event.clientPhone);
  const servico = event.serviceName || "Serviço";
  const pro = event.professionalName || "Profissional";

  // 2. Monta o texto padrão: 13:00 - João - (11) 99999-9999 - Corte - Barbeiro 1
  const textoCompleto = `${hora} - ${nome} - ${telefone} - ${servico} - ${pro}`;

  return (
    <div 
      className="w-full h-full px-1 py-0.5 text-xs text-white flex items-center overflow-hidden"
      title={textoCompleto} // Ao passar o mouse, mostra tudo
    >
      {/* 'truncate' corta o texto com "..." se for muito grande */}
      <span className="truncate font-semibold leading-none">
        {textoCompleto}
      </span>
    </div>
  );
};