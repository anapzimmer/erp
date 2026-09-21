// app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
// 🔥 Importe o novo componente
import ThemeLoader from "@/components/ThemeLoader";
import SecurityProvider from "@/components/SecurityProvider";
import ProjetoAssistenteGlobal from "@/components/ProjetoAssistenteGlobal";
import { OrcamentoProvider } from "@/context/OrcamentoContext";
import PlatformAccessGate from "@/components/PlatformAccessGate";
import { AuthProvider } from "@/context/AuthContext";

const inter = localFont({
  src: "../../public/fonts/Inter.ttf",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glass Code ERP",
  description: "Sistema de Gestão",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased"
      >
<ThemeProvider>
  <ThemeLoader>
    <SecurityProvider>
      <AuthProvider>
        <PlatformAccessGate>
          <OrcamentoProvider>{children}</OrcamentoProvider>
          <ProjetoAssistenteGlobal />
        </PlatformAccessGate>
      </AuthProvider>
    </SecurityProvider>
  </ThemeLoader>
</ThemeProvider>
      </body>
    </html>
  );
}

