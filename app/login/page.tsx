"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState("");
  const router = useRouter();

  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const currentLogin = loginRef.current?.value || "";
    const currentPassword = passwordRef.current?.value || "";

    if (!currentLogin || !currentPassword) {
      setError("Veuillez saisir votre login et mot de passe.");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: currentLogin, password: currentPassword }),
        credentials: "include",
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        window.dispatchEvent(new Event("user-login"));
        router.push("/");
      }
    } catch (err) {
      setError("Erreur réseau, veuillez réessayer.");
    }
  };

  return (
    <div className="main-container">
      <form onSubmit={handleSubmit} className="form-container">
        <h2 className="form-title">Login</h2>
        <label className="form-label">Login</label>
        <input
          id="login"
          ref={loginRef}
          className="form-input"
          type="text"
          defaultValue=""
          required
          autoFocus
          autoComplete="username"
        />
        <label className="form-label">Password</label>
        <input
        id="password"
          ref={passwordRef}
          className="form-input"
          type="password"
          defaultValue=""
          required
          autoComplete="current-password"
        />
        {error && <div className="form-error">{error}</div>}
        <button className="form-submit" type="submit">
          Submit
        </button>
      </form>
    </div>
  );
}
