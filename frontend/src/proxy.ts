import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next 16 renamed "middleware" to "proxy". Gate private areas on the session cookie;
// the API still validates the token itself.
export function proxy(request: NextRequest) {
  if (request.cookies.has("cg_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/ingresar";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/cuenta/:path*", "/checkout/:path*", "/pago/:path*", "/admin/:path*", "/pedido/:path*"],
};
