"use client";

// 파트너 로그인 폼: 구글 로그인이 기본, 이메일/비밀번호는 접힌 보조 수단(관리자용)
import { useEffect, useState } from "react";

const PARAM_MESSAGES: Record<string, string> = {
  approval_required: "승인된 디자이너 계정만 사용할 수 있어요. 승인 완료 후 다시 로그인해주세요.",
  approval_pending: "가입이 접수됐어요. 관리자 승인이 끝나면 같은 구글 계정으로 바로 이용할 수 있어요.",
  google_failed: "구글 로그인에 실패했어요. 잠시 후 다시 시도해주세요.",
  google_not_configured: "구글 로그인이 아직 설정되지 않았어요. 관리자에게 문의해주세요.",
};

export default function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(!googleEnabled);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("notice") || params.get("error") || "";
    if (PARAM_MESSAGES[key]) setMessage(PARAM_MESSAGES[key]);
  }, []);

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

  return (
    <form className="generate-box login-form-card" onSubmit={submit}>
      {googleEnabled ? (
        <>
          <a className="google-login-button" href="/api/auth/google">
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Google로 시작하기
          </a>
          <p className="login-google-hint">디자이너는 구글 계정으로 바로 시작할 수 있어요. 승인 즉시 스튜디오가 열립니다.</p>
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
