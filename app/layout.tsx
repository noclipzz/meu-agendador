import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs' // <--- 1. Importar isso
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agendamento App",
  description: "Sistema de agendamento online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 2. Envolver tudo com o ClerkProvider
    <ClerkProvider>
      <html lang="pt-BR">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}