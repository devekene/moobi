import { probeWebsite } from "@/lib/browser-probe";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  if (!target) return Response.json({ status: "unknown" }, { status: 400 });
  try {
    const status = await probeWebsite(target, url, AbortSignal.timeout(4500));
    return Response.json(
      { status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unknown" });
  }
}
