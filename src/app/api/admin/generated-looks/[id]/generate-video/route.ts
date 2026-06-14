// 관리자: 승인된 AI 룩을 Veo image-to-video로 변환하는 워커를 띄우고 상태를 폴링하는 엔드포인트
import { spawn } from "node:child_process";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { getGeneratedLookById, setGeneratedLookVideo } from "@/lib/db";

// 룩 이미지에 적용할 영상 모션 디렉션 (이미지 자체는 Veo가 입력으로 받음)
const MOTION_PROMPT = process.env.VEO_PROMPT
  || "Cinematic vertical fashion film of this exact model and outfit. Subtle natural movement, flowing fabric, gentle hair motion, slow cinematic camera push-in. Editorial K-fashion lookbook, soft studio lighting, photorealistic. Keep the same person, face, and clothing. No text, no watermark.";

function startVeoWorker(input: unknown) {
  const payload = Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
  const workerPath = path.join(process.cwd(), "scripts", "veo-video-worker.mjs");
  const child = spawn(process.execPath, [workerPath, payload], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("admin");
  const { id } = await params;

  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ ok: false, error: "GEMINI_API_KEY가 설정되어 있지 않습니다." }, { status: 400 });
  }

  const look = await getGeneratedLookById(id);
  if (!look) return Response.json({ ok: false, error: "AI 룩을 찾을 수 없습니다." }, { status: 404 });
  if (look.status !== "approved") {
    return Response.json({ ok: false, error: "공개 승인된 룩만 영상으로 만들 수 있습니다." }, { status: 400 });
  }
  if (look.video_status === "queued" || look.video_status === "processing") {
    return Response.json({ ok: true, videoStatus: look.video_status, videoUrl: look.video_url });
  }

  await setGeneratedLookVideo(id, { status: "queued" });
  startVeoWorker({
    lookId: look.id,
    imageUrl: look.image_url,
    designerId: look.designer_id,
    userId: user.id,
    prompt: MOTION_PROMPT,
  });

  return Response.json({ ok: true, videoStatus: "queued" }, { status: 202 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser("admin");
  const { id } = await params;
  const look = await getGeneratedLookById(id);
  if (!look) return Response.json({ ok: false, error: "AI 룩을 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ ok: true, videoStatus: look.video_status, videoUrl: look.video_url });
}
