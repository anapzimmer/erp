import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Criamos uma resposta inicial
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          // Atualizamos a requisição e a resposta
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({
            request: { headers: req.headers },
          });
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          req.cookies.delete(name);
          res = NextResponse.next({
            request: { headers: req.headers },
          });
          res.cookies.delete(name);
        },
      },
    }
  );

  // Em produção, a sessão principal está no storage do cliente via supabase-js.
  // Não forçamos redirect aqui para evitar loop em ambientes como Vercel.
  // A proteção de páginas continua no client via useAuth.
  await supabase.auth.getSession();

  return res;
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};