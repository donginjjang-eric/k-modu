import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { listUserWorkspaces, resolveUserWorkspace } from "@/lib/workspace-access";
import { safeWorkspaceNext, workspaceCookieName } from "@/lib/workspace-selection";

export async function POST(request: Request) {
  const isJson = (request.headers.get("content-type") || "").includes("application/json");
  const user = await getCurrentUser();
  if (!user) {
    if (isJson) return Response.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
    return new Response(null, { status: 303, headers: { Location: "/login?next=%2Fdashboard%2Fworkspaces" } });
  }

  const body = isJson
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());
  const membershipId = String(body.membershipId || "");
  const candidate = (await listUserWorkspaces(user.id)).find((item) => item.id === membershipId);
  const workspace = candidate && await resolveUserWorkspace({
    userId: user.id,
    workspaceType: candidate.workspace_type,
    membershipId,
    requireActive: true,
  });
  if (!workspace) {
    if (isJson) {
      const error = candidate ? "승인된 작업공간만 이용할 수 있습니다." : "선택할 수 없는 작업공간입니다.";
      return Response.json({ ok: false, error }, { status: 403 });
    }
    return new Response(null, { status: 303, headers: { Location: "/dashboard/workspaces?error=selection" } });
  }

  const redirectTo = safeWorkspaceNext(body.next, workspace.workspace_type);
  const cookieStore = await cookies();
  cookieStore.set(workspaceCookieName, workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // 브라우저가 접속한 공개 도메인을 그대로 사용하도록 상대 경로를 반환합니다.
  if (!isJson) return new Response(null, { status: 303, headers: { Location: redirectTo } });
  return Response.json({ ok: true, redirectTo });
}

