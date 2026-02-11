# 🔧 Solução: Assinatura com Status INACTIVE e Dados NULL

## 📋 Problema Identificado

O banco de dados estava salvando registros de assinatura com:
- **stripeCustomerId**: `NULL`
- **stripeSubscriptionId**: `NULL` 
- **stripePriceId**: `NULL`
- **status**: `INACTIVE`

Isso impedia o acesso ao painel mesmo após o pagamento ser concluído no Stripe.

## 🔍 Causa Raiz

O problema ocorre quando:

1. **No checkout** (`app/api/checkout/route.ts` linha 69):
   - Um registro é criado com `stripeCustomerId` mas **status INACTIVE**
   - Os campos `stripeSubscriptionId` e `stripePriceId` ficam NULL inicialmente

2. **O webhook NÃO é chamado ou FALHA**:
   - O Stripe envia um evento de webhook `checkout.session.completed` que deveria atualizar o registro
   - Se o webhook não for chamado ou falhar, o registro nunca é atualizado para ACTIVE

## ✅ Soluções Implementadas

### 1. Rota de Sincronização Manual (`/api/sync-subscription`)

Criamos uma rota POST que:
- Busca assinaturas ativas no Stripe pelo `stripeCustomerId`
- Atualiza o banco de dados com os dados corretos
- Pode ser chamada manualmente quando o webhook falha

**Arquivo**: `app/api/sync-subscription/route.ts`

### 2. Página de Sincronização (`/sync`)

Interface amigável para o usuário sincronizar manualmente sua assinatura.

**Como usar**:
1. Acesse: `http://localhost:3000/sync`
2. Clique em "Sincronizar Agora"
3. Se o pagamento foi concluído no Stripe, a assinatura será ativada

**Arquivo**: `app/sync/page.tsx`

### 3. Toast de Notificação no Painel

Quando o usuário volta do checkout mas a assinatura ainda está inativa:
- Um toast aparece automaticamente
- Oferece um botão "Sincronizar Agora" que leva para `/sync`
- Fica visível por 10 segundos

**Arquivo**: `app/painel/layout.tsx` (linhas 136-143)

### 4. Logs Detalhados no Webhook

Adicionamos logs mais detalhados no webhook para rastrear:
- De onde vem o `userId` (sessão, subscription, customer)
- Se o `userId` foi encontrado corretamente
- Todo o processo de atualização no banco

**Arquivo**: `app/api/webhooks/stripe/route.ts`

## 🚀 Como Resolver o Problema Atual

### Para o usuário com assinatura INACTIVE:

**Opção 1: Sincronização Manual (RECOMENDADO)**
```
1. Acesse: http://localhost:3000/sync
2. Faça login
3. Clique em "Sincronizar Agora"
4. Se o pagamento foi concluído, será ativado automaticamente
```

**Opção 2: Via SQL (para admin do banco)**
```sql
-- Verificar assinaturas com problema
SELECT * FROM "Subscription" 
WHERE status = 'INACTIVE' 
AND "stripeCustomerId" IS NULL;

-- Se souber o stripeCustomerId, pode atualizar manualmente
-- MAS é melhor usar a rota de sincronização
```

## 🔍 Diagnóstico do Webhook

Para descobrir por que o webhook não está funcionando:

### 1. Verificar se o webhook está configurado no Stripe

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/test/webhooks)
2. Verifique se há um endpoint configurado
3. O endpoint deve apontar para: `https://seu-dominio.com/api/webhooks/stripe`
4. Eventos a escutar:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`

### 2. Verificar logs do webhook no Stripe

No dashboard do Stripe:
1. Vá em "Webhooks"
2. Clique no endpoint
3. Veja a seção "Logs" para ver se os eventos estão sendo enviados
4. Se houver erros, eles aparecerão ali

### 3. Testar webhook localmente

Se estiver em desenvolvimento local, use o Stripe CLI:

```bash
# Instalar Stripe CLI
# Windows (com Scoop)
scoop install stripe

# Logar no Stripe
stripe login

# Escutar webhooks e redirecionar para localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Após isso, faça um pagamento de teste e veja os logs no terminal.

## 📊 Monitoramento

### Ver logs do webhook em produção

Os logs aparecem no console do servidor. Se estiver usando Vercel:
1. Acesse o dashboard da Vercel
2. Vá em "Functions"
3. Clique na função do webhook
4. Veja os logs em tempo real

### Ver dados no banco

```sql
-- Ver todas as assinaturas
SELECT 
  "userId",
  status,
  "stripeCustomerId",
  "stripeSubscriptionId",
  plan,
  "expiresAt"
FROM "Subscription"
ORDER BY "createdAt" DESC;

-- Ver assinaturas com problema
SELECT * FROM "Subscription"
WHERE status = 'INACTIVE'
OR "stripeSubscriptionId" IS NULL;
```

## 🛠️ Prevenção Futura

### 1. Configurar webhook no Stripe corretamente

Certifique-se de que:
- O webhook está configurado para PRODUÇÃO (não apenas teste)
- A URL está correta e acessível publicamente
- O webhook secret está na variável de ambiente `STRIPE_WEBHOOK_SECRET`

### 2. Adicionar retry no checkout

O checkout já tem retry para conexão com o banco, mas podemos adicionar verificação adicional após criar a sessão.

### 3. Monitorar assinaturas INACTIVE

Criar um job que rode periodicamente (por exemplo, a cada hora) para:
1. Buscar assinaturas INACTIVE há mais de 5 minutos
2. Tentar sincronizar automaticamente com o Stripe
3. Enviar alerta se falhar

## 📝 Checklist de Verificação

Quando um usuário reportar problema de assinatura:

- [ ] Verificar se o pagamento foi concluído no Stripe
- [ ] Verificar se o webhook foi chamado (logs do Stripe)
- [ ] Verificar se há erros nos logs do servidor
- [ ] Pedir para o usuário acessar `/sync` e tentar sincronizar
- [ ] Se a sincronização falhar, verificar se o `stripeCustomerId` está correto
- [ ] Verificar se o `userId` do Clerk está correto

## 🔗 Links Úteis

- [Documentação do Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Dashboard do Stripe](https://dashboard.stripe.com/)
