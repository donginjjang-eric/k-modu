// 룩북 영어판 만들기: 제목·무드 문구·인트로·캡션을 번역해 새 영어 룩북으로 복제
import { getApprovedDesignerForApi } from "@/lib/auth";
import { createLookbookForDesigner, getLookbookForDesigner } from "@/lib/db";
import { translateLookbookContent } from "@/lib/lookbook-ai";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { id } = await params;

  const lookbook = await getLookbookForDesigner(auth.designer.id, id);
  if (!lookbook) return Response.json({ ok: false, error: "룩북을 찾을 수 없어요." }, { status: 404 });
  if (lookbook.lang === "en") {
    return Response.json({ ok: false, error: "이미 영어판 룩북이에요." }, { status: 400 });
  }

  try {
    const translated = await translateLookbookContent({
      lookbook,
      intro: lookbook.intro || auth.designer.description || "",
      brandName: auth.designer.brand_name,
    });

    const items = lookbook.items.map((item, index) => ({
      ...item,
      label: translated.labels[index] ?? item.label ?? "",
    }));

    const created = await createLookbookForDesigner({
      designerId: auth.designer.id,
      title: translated.title,
      tagline: translated.tagline,
      items,
      lang: "en",
      intro: translated.intro,
      layouts: lookbook.layouts,
    });
    if (!created) throw new Error("영어판 저장에 실패했어요.");
    return Response.json({ ok: true, lookbook: created });
  } catch (error) {
    console.error("[lookbooks] translate failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "영어판 생성에 실패했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
