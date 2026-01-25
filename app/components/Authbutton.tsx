"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { LogIn, LayoutDashboard } from "lucide-react";

export default function AuthButton() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return (
      <Link href="/painel" className="bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition flex items-center gap-2 text-sm font-medium">
        <LayoutDashboard size={16} /> Acessar Painel
      </Link>
    );
  }

  return (
    <Link href="/sign-in" className="bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition flex items-center gap-2 text-sm font-medium">
      <LogIn size={16} /> Entrar
    </Link>
  );
}