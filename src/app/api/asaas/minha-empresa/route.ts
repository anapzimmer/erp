
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { erro: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return NextResponse.json(
        { erro: "Token de autenticação ausente." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { erro: "Configuração de autenticação indisponível." },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: usuario, error: erroUsuario } =
      await supabase.auth.getUser(token);

    if (erroUsuario || !usuario.user) {
      return NextResponse.json(
        { erro: "Sessão inválida ou expirada." },
        { status: 401 }
      );
    }

    const { data: empresaId, error: erroEmpresa } =
      await supabase.rpc("gc_empresa_para_contratacao");

    if (erroEmpresa || !empresaId) {
      return NextResponse.json(
        { erro: "Usuário sem autorização para contratar." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        autorizado: true,
        empresaId,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível validar a contratação." },
      { status: 500 }
    );
  }
}
