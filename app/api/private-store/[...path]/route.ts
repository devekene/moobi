import type { NextRequest } from "next/server";
import { handlePrivateStore } from "@/lib/server/private-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, context: Context) {
  return handlePrivateStore(request, (await context.params).path);
}
export async function POST(request: NextRequest, context: Context) {
  return handlePrivateStore(request, (await context.params).path);
}
