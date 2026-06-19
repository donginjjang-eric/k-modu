// 디자이너: 자신의 AI 룩을 Veo로 숏폼 영상화하는 워커를 띄우고 상태를 폴링하는 엔드포인트 (1일 한도 제한)
import { spawn } from "node:child_process";
import path from "node:path";
import { getApprovedDesignerForApi } from "@/lib/auth";
import {
  getGeneratedLookById,
  setGeneratedLookVideo,
  countDailyVeoForDesigner,
  countDailyVeoAll,
} from "@/lib/db";

// 룩 이미지에 적용할 모션 프리셋 — 착장을 최대한 보여주도록 걷는 동작 위주로 튜닝
const MOTION_PRESETS: Record<string, string> = {
  runway:
    "Cinematic vertical fashion film. The same model walks confidently toward the camera like on a runway, full body in frame, smooth catwalk stride, the outfit's fabric and silhouette moving naturally with each step to clearly show off the clothing details. Editorial K-fashion lookbook, slow cinematic dolly, soft studio lighting, photorealistic. Keep the exact same person, face, hair and outfit. No text, no watermark, no logo.",
  street:
    "Cinematic vertical fashion film. The same model walks naturally down a stylish city street, full body in frame, relaxed confident street-style stride, the outfit moving with the body to showcase the clothing from a candid angle. Editorial street fashion mood, soft natural daylight, gentle handheld camera follow, photorealistic. Keep the exact same person, face, hair and outfit. No text, no watermark, no logo.",
};
const DEFAULT_STYLE = "runway";
const resolveMotionPrompt = (style: unknown) =>
  (typeof style === "string" && MOTION_PRESETS[style]) || MOTION_PRESETS[DEFAULT_STYLE];

// 비용 안전망: 디자이너 1인당 1일 한도 + 전역 1일 한도 (둘 다 env로 조정 가능)
const DAILY_LIMIT = Number(process.env.VEO_DAILY_LIMIT_PER_DESIGNER || 4);
const GLOBAL_DAILY_LIMIT = Number(process.env.VEO_GLOBAL_DAILY_LIMIT || 50);

function startVeoWorker(input: unknown) {
  const payload = Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
  const workerPath = path.join(process.cwd(), "scripts", "veo-video-worker.mjs");
  const child = spawn(process.execPath, [workerPath, payload], {
    cwd: process.cwd(),
    detached: true,
    // 워커의 stdout/stderr를 Railway 로그로 흘려보내 실패 원인을 확인할 수 있게 한다.
    stdio: ["ignore", "inherit", "inherit"],
    env: process.env,
  });
  child.unref();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { user, designer } = auth;
  const { id } = await params;

  // 모션 스타일(모델 워킹 / 스트리트 워킹) 선택값 — body 없으면 기본값
  const body = await request.json().catch(() => ({}));
  const motionPrompt = resolveMotionPrompt((body as { style?: string }).style);

  if (!process.env.FAL_KEY && !process.env.GEMINI_API_KEY) {
    return Response.json({ ok: false, error: "영상 생성이 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요." }, { status: 400 });
  }

  const look = await getGeneratedLookById(id);
  if (!look) return Response.json({ ok: false, error: "AI 룩을 찾을 수 없습니다." }, { status: 404 });
  if (look.designer_id !== designer.id) {
    return Response.json({ ok: false, error: "내 룩만 영상으로 만들 수 있어요." }, { status: 403 });
  }

  // 이미 진행 중이거나 완료된 룩은 중복 생성하지 않고 현재 상태만 돌려준다.
  if (look.video_status === "queued" || look.video_status === "processing") {
    return Response.json({ ok: true, videoStatus: look.video_status, videoUrl: look.video_url });
  }
  if (look.video_status === "completed" && look.video_url) {
    return Response.json({ ok: true, videoStatus: "completed", videoUrl: look.video_url });
  }

  const usedToday = await countDailyVeoForDesigner(designer.id);
  if (usedToday >= DAILY_LIMIT) {
    return Response.json(
      { ok: false, limited: true, error: `숏폼 영상은 하루 ${DAILY_LIMIT}개까지 만들 수 있어요. 내일 다시 시도해주세요.` },
      { status: 429 },
    );
  }
  if ((await countDailyVeoAll()) >= GLOBAL_DAILY_LIMIT) {
    return Response.json(
      { ok: false, limited: true, error: "오늘은 전체 영상 생성량이 많아 잠시 제한됐어요. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  await setGeneratedLookVideo(id, { status: "queued" });
  startVeoWorker({
    lookId: look.id,
    imageUrl: look.image_url,
    designerId: designer.id,
    userId: user.id,
    prompt: motionPrompt,
  });

  return Response.json(
    { ok: true, videoStatus: "queued", remaining: Math.max(0, DAILY_LIMIT - usedToday - 1) },
    { status: 202 },
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  const { id } = await params;
  const look = await getGeneratedLookById(id);
  if (!look) return Response.json({ ok: false, error: "AI 룩을 찾을 수 없습니다." }, { status: 404 });
  if (look.designer_id !== auth.designer.id) {
    return Response.json({ ok: false, error: "내 룩만 확인할 수 있어요." }, { status: 403 });
  }
  return Response.json({ ok: true, videoStatus: look.video_status, videoUrl: look.video_url });
}
