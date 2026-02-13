import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";
import { Toaster } from "sonner"; // <--- 1. Importe


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NOHUD - Gestão Inteligente",
  description: "Software completo para gestão de agendamentos e financeira.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NOHUD",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita zoom acidental no app
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR" className="scroll-smooth">
        <body>
          {children}
          <Toaster richColors /> {/* <--- 2. Adicione aqui, antes de fechar o body */}
        </body>
      </html>
    </ClerkProvider>
  );
}