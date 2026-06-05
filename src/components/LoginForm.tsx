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
        {isSubmitting ? "Checking..." : "Login"}
      </button>
      {message ? <p className="notice">{message}</p> : null}
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <button className="st-btn" type="button" disabled={isSubmitting} onClick={() => quickLogin("test")}>
          Designer test / 1234
        </button>
        <button className="st-btn" type="button" disabled={isSubmitting} onClick={() => quickLogin("admin")}>
          Admin admin / 1234
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
        <button className="st-btn" type="button" disabled={isSubmitting} onClick={() => quickLogin("test")}>
          Kakao
        </button>
        <button className="st-btn" type="button" disabled={isSubmitting} onClick={() => quickLogin("test")}>
          Naver
        </button>
        <button className="st-btn" type="button" disabled={isSubmitting} onClick={() => quickLogin("test")}>
          Google
        </button>
      </div>
      <p className="notice">
        Easy login - designer: <b>test / 1234</b> - admin: <b>admin / 1234</b>
      </p>
    </form>
  );
}
