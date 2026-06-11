"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <form className="generate-box" onSubmit={submit}>
      <label>
        <p className="kicker">ID / Email</p>
        <input
          style={{ width: "100%", minHeight: 48, padding: 12 }}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          placeholder="파트너 계정 이메일"
          required
        />
      </label>
      <label>
        <p className="kicker">Password</p>
        <input
          style={{ width: "100%", minHeight: 48, padding: 12 }}
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
      {message ? <p className="notice">{message}</p> : null}
      <p className="notice">승인된 파트너 계정으로만 로그인할 수 있습니다.</p>
    </form>
  );
}
