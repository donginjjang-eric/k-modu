// 룩북 AI 캡션: 시각 자산에 한국어 캡션을 자동 생성해 저장 (상품 라벨은 유지)
import { headers } from "next/headers";
import { getApprovedDesignerForApi } from "@/lib/auth";
import { getLookbookForDesigner, updateLookbookForDesigner } from "@/lib/db";
import { generateLookbookCaptions } from "@/lib/lookbook-ai";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { id } = await params;

  const lookbook = await getLookbookForDesigner(auth.designer.id, id);
  if (!lookbook) return Response.json({ ok: false, error: "룩북을 찾을 수 없어요." }, { status: 404 });

  const headerList = await headers();
  const host = headerList.get("host") || "www.k-modu.co.kr";
  const proto = headerList.get("x-forwarded-proto") || "https";

  try {
    const items = await generateLookbookCaptions({
      items: lookbook.items,
      designer: auth.designer,
      baseUrl: `${proto}://${host}`,
    });
    const updated = await updateLookbookForDesigner(auth.designer.id, id, { items });
    if (!updated) throw new Error("저장에 실패했어요.");
    return Response.json({ ok: true, lookbook: updated });
  } catch (error) {
    console.error("[lookbooks] ai-captions failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "AI 캡션 생성에 실패했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
