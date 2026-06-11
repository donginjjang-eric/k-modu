import { getApprovedDesignerForApi } from "@/lib/auth";
import { readImageFormFile, saveStorageImage } from "@/lib/storage";

export async function POST(request: Request) {
  const auth = await getApprovedDesignerForApi();
  if (!auth.ok) return Response.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const { bytes, mimeType } = await readImageFormFile(request, "image");
    const saved = await saveStorageImage("portfolioUploads", bytes, mimeType);
    return Response.json({
      ok: true,
      imageUrl: saved.url,
      imageHash: saved.imageHash,
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to upload image.",
    }, { status: 400 });
  }
}
