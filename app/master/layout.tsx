"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, Crown } from "lucide-react";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", path: "/master", icon: <LayoutDashboard size={20} /> },
    { name: "Meus Clientes", path: "/master/clientes", icon: <Users size={20} /> },
    { name: "Configurações", path: "/master/config", icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR ESCURA */}
      <aside className="w-full md:w-64 bg-gray-950 border-r border-gray-800 flex flex-col z-20">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-500 flex items-center gap-2">
            <Crown size={24} /> Admin God
          </h1>
          <div className="md:hidden bg-white rounded-full"><UserButton /></div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const ativo = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium
                  ${ativo ? "bg-blue-600/20 text-blue-400 border border-blue-600/50" : "text-gray-400 hover:bg-gray-800 hover:text-white"}
                `}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 hidden md:block">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-800">
            {/* Wrapper branco para o avatar ficar visível no tema escuro */}
            <div className="bg-white rounded-full p-0.5 w-8 h-8 flex items-center justify-center overflow-hidden">
                <UserButton />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-200">Super Admin</span>
                <span className="text-[10px] text-gray-500">Acesso Total</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto h-screen">
        {children}
      </main>
    </div>
  );
}