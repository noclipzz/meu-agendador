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
  isOwner: boolean;
  setIsOwner: Dispatch<SetStateAction<boolean>>;
  hasTrackingModule: boolean;
  setHasTrackingModule: Dispatch<SetStateAction<boolean>>;
  companySlug: string | null;
  setCompanySlug: Dispatch<SetStateAction<string | null>>;
}

// Cria o contexto com valores iniciais vazios
const AgendaContext = createContext<AgendaContextType>({
  refreshKey: 0,
  refreshAgenda: () => { },
  companyId: null,
  setCompanyId: () => { },
  userRole: "PROFESSIONAL",
  setUserRole: () => { },
  isOwner: false,
  setIsOwner: () => { },
  hasTrackingModule: false,
  setHasTrackingModule: () => { },
  companySlug: null,
  setCompanySlug: () => { },
});

// Um atalho para usar o contexto mais facilmente
export const useAgenda = () => useContext(AgendaContext);

// O componente "Provedor" que vai abraçar o nosso painel
export const AgendaProvider = ({ children }: { children: ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState("PROFESSIONAL");
  const [isOwner, setIsOwner] = useState(false);
  const [hasTrackingModule, setHasTrackingModule] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(null);

  // Função para "avisar" a agenda que ela precisa recarregar
  const refreshAgenda = useCallback(() => {
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  // O valor que será compartilhado com todos os componentes filhos
  const value = { refreshKey, refreshAgenda, companyId, setCompanyId, userRole, setUserRole, isOwner, setIsOwner, hasTrackingModule, setHasTrackingModule, companySlug, setCompanySlug };

  return (
    <AgendaContext.Provider value={value}>
      {children}
    </AgendaContext.Provider>
  );
};