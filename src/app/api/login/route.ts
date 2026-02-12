import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Chamada ao Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Sucesso, retorna dados do usuário
    return NextResponse.json({
      message: "Login autorizado!",
      user: {
        id: data.user?.id,
        email: data.user?.email
      }
    });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
