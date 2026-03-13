import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const companyId = searchParams.get('companyId');

    if (!slug) return NextResponse.json({ available: false });

    const RESERVED_SLUGS = [
      'painel', 'api', 'admin', 'dashboard', 'login', 'register', 'checkout',
      'master', 'trial', 'suporte', 'ajuda', 'blog', 'site', 'app', 'config',
      'auth', 'clerk', 'stripe', 'billing', 'financeiro', 'agenda', 'nohud'
    ];

    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({ available: false });
    }

    try {
        const existing = await db.company.findFirst({
            where: {
                slug: slug,
                id: { not: companyId || undefined }
            }
        });

        return NextResponse.json({ available: !existing });
    } catch (error) {
        return NextResponse.json({ available: false });
    }
}
