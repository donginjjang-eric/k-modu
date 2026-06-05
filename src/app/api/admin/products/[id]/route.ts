import { requireUser } from "@/lib/auth";
import { updateProductForAdmin } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = ["draft", "active", "hidden"].includes(body.status) ? body.status : undefined;

  if (!status) {
    return Response.json({ ok: false, error: "Valid status is required." }, { status: 400 });
  }

  const product = await updateProductForAdmin(id, { status });
  if (!product) return Response.json({ ok: false, error: "Product not found." }, { status: 404 });
  return Response.json({ ok: true, product });
}
