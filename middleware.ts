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
  const hostname = req.headers.get("host") || "";
  const userAgent = req.headers.get("user-agent") || "";

  // 1. BYPASS TOTAL para o robô do Facebook/Instagram
  if (userAgent.includes("facebookexternalhit") || userAgent.includes("Facebot")) {
    return NextResponse.next();
  }

  // 2. Garantir que a API de marketing seja sempre pública
  if (url.pathname.startsWith('/api/marketing')) {
    return NextResponse.next();
  }

  // --- LÓGICA DE SUBDOMÍNIO ---
  const baseDomain = "nohud.com.br";
  const publicDomains = [baseDomain, `www.${baseDomain}`, "localhost:3000", "meu-agendador-kappa.vercel.app"];
  
  let slug = "";
  // No Vercel/Produção
  if (hostname.includes(baseDomain) && !publicDomains.includes(hostname)) {
    slug = hostname.split(".")[0];
  } 
  // No Localhost
  else if (hostname.includes(".localhost:3000")) {
    slug = hostname.replace(".localhost:3000", "");
  }

  const reserved = [
    "www", "app", "painel", "master", "api", "admin", "blog", "static", 
    "checkout", "login", "register", "dashboard", "suporte", "ajuda",
    "auth", "clerk", "stripe", "billing", "financeiro", "agenda", "nohud"
  ];

  if (slug && !reserved.includes(slug) && !url.pathname.startsWith('/api')) {
    // Se o usuário acessa docegraca.nohud.com.br/vitrine,
    // reescrevemos internamente para /docegraca/vitrine
    return NextResponse.rewrite(new URL(`/${slug}${url.pathname}${url.search}`, req.url));
  }
  // ---------------------------

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