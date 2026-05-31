import { hasDatabase, one } from "@/lib/db";
import { ensureStorage, getStorageRoot } from "@/lib/storage";

export async function GET() {
  ensureStorage();

  if (!hasDatabase()) {
    return Response.json({
      ok: true,
      database: "not-configured",
      storage: {
        productUploads: getStorageRoot("productUploads"),
        generatedLooks: getStorageRoot("generatedLooks"),
        modelTemplates: getStorageRoot("modelTemplates"),
      },
    });
  }

  try {
    const ping = await one<{ ok: number }>("SELECT 1 AS ok");
    return Response.json({
      ok: true,
      database: ping?.ok === 1 ? "connected" : "unknown",
      storage: {
        productUploads: getStorageRoot("productUploads"),
        generatedLooks: getStorageRoot("generatedLooks"),
        modelTemplates: getStorageRoot("modelTemplates"),
      },
    });
  } catch (error) {
    return Response.json({
      ok: false,
      database: "error",
      error: error instanceof Error ? error.message : "Unknown database error",
    }, { status: 500 });
  }
}
