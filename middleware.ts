import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/calculovidro") {
    const url = req.nextUrl.clone();
    url.pathname = "/calculo/calculovidro";
    return NextResponse.redirect(url);
  }

  if (req.nextUrl.pathname.startsWith("/_next") || /\.[a-z0-9]+$/i.test(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Criamos uma resposta inicial
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};