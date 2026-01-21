import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <--- Essa linha é a que faz a mágica do visual!

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
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}