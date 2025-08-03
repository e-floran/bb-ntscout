"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="main-container">
      <form onSubmit={handleSubmit} className="form-container">
        <h2 className="form-title">Login</h2>
        <label className="form-label">Login</label>
        <input
          className="form-input"
          type="text"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
          autoFocus
        />
        <label className="form-label">Password</label>
        <input
          className="form-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="form-error">{error}</div>}
        <button className="form-submit" type="submit">
          Submit
        </button>
      </form>
    </div>
  );
}
