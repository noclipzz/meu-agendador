import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        hasSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        secretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10),
        env: process.env.NODE_ENV
    });
}
