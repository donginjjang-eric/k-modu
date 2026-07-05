// 디자이너 룩북 수정·삭제 API (본인 소유만)
import { getApprovedDesignerForApi } from "@/lib/auth";
import { deleteLookbookForDesigner, updateLookbookForDesigner } from "@/lib/db";
import { sanitizeLookbookItems } from "@/lib/lookbooks";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 60) : undefined;
  const tagline = typeof body.tagline === "string" ? body.tagline.trim().slice(0, 120) : undefined;
  const status = body.status === "published" || body.status === "hidden" ? body.status : undefined;
  let items;
  if (body.items !== undefined) {
    items = sanitizeLookbookItems(body.items);
    if (!items) return Response.json({ ok: false, error: "이미지를 1장 이상(최대 40장) 선택해주세요." }, { status: 400 });
  }
  if (title === "") return Response.json({ ok: false, error: "룩북 제목을 입력해주세요." }, { status: 400 });

  try {
    const lookbook = await updateLookbookForDesigner(auth.designer.id, id, { title, tagline, items, status });
    if (!lookbook) return Response.json({ ok: false, error: "룩북을 찾을 수 없어요." }, { status: 404 });
    return Response.json({ ok: true, lookbook });
  } catch (error) {
    console.error("[lookbooks] update failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "룩북 수정 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { id } = await params;
  const removed = await deleteLookbookForDesigner(auth.designer.id, id);
  if (!removed) return Response.json({ ok: false, error: "룩북을 찾을 수 없어요." }, { status: 404 });
  return Response.json({ ok: true });
}
