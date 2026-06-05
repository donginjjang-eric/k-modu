"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("test");
  const [password, setPassword] = useState("1234");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = async (nextEmail = email, nextPassword = password) => {
    setIsSubmitting(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: nextEmail, password: nextPassword }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result.error || "Login failed.");
      return;
    }

    window.location.href = result.redirectTo || "/dashboard/designer";
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await login();
  };

  const quickLogin = async (nextEmail: string) => {
    setEmail(nextEmail);
    setPassword("1234");
    await login(nextEmail, "1234");
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
        />
      </label>
      <button className="generate-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "확인 중..." : "로그인"}
      </button>
      {message ? <p className="notice">{message}</p> : null}
      <div className="login-quick-grid">
        <button className="login-quick-button" type="button" disabled={isSubmitting} onClick={() => quickLogin("test")}>
          디자이너 test / 1234
        </button>
        <button className="login-quick-button" type="button" disabled={isSubmitting} onClick={() => quickLogin("admin")}>
          관리자 admin / 1234
        </button>
      </div>
      <div className="login-social-grid">
        <button className="login-social-button" type="button" disabled={isSubmitting} onClick={() => quickLogin("test")}>
          카카오
        </button>
        <button className="login-social-button" type="button" disabled={isSubmitting} onClick={() => quickLogin("test")}>
          네이버
        </button>
        <button className="login-social-button" type="button" disabled={isSubmitting} onClick={() => quickLogin("test")}>
          구글
        </button>
      </div>
      <p className="notice">
        간편 로그인 - 디자이너: <b>test / 1234</b> - 관리자: <b>admin / 1234</b>
      </p>
    </form>
  );
}
