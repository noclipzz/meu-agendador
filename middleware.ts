import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas que PRECISAM de senha
const isProtectedRoute = createRouteMatcher([
  '/painel(.*)',
  '/master(.*)',
  '/meus-agendamentos(.*)',
  '/novo-negocio(.*)' // <--- ADICIONEI AQUI
]);

export default clerkMiddleware((auth, req) => {
  // Se for rota protegida, bloqueia e manda pro login
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};