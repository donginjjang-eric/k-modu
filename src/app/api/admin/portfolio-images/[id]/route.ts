import { requireUser } from "@/lib/auth";
import { updatePortfolioImageForAdmin } from "@/lib/db";
import type { PortfolioImageStatus } from "@/lib/types";

const STATUSES: PortfolioImageStatus[] = ["pending", "approved", "rejected", "hidden"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "") as PortfolioImageStatus;
  if (!STATUSES.includes(status)) return Response.json({ ok: false, error: "Invalid status." }, { status: 400 });

  const image = await updatePortfolioImageForAdmin(id, status);
  if (!image) return Response.json({ ok: false, error: "Portfolio image not found." }, { status: 404 });
  return Response.json({ ok: true, image });
}
