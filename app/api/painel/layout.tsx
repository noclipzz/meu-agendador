"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Calendar, Settings, Users, Home } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { name: "Agenda", path: "/admin", icon: <Calendar size={20} /> },
    { name: "Equipe", path: "/admin/profissionais", icon: <Users size={20} /> },
    { name: "Configurações", path: "/admin/config", icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r shadow-sm flex flex-col z-20">
        <div className="p-6 border-b flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Home size={20} /> Gestão
          </h1>
          <div className="md:hidden"><UserButton /></div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const ativo = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition font-medium
                  ${ativo ? "bg-blue-50 text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
                `}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t hidden md:block">
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <UserButton showName />
            <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-700">Sua Conta</span>
                <span className="text-[10px] text-gray-400">Admin</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        {children}
      </main>
    </div>
  );
}