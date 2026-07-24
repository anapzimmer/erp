import { NextRequest, NextResponse } from "next/server";

const somenteNumeros = (valor = "") => valor.replace(/\D/g, "");

function validarCnpj(cnpj: string) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const calcularDigito = (base: string, pesos: number[]) => {
    const soma = base
      .split("")
      .reduce(
        (total, numero, indice) =>
          total + Number(numero) * pesos[indice],
        0
      );

    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiroDigito = calcularDigito(
    cnpj.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  const segundoDigito = calcularDigito(
    cnpj.slice(0, 12) + primeiroDigito,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  return cnpj.endsWith(`${primeiroDigito}${segundoDigito}`);
}

function texto(valor: unknown) {
  return valor == null ? "" : String(valor).trim();
}

function normalizarData(valor: unknown) {
  const data = texto(valor);

  if (!data) return "";

  const formatoBrasileiro = data.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (formatoBrasileiro) {
    return `${formatoBrasileiro[3]}-${formatoBrasileiro[2]}-${formatoBrasileiro[1]}`;
  }

  const formatoIso = data.match(/^\d{4}-\d{2}-\d{2}/);
  return formatoIso ? formatoIso[0] : "";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ cnpj: string }> }
) {
  try {
    const { cnpj: parametro } = await context.params;
    const cnpj = somenteNumeros(parametro);

    if (!validarCnpj(cnpj)) {
      return NextResponse.json(
        { message: "CNPJ inválido." },
        { status: 400 }
      );
    }

    const resposta = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "GlassCode/1.0",
        },
        cache: "no-store",
      }
    );

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      return NextResponse.json(
        {
          message:
            dados?.message ||
            dados?.mensagem ||
            "Não foi possível localizar este CNPJ.",
        },
        { status: resposta.status }
      );
    }

    const telefone =
      dados?.ddd_telefone_1 ||
      dados?.ddd_telefone_2 ||
      dados?.telefone ||
      "";

    const codigoCnae = texto(dados?.cnae_fiscal);
    const descricaoCnae = texto(dados?.cnae_fiscal_descricao);

    return NextResponse.json({
      data: {
        cnpj: somenteNumeros(texto(dados?.cnpj || cnpj)),
        razaoSocial: texto(dados?.razao_social),
        nomeFantasia: texto(dados?.nome_fantasia),
        situacaoCadastral: texto(
          dados?.descricao_situacao_cadastral
        ),
        telefone: texto(telefone),
        email: texto(dados?.email),
        cep: somenteNumeros(texto(dados?.cep)),
        logradouro: texto(dados?.logradouro),
        numero: texto(dados?.numero),
        complemento: texto(dados?.complemento),
        bairro: texto(dados?.bairro),
        cidade: texto(dados?.municipio),
        estado: texto(dados?.uf).toUpperCase(),
        cnaePrincipal: [codigoCnae, descricaoCnae]
          .filter(Boolean)
          .join(" - "),
        porte: texto(dados?.porte),
        dataAbertura: normalizarData(
          dados?.data_inicio_atividade
        ),
      },
    });
  } catch (error) {
    console.error("Erro na consulta do CNPJ:", error);

    return NextResponse.json(
      {
        message:
          "Não foi possível consultar o CNPJ agora. Você ainda pode preencher os dados manualmente.",
      },
      { status: 500 }
    );
  }
}