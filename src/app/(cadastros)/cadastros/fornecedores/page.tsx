"use client";
import CadastroFornecedores from "@/components/CadastroFornecedores";
import { useAuth } from "@/hooks/useAuth";
export default function FornecedoresPage(){const {empresaId}=useAuth();return empresaId?<CadastroFornecedores key={empresaId} empresaId={empresaId}/>:null;}
