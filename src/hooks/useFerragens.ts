"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Ferragem } from "@/types/ferragem"

export function useFerragens(empresaId: string | null) {
  const [ferragens, setFerragens] = useState<Ferragem[]>([])
  const [loading, setLoading] = useState(false)

  async function buscar() {
    if (!empresaId) return;
    setLoading(true)
    
    const { data, error } = await supabase
      .from("ferragens")
      .select("*")
      .eq("empresa_id", empresaId) // Filtro de segurança!
      .order("nome", { ascending: true })

    if (!error && data) {
      setFerragens(data)
    }
    setLoading(false)
  }

  return { ferragens, loading, buscar }
}