// 상품 업로드 이미지 서빙: 볼륨(레거시) → 버킷 presigned 302
import { serveStoredMedia } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  return serveStoredMedia("productUploads", segments.join("/"));
}
