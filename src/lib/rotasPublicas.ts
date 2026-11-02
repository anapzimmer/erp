
export function rotaPublica(pathname: string) {
  return [
    "/",
    "/como-funciona",
    "/recursos",
    "/planos",
    "/fundadores",
    "/login",
    "/recuperar-senha",
    "/reset-password",
    "/update-password",
    "/contratar",
  ].includes(pathname)
    || pathname === "/glasscode"
    || pathname.startsWith("/glasscode/");
}
