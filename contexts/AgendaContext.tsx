"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, Dispatch, SetStateAction } from 'react';

// Define a "forma" do nosso contexto para o TypeScript
interface AgendaContextType {
  refreshKey: number;
  refreshAgenda: () => void;
  companyId: string | null;
  setCompanyId: Dispatch<SetStateAction<string | null>>;
  userRole: string;
  setUserRole: Dispatch<SetStateAction<string>>;
}

// Cria o contexto com valores iniciais vazios
const AgendaContext = createContext<AgendaContextType>({
  refreshKey: 0,
  refreshAgenda: () => { },
  companyId: null,
  setCompanyId: () => { },
  userRole: "PROFESSIONAL",
  setUserRole: () => { },
});

// Um atalho para usar o contexto mais facilmente
export const useAgenda = () => useContext(AgendaContext);

// O componente "Provedor" que vai abraçar o nosso painel
export const AgendaProvider = ({ children }: { children: ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState("PROFESSIONAL");

  // Função para "avisar" a agenda que ela precisa recarregar
  const refreshAgenda = useCallback(() => {
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  // O valor que será compartilhado com todos os componentes filhos
  const value = { refreshKey, refreshAgenda, companyId, setCompanyId, userRole, setUserRole };

  return (
    <AgendaContext.Provider value={value}>
      {children}
    </AgendaContext.Provider>
  );
};