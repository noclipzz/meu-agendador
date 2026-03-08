// src/utils/formatters.ts

export const formatarTelefone = (telefone: string | null | undefined) => {
  if (!telefone) return "";
  const raw = telefone.replace(/\D/g, "").slice(0, 11);
  if (raw.length <= 2) return raw.length > 0 ? `(${raw}` : "";
  if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
  if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
  return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
};

export const formatarHorario = (data: Date | string) => {
  const d = new Date(data);
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

export const formatarDataCompleta = (data: Date | string) => {
  const d = new Date(data);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).replace(',', ' às');
}

export const formatarDataCurta = (data: Date | string) => {
  const d = new Date(data);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).replace(',', ' às');
}


export const formatarDataApenas = (data: Date | string) => {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
}

export const formatarDiaExtenso = (data: Date | string) => {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    timeZone: 'America/Sao_Paulo'
  });
}
