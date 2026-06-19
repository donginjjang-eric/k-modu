// 디자이너 숏폼 제작 페이지 — 내 AI 룩을 실제 Veo로 9:16 숏폼 영상으로 만들고 모아보는 화면
import { requireApprovedDesigner } from "@/lib/auth";
import { getGeneratedLooksForDesigner, countDailyVeoForDesigner } from "@/lib/db";
import NavIcon from "@/components/NavIcons";
import ShortformStudio from "@/components/ShortformStudio";

export default async function DesignerShortPage() {
  const { designer } = await requireApprovedDesigner();
  const [looks, usedToday] = await Promise.all([
    getGeneratedLooksForDesigner(designer.id),
    countDailyVeoForDesigner(designer.id),
  ]);
  const dailyLimit = Number(process.env.VEO_DAILY_LIMIT_PER_DESIGNER || 4);
  const enabled = process.env.SHORTFORM_ENABLED === "true";

  return (
    <>
      <h1 className="st-title"><NavIcon name="video" className="st-ico" /> 숏폼 제작</h1>
      <p className="st-sub">내 AI 룩을 실제 9:16 숏폼 영상으로 만들어요.</p>
      <ShortformStudio initialLooks={looks} usedToday={usedToday} dailyLimit={dailyLimit} enabled={enabled} />
    </>
  );
}
