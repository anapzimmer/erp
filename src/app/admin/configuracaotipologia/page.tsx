"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ConfiguracaoTipologia() {
    const [tipologias, setTipologias] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [dadosConfig, setDadosConfig] = useState<any>(null);

    // Carrega a lista de modelos cadastrados
    useEffect(() => {
        const fetchTipologias = async () => {
            const { data } = await supabase.from("tipologias").select("id, nome");
            if (data) setTipologias(data);
        };
        fetchTipologias();
    }, []);

    // Quando seleciona um modelo, busca todas as fórmulas relacionadas
    const handleSelectTipologia = async (id: string) => {
        setSelectedId(id);
        const { data } = await supabase
            .from("tipologias")
            .select(`
                *,
                tipologias_vidros(*),
                tipologias_perfis(*),
                tipologias_ferragens(*)
            `)
            .eq("id", id)
            .single();
        
        setDadosConfig(data);
    };

    return (
        <main className="p-8">
            <h1 className="text-2xl font-black mb-6">Configuração de Tipologias</h1>
            
            <select 
                className="w-full p-3 mb-6 border rounded-2xl"
                onChange={(e) => handleSelectTipologia(e.target.value)}
            >
                <option value="">Selecione um modelo para editar...</option>
                {tipologias.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>

            {dadosConfig && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Aqui virá a edição das fórmulas */}
                    <div className="bg-white p-6 rounded-3xl border">
                        <h2 className="font-bold mb-4">Fórmulas de Corte</h2>
                        {/* Mapear tipologias_vidros e campos de input aqui */}
                    </div>

                    {/* Aqui virá o simulador */}
                    <div className="bg-gray-50 p-6 rounded-3xl border">
                        <h2 className="font-bold mb-4">Simulador de Medidas</h2>
                        {/* Inputs L e A para testar se a fórmula está correta */}
                    </div>
                </div>
            )}
        </main>
    );
}