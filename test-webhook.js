const crypto = require('crypto');

const WEBHOOK_SECRET = 'whsec_9a4942205424ff09e241618eba9f47cf8e047d7c78951e50d79bcdb7cdacaf501';
const ENDPOINT = 'http://localhost:3000/api/webhooks/stripe';

const payload = JSON.stringify({
    id: 'evt_test',
    type: 'checkout.session.completed',
    data: {
        object: {
            id: 'cs_test',
            customer: 'cus_TxFdQq0ycS2p08',
            subscription: 'sub_test_123',
            metadata: {
                userId: 'user_38wWZCojpAenoJKGgJTrWs16QRy',
                plan: 'INDIVIDUAL'
            }
        }
    }
});

const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${payload}`;
const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

const stripeSignature = `t=${timestamp},v1=${signature}`;

console.log('Enviando webhook de teste...');

fetch(ENDPOINT, {
    method: 'POST',
    headers: {
        'Stripe-Signature': stripeSignature,
        'Content-Type': 'application/json'
    },
    body: payload
})
    .then(res => res.text())
    .then(text => console.log('Resposta:', text))
    .catch(err => console.error('Erro:', err));
