import { requireApprovedDesigner } from "@/lib/auth";
import { readImageFormFile, saveStorageImage } from "@/lib/storage";

export async function POST(request: Request) {
  await requireApprovedDesigner();

  try {
    const { bytes, mimeType } = await readImageFormFile(request, "image");
    const saved = await saveStorageImage("productUploads", bytes, mimeType);
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
