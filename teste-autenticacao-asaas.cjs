process.loadEnvFile(".env.local");

async function testar() {
  const resposta = await fetch(
    "https://api-sandbox.asaas.com/v3/myAccount",
    {
      headers: {
        access_token: process.env.ASAAS_API_KEY,
        "User-Agent": "GlassCode/1.0",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  console.log("HTTP:", resposta.status);

  if (resposta.ok) {
    console.log("Autenticação aceita pelo Asaas Sandbox.");
  } else {
    const dados = await resposta.json().catch(() => ({}));

    console.log(
      "Erros:",
      JSON.stringify(dados.errors ?? [], null, 2)
    );
  }
}

testar().catch((erro) => {
  console.error("Falha:", erro.message);
});
