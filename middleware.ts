import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas que PRECISAM de senha (Protegidas)
const isProtectedRoute = createRouteMatcher([
  '/painel(.*)',
  '/master(.*)',
  '/meus-agendamentos(.*)',
  '/novo-negocio(.*)'
]);

export default clerkMiddleware((auth, req) => {
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
  // O matcher padrão do Clerk já pega tudo, então não precisamos mexer aqui
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};