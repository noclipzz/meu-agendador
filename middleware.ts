import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas que PRECISAM de senha
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/meus-agendamentos(.*)'
]);

export default clerkMiddleware((auth, req) => {
  // Se for rota protegida, bloqueia. Se não for, deixa passar.
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};