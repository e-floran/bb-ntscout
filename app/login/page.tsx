"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const currentLogin = loginRef.current?.value || "";
    const currentPassword = passwordRef.current?.value || "";

    if (!currentLogin || !currentPassword) {
      setError("Veuillez saisir votre login et mot de passe.");
      setLoading(false);
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
    } finally {
      setLoading(false);
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
        <Button
          className="form-submit"
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{ mt: 2, height: 50, fontWeight: 600, fontSize: "1.1rem", borderRadius: 2, textTransform: "none" }}
        >
          {loading ? (
          <CircularProgress size={22} sx={{ color: "white" }} />
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </div>
  );
}
