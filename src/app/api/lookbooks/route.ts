// 디자이너 룩북 목록 조회·생성 API (본인 소유만, 승인 디자이너 전용)
import { getApprovedDesignerForApi } from "@/lib/auth";
import { createLookbookForDesigner, getLookbooksForDesigner } from "@/lib/db";
import { sanitizeLookbookItems } from "@/lib/lookbooks";

export async function GET() {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const lookbooks = await getLookbooksForDesigner(auth.designer.id);
  return Response.json({ ok: true, lookbooks });
}

export async function POST(request: Request) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim().slice(0, 60);
  const tagline = String(body.tagline || "").trim().slice(0, 120);
  const items = sanitizeLookbookItems(body.items);

  if (!title) return Response.json({ ok: false, error: "룩북 제목을 입력해주세요." }, { status: 400 });
  if (!items) return Response.json({ ok: false, error: "이미지를 1장 이상(최대 40장) 선택해주세요." }, { status: 400 });

  try {
    const lookbook = await createLookbookForDesigner({ designerId: auth.designer.id, title, tagline, items });
    if (!lookbook) throw new Error("룩북을 저장하지 못했어요.");
    return Response.json({ ok: true, lookbook });
  } catch (error) {
    console.error("[lookbooks] create failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "룩북 저장 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
