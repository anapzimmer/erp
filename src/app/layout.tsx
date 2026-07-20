// app/layout.tsx
import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
// 🔥 Importe o novo componente
import ThemeLoader from "@/components/ThemeLoader";
import SecurityProvider from "@/components/SecurityProvider";
import ProjetoAssistenteGlobal from "@/components/ProjetoAssistenteGlobal";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nome do seu ERP",
  description: "Sistema de Gestão",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {/* 🔥 Agora o Loader está em um componente client separado */}
          <ThemeLoader>
            <SecurityProvider>
              {children}
              <ProjetoAssistenteGlobal />
            </SecurityProvider>
          </ThemeLoader>
        </ThemeProvider>
      </body>
    </html>
  );
}

