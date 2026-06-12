"use client";

// 세션 쿠키를 실제로 지우는 로그아웃 링크 (기존에는 로그인 페이지로 이동만 해서 세션이 남아 있었다)
export default function LogoutButton({ className }: { className?: string }) {
  const logout = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 네트워크 오류여도 이동은 진행
    }
    try {
      sessionStorage.removeItem("kmodu-auth-nav-state");
    } catch {}
    window.location.href = "/";
  };

  return (
    <a href="#" className={className} onClick={logout}>
      로그아웃
    </a>
  );
}
