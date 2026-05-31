import { resolveStoredFile, streamStoredFile } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const filePath = resolveStoredFile("generatedLooks", segments.join("/"));
  if (!filePath) return new Response("Not found", { status: 404 });
  return streamStoredFile(filePath);
}
