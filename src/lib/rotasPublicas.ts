export function rotaPublica(pathname: string) {
  return ['/', '/como-funciona', '/recursos', '/planos', '/login', '/recuperar-senha', '/reset-password', '/update-password'].includes(pathname) || pathname === '/glasscode' || pathname.startsWith('/glasscode/');
}
