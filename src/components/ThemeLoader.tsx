//src/components/ThemeLoader.tsx
"use client";

import { useTheme } from "@/context/ThemeContext";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

type ThemeLoaderProps = {
  children?: ReactNode;
};

export default function ThemeLoader({ children }: ThemeLoaderProps) {
  const { isLoading, theme } = useTheme();
  const pathname = usePathname();
  const isRelatorioOrcamentoScreen = pathname?.startsWith("/admin/relatorio.orcamento");

  if (isLoading) {
    if (isRelatorioOrcamentoScreen) {
      return (
        <div
          className="h-screen w-screen flex flex-col items-center justify-center"
          style={{ backgroundColor: theme.contentTextDarkBg }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: theme.menuIconColor, animationDuration: "1.2s" }}
            />
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: theme.menuIconColor, animationDelay: "0.15s", animationDuration: "1.2s", opacity: 0.8 }}
            />
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: theme.menuIconColor, animationDelay: "0.3s", animationDuration: "1.2s", opacity: 0.65 }}
            />
          </div>
          <span
            className="mt-4 text-xs tracking-[0.08em]"
            style={{ color: `${theme.contentTextLightBg}AA` }}
          >
            Carregando...
          </span>
        </div>
      );
    }

    return (
      <div style={{ 
        backgroundColor: theme.contentTextDarkBg,
        height: '100vh', 
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: theme.contentTextLightBg,
        gap: '30px'
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100" height="100">
          <circle fill={theme.menuHoverColor} stroke={theme.menuHoverColor} strokeWidth="15" r="15" cx="40" cy="65">
            <animate attributeName="cy" calcMode="spline" dur="2s" values="65;135;65" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4s"></animate>
          </circle>
          <circle fill={theme.menuHoverColor} stroke={theme.menuHoverColor} strokeWidth="15" r="15" cx="100" cy="65">
            <animate attributeName="cy" calcMode="spline" dur="2s" values="65;135;65" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2s"></animate>
          </circle>
          <circle fill={theme.menuHoverColor} stroke={theme.menuHoverColor} strokeWidth="15" r="15" cx="160" cy="65">
            <animate attributeName="cy" calcMode="spline" dur="2s" values="65;135;65" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0s"></animate>
          </circle>
        </svg>
        
        <span style={{ fontSize: '14px', fontWeight: '500', letterSpacing: '0.05em' }}>
          Carregando sistema...
        </span>
      </div>
    );
  }

  return children ? <>{children}</> : null;
}