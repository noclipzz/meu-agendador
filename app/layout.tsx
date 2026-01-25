import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";
import { Toaster } from "sonner"; // <--- 1. Importe


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NOHUD",
  description: "Software de gestão.",
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