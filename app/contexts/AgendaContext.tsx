"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, Dispatch, SetStateAction } from 'react';

// Define a "forma" do nosso contexto para o TypeScript
interface AgendaContextType {
  refreshKey: number;
  refreshAgenda: () => void;
  companyId: string | null;
  setCompanyId: Dispatch<SetStateAction<string | null>>;
}

// Cria o contexto com valores iniciais vazios
const AgendaContext = createContext<AgendaContextType>({
  refreshKey: 0,
  refreshAgenda: () => {},
  companyId: null,
  setCompanyId: () => {},
});

// Um atalho para usar o contexto mais facilmente
export const useAgenda = () => useContext(AgendaContext);

// O componente "Provedor" que vai abraçar o nosso painel
export const AgendaProvider = ({ children }: { children: ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Função para "avisar" a agenda que ela precisa recarregar
  const refreshAgenda = useCallback(() => {
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  // O valor que será compartilhado com todos os componentes filhos
  const value = { refreshKey, refreshAgenda, companyId, setCompanyId };

  return (
    <AgendaContext.Provider value={value}>
      {children}
    </AgendaContext.Provider>
  );
};