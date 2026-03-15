import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const companyId = searchParams.get("companyId");

    if (!id || !companyId) return new NextResponse("Missing ID", { status: 400 });

    const company = await (db as any).company.findUnique({ where: { id: companyId } });
    const apiToken = company?.asaasApiKey || process.env.ASAAS_API_KEY;

    if (!apiToken) return new NextResponse("No Token", { status: 500 });

    const ASAAS_URL = process.env.ASAAS_URL || "https://www.asaas.com/api/v3";
    const res = await fetch(`${ASAAS_URL}/payments/${id}`, {
      headers: { "access_token": apiToken }
    });
    
    const data = await res.json();
    return NextResponse.json({ status: data.status });

  } catch (error) {
    return NextResponse.json({ error: "Fail" }, { status: 500 });
  }
}
