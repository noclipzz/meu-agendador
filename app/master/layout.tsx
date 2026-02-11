"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Loader2
} from "lucide-react";

const SUPER_ADMIN_ID = "user_39S9qNrKwwgObMZffifdZyNKUKm";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      if (!user || user.id !== SUPER_ADMIN_ID) {
        router.push('/');
        return;
      }
      setLoading(false);
    }
  }, [user, isLoaded, router]);

  const menuItems = [
    { name: "Dashboard", path: "/master/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Clientes", path: "/master/clientes", icon: <Users size={20} /> },
    { name: "Assinaturas", path: "/master/assinaturas", icon: <CreditCard size={20} /> },
    { name: "Configurações", path: "/master/config", icon: <Settings size={20} /> },
  ];

  if (loading || !isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={40} />
          <p className="text-gray-400 font-bold">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 border-r border-gray-800 transition-all duration-300 flex flex-col`}>
        {/* HEADER SIDEBAR */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-black text-lg">NOHUD</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Admin Panel</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  } ${!sidebarOpen && 'justify-center'}`}
              >
                {item.icon}
                {sidebarOpen && <span className="font-bold text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* FOOTER SIDEBAR */}
        <div className="p-4 border-t border-gray-800">
          <div className={`flex items-center gap-3 p-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-black">
              {user?.firstName?.charAt(0) || "Y"}
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="font-bold text-sm">{user?.firstName || "Admin"}</p>
                <p className="text-[10px] text-gray-500">Super Admin</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => router.push('/sign-out')}
              className="w-full mt-2 flex items-center gap-2 p-3 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600/20 transition text-sm font-bold"
            >
              <LogOut size={16} />
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}