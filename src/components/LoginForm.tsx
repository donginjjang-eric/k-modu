"use client";

// 파트너 로그인: 구글 로그인이 기본. 로그인된 상태면 상태 카드(누구로 로그인됨 + 다음 행동)를 보여준다.
import { useEffect, useState } from "react";

const PARAM_MESSAGES: Record<string, string> = {
  approval_required: "승인된 디자이너 계정만 사용할 수 있어요. 승인 완료 후 다시 로그인해주세요.",
  approval_pending: "디자이너 신청이 접수되어 있어요. 관리자 승인이 끝나면 같은 구글 계정으로 바로 이용할 수 있어요.",
  apply_required: "이 구글 계정으로 접수된 디자이너 신청이 없어요. 디자이너 등록 신청을 먼저 완료해주세요.",
  login_required: "디자이너 등록 신청은 구글 로그인 후 진행돼요. 로그인하면 신청 페이지로 바로 이동해요.",
  designer_required: "디자이너 계정으로 로그인해야 이용할 수 있는 페이지예요.",
  google_failed: "구글 로그인에 실패했어요. 잠시 후 다시 시도해주세요.",
  google_not_configured: "구글 로그인이 아직 설정되지 않았어요. 관리자에게 문의해주세요.",
};

type Me = {
  user: { id: string; email: string; role: string } | null;
  designer: { id: string; brandName: string; approvalStatus: string } | null;
};

export default function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(!googleEnabled);
  const [me, setMe] = useState<Me>({ user: null, designer: null });
  // 깜빡임 방지: 로그인 상태 확인이 끝나기 전엔 폼/카드를 그리지 않는다.
  const [checked, setChecked] = useState(false);
  // 로그인 후 복귀할 사이트 내 경로 (예: /apply에서 유도된 경우)
  const [nextPath, setNextPath] = useState("");
  // 관리자 페이지 접근이 차단되어 온 경우: 계정 전환 안내를 최우선으로 보여준다.
  const [adminRequired, setAdminRequired] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("notice") || params.get("error") || "";
    if (PARAM_MESSAGES[key]) setMessage(PARAM_MESSAGES[key]);
    if (params.get("error") === "admin_required") setAdminRequired(true);
    const next = params.get("next") || "";
    if (next.startsWith("/") && !next.startsWith("//")) setNextPath(next);

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) setMe({ user: data.user, designer: data.designer || null });
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const result = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok || !result.ok) {
      setMessage(result.error || "로그인에 실패했습니다.");
      return;
    }

    window.location.href = result.redirectTo || "/";
  };

  if (!checked) {
    return (
      <div className="generate-box login-form-card">
        <p className="login-google-hint">로그인 상태를 확인하는 중…</p>
      </div>
    );
  }

  // 이미 로그인된 상태: 로그인 폼 대신 상태 카드
  if (me.user) {
    const isAdmin = me.user.role === "admin";
    const isApproved = me.designer?.approvalStatus === "approved";
    return (
      <div className="generate-box login-form-card">
        <p className="login-status-badge">✓ 로그인됨</p>
        <p className="login-status-email">{me.user.email}</p>
        {adminRequired && !isAdmin ? (
          <>
            <p className="login-google-hint">
              이 계정에는 관리자 권한이 없어요. 관리자 콘솔은 관리자 계정(이메일/비밀번호)으로 로그인해야 해요.
            </p>
            <button className="generate-button login-status-cta" type="button" onClick={logout}>
              로그아웃하고 다른 계정으로 로그인
            </button>
          </>
        ) : isAdmin ? (
          <>
            <p className="login-google-hint">관리자 계정으로 로그인되어 있어요.</p>
            <a className="generate-button login-status-cta" href="/dashboard/admin">관리자 콘솔 열기</a>
          </>
        ) : isApproved ? (
          <>
            <p className="login-google-hint">{me.designer?.brandName || "디자이너"} 계정으로 로그인되어 있어요.</p>
            <a className="generate-button login-status-cta" href="/dashboard/designer/brand">디자이너 스튜디오 열기</a>
          </>
        ) : me.designer ? (
          <p className="login-google-hint">
            디자이너 신청이 접수되어 승인 대기 중이에요. 승인이 끝나면 이 화면에서 바로 스튜디오가 열려요.
          </p>
        ) : (
          <>
            <p className="login-google-hint">아직 디자이너 등록 신청 내역이 없어요. 신청을 완료하면 승인 후 스튜디오를 쓸 수 있어요.</p>
            <a className="generate-button login-status-cta" href="/apply">디자이너 등록 신청하기</a>
          </>
        )}
        <button className="login-email-toggle" type="button" onClick={logout}>로그아웃</button>
        {message ? <p className="notice">{message}</p> : null}
      </div>
    );
  }

  return (
    <form className="generate-box login-form-card" onSubmit={submit}>
      {googleEnabled ? (
        <>
          <a className="google-login-button" href={`/api/auth/google${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Google로 시작하기
          </a>
          <p className="login-google-hint">디자이너 등록 신청 후 승인되면, 신청서의 이메일과 같은 구글 계정으로 바로 입장할 수 있어요.</p>
        </>
      ) : null}
      {googleEnabled && !showEmailLogin ? (
        <button
          className="login-email-toggle"
          type="button"
          onClick={() => setShowEmailLogin(true)}
        >
          파트너 이메일로 로그인
        </button>
      ) : null}
      {showEmailLogin ? (
        <>
          {googleEnabled ? <p className="login-divider">파트너 이메일 로그인</p> : null}
          <label className="login-field">
            <p className="kicker">ID / Email</p>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="파트너 계정 이메일"
              required
            />
          </label>
          <label className="login-field">
            <p className="kicker">Password</p>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="비밀번호"
              required
            />
          </label>
          <button className="generate-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "확인 중..." : "로그인"}
          </button>
        </>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
      <p className="notice">승인된 파트너 계정으로만 로그인할 수 있습니다.</p>
    </form>
  );
}
