// src/utils/formatters.ts

export const formatarTelefone = (telefone: string | null | undefined) => {
  if (!telefone) return "";

  // Remove tudo que não for número
  const apenasNumeros = telefone.replace(/\D/g, "");

  // Formato Celular: (11) 91234-5678
  if (apenasNumeros.length === 11) {
    return apenasNumeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  // Formato Fixo: (11) 1234-5678
  if (apenasNumeros.length === 10) {
    return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return telefone;
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
