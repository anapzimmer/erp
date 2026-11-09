export const prefixoNumeroOrcamento = (data = new Date()) => {
  const dia = data.getDate().toString().padStart(2, "0");
  const mes = (data.getMonth() + 1).toString().padStart(2, "0");
  return `OR${dia}${mes}`;
};

type ClienteNumeracao = { rpc: (nome: string) => PromiseLike<{data: unknown; error: {code?: string; message?: string} | null}> };
export async function gerarNumeroOrcamentoPadrao(supabase: ClienteNumeracao) {
  const {data,error}=await supabase.rpc("gc_reservar_numero_orcamento");
  if(error){
    if(["PGRST202","42883"].includes(error.code||"")) throw new Error("A numeração segura precisa ser atualizada no banco antes de salvar novos orçamentos.");
    throw error;
  }
  if(typeof data!=="string"||!/^OR\d{6,}$/.test(data)) throw new Error("Não foi possível reservar o número do orçamento. Tente novamente.");
  return data;
}
