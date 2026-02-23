import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { ptBR } from "@clerk/localizations";
import "./globals.css";
import { Toaster } from "sonner"; // <--- 1. Importe


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NOHUD | Sistema de Agendamento Online e Gestão para Negócios",
  description: "Organize sua agenda, controle seu financeiro e reduza faltas com lembretes automáticos no WhatsApp. O software de gestão ideal para barbearias, clínicas e estúdios.",
  keywords: ["sistema de agendamento online", "software de gestão", "agenda para barbearia", "gestão financeira para clínicas", "lembretes whatsapp", "nohud"],
  authors: [{ name: "NOHUD Sistemas" }],
  openGraph: {
    title: "NOHUD | Gestão Inteligente para seu Negócio",
    description: "Transforme a gestão da sua empresa com agendamento online e controle financeiro simplificado.",
    url: "https://nohud.com.br",
    siteName: "NOHUD",
    images: [
      {
        url: "/dashboard-preview.png",
        width: 1200,
        height: 630,
        alt: "NOHUD Dashboard",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  verification: {
    google: "U8G4EU44RE5zY3Z170ws-Uioqnd1EkunibmOIdP8",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/LOGOAPP.png",
    apple: "/LOGOAPP.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NOHUD",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
    <ClerkProvider localization={ptBR as any}>
      <html lang="pt-BR" className="scroll-smooth">
        <body>
          {children}
          <Toaster richColors /> {/* <--- 2. Adicione aqui, antes de fechar o body */}
        </body>
      </html>
    </ClerkProvider>
  );
}