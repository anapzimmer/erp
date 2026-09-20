"use client";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
export default function ThemeSelect() {
  const { mode, setMode } = useTheme();
  return <select aria-label="Tema do sistema" className="gc-theme-select" value={mode} onChange={e => setMode(e.target.value as ThemeMode)}>
    <option value="system">Tema automático</option><option value="light">Tema claro</option><option value="dark">Tema escuro</option>
  </select>;
}
