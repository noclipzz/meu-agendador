import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Rotas que PRECISAM de senha (Protegidas)
const isProtectedRoute = createRouteMatcher([
  '/painel(.*)',
  '/master(.*)',
  '/meus-agendamentos(.*)',
  '/novo-negocio(.*)',
  '/onboarding(.*)'
]);

export default clerkMiddleware((auth, req) => {
  const url = req.nextUrl;
  const userAgent = req.headers.get("user-agent") || "";

  // 1. BYPASS TOTAL para o robô do Facebook/Instagram
  if (userAgent.includes("facebookexternalhit") || userAgent.includes("Facebot")) {
    return NextResponse.next();
  }

  // 2. Garantir que a API de marketing seja sempre pública
  if (url.pathname.startsWith('/api/marketing')) {
    return NextResponse.next();
  }

  // LOG PARA DEBUG
  if (req.url.includes('/api/webhooks/stripe')) {
    console.log("🚦 [MIDDLEWARE] Webhook detectado:", req.url);
  }

  // Se for rota protegida, bloqueia. O resto (como /planos) passa livre.
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  // Exclui: arquivos estáticos (com .), _next, e rotas de marketing (para o crawler do Facebook)
  matcher: [
    "/((?!.*\\..*|_next|api/marketing).*)",
    "/",
    "/(api(?!/marketing)|trpc)(.*)"
  ],
};