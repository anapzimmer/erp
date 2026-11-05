import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ambienteAsaas, asaasRequest, categoriaErroAsaas } from "@/lib/asaas/client";
export const runtime = "nodejs";
const responder = (body: unknown, status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request: Request) {
  try {
    const token=request.headers.get("authorization");
    if (!token?.startsWith("Bearer ")) return responder({erro:"Entre na conta da proprietária."},401);
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anon || !service) return responder({erro:"Configuração indisponível."},503);
    const db=createClient(url,anon,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
    const user=await db.auth.getUser(token.slice(7));
    if (user.error || !user.data.user) return responder({erro:"Sessão inválida."},401);
    const owner=await db.rpc("gc_proprietaria");
    if (owner.error || owner.data!==true) return responder({erro:"Acesso exclusivo da proprietária."},403);
    const texto=await request.text();
    if (Buffer.byteLength(texto)>4096) return responder({erro:"Solicitação muito grande."},413);
    let dados;
    try { dados=JSON.parse(texto); } catch { return responder({erro:"Dados inválidos."},400); }
    if (!dados || typeof dados.empresa!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dados.empresa) || typeof dados.assinatura!=="string" || !/^sub_[A-Za-z0-9_]+$/.test(dados.assinatura) || !["essencial","profissional","completo"].includes(dados.plano)) return responder({erro:"Informe empresa, assinatura e plano válidos."},400);
    const assinatura=await asaasRequest<{id:string;customer:string;value:number;billingType:string;cycle:string;deleted?:boolean;status?:string}>(`/subscriptions/${encodeURIComponent(dados.assinatura)}`);
    const centavos=Math.round(assinatura.value*100);
    if (assinatura.id!==dados.assinatura || assinatura.deleted || assinatura.status!=="ACTIVE" || assinatura.cycle!=="MONTHLY" || !["BOLETO","CREDIT_CARD","PIX"].includes(assinatura.billingType) || !Number.isSafeInteger(centavos) || centavos<=0 || Math.abs(assinatura.value*100-centavos)>.001) return responder({erro:"A assinatura precisa estar ativa, ser mensal e ter valor e modalidade definidos no Asaas."},422);
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const r=await admin.rpc("gc_asaas_vincular_painel",{p_empresa:dados.empresa,p_assinatura:assinatura.id,p_cliente:assinatura.customer,p_plano:dados.plano,p_valor:centavos,p_modalidade:assinatura.billingType,p_ambiente:ambienteAsaas(),p_autor:user.data.user.id});
    if (r.error) return responder({erro:"Não foi possível vincular. Confira a migration e se a empresa já possui outro vínculo."},409);
    return responder({mensagem:"Assinatura vinculada. Novas confirmações atualizarão o acesso. Para pagamentos anteriores, reenvie o evento pelo Asaas.",ambiente:ambienteAsaas()});
  } catch(e) { console.error("ASAAS VINCULO:",categoriaErroAsaas(e)); return responder({erro:"Não foi possível conferir a assinatura no Asaas."},503); }
}
