import { NextResponse } from 'next/server';
import { postImageToInstagram } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

const POSTS_DATABASE = [
    {
        title: "Agenda Online 24/7",
        subtitle: "Deixe seus clientes agendarem enquanto você dorme.",
        feature: "Link de Bio Inteligente",
        caption: "A liberdade de ter sua agenda trabalhando por você 24 horas por dia. 🚀\n\nCom o NOHUD, o seu cliente escolhe o horário, agenda e você só recebe o aviso. Menos telefone, mais produtividade!\n\n#gestao #agendamento #produtividade #nohud"
    },
    {
        title: "WhatsApp Automático",
        subtitle: "Reduza o esquecimento e as faltas em até 80%.",
        feature: "Lembretes Inteligentes",
        caption: "Chega de perder tempo enviando mensagens manuais de confirmação. 📱\n\nO NOHUD envia automaticamente os lembretes para seus clientes via WhatsApp. Menos faltas, mais faturamento!\n\n#marketing #whatsapp #vendas #gestaoempresarial"
    },
    {
        title: "Financeiro na Mão",
        subtitle: "Saiba exatamente quanto você lucrou no final do dia.",
        feature: "Fluxo de Caixa Real-time",
        caption: "Você sabe para onde está indo o dinheiro da sua empresa? 💸\n\nCom nosso dashboard financeiro, você controla entradas, saídas e comissões com um clique. Controle total do seu lucro!\n\n#financas #empreendedorismo #barbearia #estetica"
    }
];

export async function GET(req: Request) {
    // 1. Verificar Segurança (Vercel Cron Secret)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // 2. Escolher um post aleatório
        const post = POSTS_DATABASE[Math.floor(Math.random() * POSTS_DATABASE.length)];

        // 3. Montar a URL da imagem (deve ser a URL PÚBLICA do seu deploy)
        const baseUrl = 'https://nohud.com.br'; // Use o domínio oficial
        const imageUrl = `${baseUrl}/api/marketing/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.subtitle)}&feature=${encodeURIComponent(post.feature)}`;

        // 4. Disparar a postagem
        const result = await postImageToInstagram({
            imageUrl,
            caption: post.caption
        });

        if (result.success) {
            return NextResponse.json({ message: "Post diário enviado com sucesso!", postId: result.postId });
        } else {
            return NextResponse.json({ error: "Falha ao enviar post", details: result.error }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: "Erro interno no Cron", details: error.message }, { status: 500 });
    }
}
