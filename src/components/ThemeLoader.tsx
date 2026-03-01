// components/ThemeLoader.tsx
"use client"; // 🔥 ISSO É O MAIS IMPORTANTE

import { useTheme } from "@/context/ThemeContext";
import { ReactNode } from "react";

export default function ThemeLoader({ children }: { children: ReactNode }) {
  const { isLoading } = useTheme();

  if (isLoading) {
    return (
      <div style={{ 
        backgroundColor: '#FFFFFF', // Cor de fundo neutra
        height: '100vh', 
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#1C415B'
      }}>
        Carregando sistema...
      </div>
    );
  }

  return <>{children}</>;
}