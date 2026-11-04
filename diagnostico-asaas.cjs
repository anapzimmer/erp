const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  throw new Error("Arquivo .env.local não encontrado.");
}

process.loadEnvFile(envPath);

if (process.env.ASAAS_AMBIENTE !== "sandbox") {
  throw new Error("Consulta permitida somente no Sandbox.");
}

const apiKey = process.env.ASAAS_API_KEY;

if (!apiKey) {
  throw new Error("ASAAS_API_KEY não configurada.");
}

const assinaturaId = "sub_zipiw6gjopnb84hz";

async function consultar() {
  const url =
    "https://api-sandbox.asaas.com/v3/subscriptions/" +
    encodeURIComponent(assinaturaId) +
    "/payments?limit=100";

  const resposta = await fetch(url, {
    headers: {
      access_token: apiKey,
      "User-Agent": "GlassCode/1.0",
      accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!resposta.ok) {
    console.log("Erro HTTP:", resposta.status);
    return;
  }

  const dados = await resposta.json();

  console.log("Assinatura consultada:", assinaturaId);
  console.log("Quantidade retornada:", dados.data?.length ?? 0);
  console.log("Existem mais páginas:", dados.hasMore ?? false);

  for (const p of dados.data ?? []) {
    console.log({
      pagamentoId: p.id,
      status: p.status,
      valor: p.value,
      vencimento: p.dueDate,
      dataPagamento: p.paymentDate,
      dataConfirmacao: p.confirmedDate,
      assinatura: p.subscription,
      cliente: p.customer,
      tipo: p.billingType,
    });
  }
}

consultar().catch((erro) => {
  console.error("Falha na consulta:", erro.message);
  process.exitCode = 1;
});
