"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("test");
  const [password, setPassword] = useState("1234");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result.error || "Login failed.");
      return;
    }

    window.location.href = result.redirectTo || "/dashboard/designer";
  };

  return (
    <form className="generate-box" onSubmit={submit}>
      <label>
        <p className="kicker">아이디</p>
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
      <p className="notice">
        데모 계정 — 디자이너: <b>test / 1234</b> · 관리자: <b>admin / 1234</b>
      </p>
    </form>
  );
}
