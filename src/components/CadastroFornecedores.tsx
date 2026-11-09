"use client";
import CadastroFornecedorCompleto from "./CadastroFornecedorCompleto";
export type Fornecedor = { id: string; nome: string; documento: string; contato: string; telefone: string; email: string; endereco: string; observacoes: string; ativo: boolean };
export default function CadastroFornecedores({ selecionar, fechar }: { empresaId: string; selecionar?: (f: Fornecedor) => void; fechar?: () => void }) {
 return <CadastroFornecedorCompleto somenteNovo={Boolean(selecionar)} onClose={fechar} onCreated={f=>selecionar?.({id:f.id,nome:f.nome,documento:f.cpf_cnpj||"",contato:"",telefone:f.telefone||"",email:f.email||"",endereco:f.logradouro||"",observacoes:f.observacoes||"",ativo:true})}/>;
}
