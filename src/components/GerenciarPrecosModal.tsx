"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type VidroPreco = {
  id?: string
  nome: string
  espessura: string
  preco: number
}

interface GerenciarPrecosModalProps {
  aberto: boolean
  aoFechar: () => void
  aoSalvar: (vidro: VidroPreco) => void
  vidroAtual?: VidroPreco | null
}

export default function GerenciarPrecosModal({ aberto, aoFechar, aoSalvar, vidroAtual }: GerenciarPrecosModalProps) {
  const [form, setForm] = useState<VidroPreco>(
    vidroAtual || { nome: "", espessura: "", preco: 0 }
  )

  const handleChange = (campo: keyof VidroPreco, valor: string | number) => {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  const handleSalvar = () => {
    if (!form.nome || !form.espessura || !form.preco) return
    aoSalvar(form)
    aoFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={aoFechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{vidroAtual ? "Editar Preço do Vidro" : "Adicionar Novo Vidro"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Nome do Vidro</Label>
            <Input
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder="Ex: Temperado incolor"
            />
          </div>

          <div>
            <Label>Espessura</Label>
            <Input
              value={form.espessura}
              onChange={(e) => handleChange("espessura", e.target.value)}
              placeholder="Ex: 8 mm"
            />
          </div>

          <div>
            <Label>Preço (R$)</Label>
            <Input
              type="number"
              value={form.preco}
              onChange={(e) => handleChange("preco", parseFloat(e.target.value))}
              placeholder="Ex: 120.00"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={aoFechar}>Cancelar</Button>
          <Button onClick={handleSalvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
