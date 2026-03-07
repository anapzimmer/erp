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

  const { data: { session } } = await supabase.auth.getSession();

  const isLogin = req.nextUrl.pathname === "/login";

  // Lógica de proteção
  if (!session && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session && isLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}