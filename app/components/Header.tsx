/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import IconButton from "@mui/material/IconButton";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuthenticatedUser } from "@/app/hooks/useAuthenticatedUser";
import { useRouter } from "next/navigation";


export function Header() {
  const userName = useAuthenticatedUser();
  const router = useRouter();

  // Logout handler
  async function handleLogout() {
    try {
      const res = await fetch("/api/logout", { method: "POST" });
      if (res.ok) {
        window.dispatchEvent(new Event("user-logout"));
        router.replace("/login");
      } else {
        alert("Déconnexion échouée.");
      }
    } catch (e) {
      alert("Erreur lors de la déconnexion.");
    }
  }

  return (
    <header
      className="header-responsive"
      style={{
        maxWidth: "1800px",
        width: "100%",
        margin: "2rem auto 1.5rem auto",
        background: "linear-gradient(180deg, #1976d2 0%, #133a8a 100%)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        borderRadius: "12px",
        padding: "1.5rem 2.5rem",
        minHeight: "64px",
        boxShadow: "0 4px 24px rgba(60, 84, 137, 0.1)",
      }}
    >
      <span
        className="header-title"
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: "2.5rem",
          fontWeight: 700,
          letterSpacing: "1px",
        }}
      >
        BB NTScout
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {userName && (
        <div
          className="header-user"
          style={{
            position: "absolute",
            right: "5.5rem",
            display: "flex",
            alignItems: "center",
            gap: 16,
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: "1rem", fontWeight: 400 }}>
            <b>{userName}</b>
          </span>
          <IconButton
            size="small"
            aria-label="Déconnexion"
            onClick={handleLogout}
            sx={{
              background: "#f5f7fa",
              color: "#1976d2",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              "&:hover": {
                background: "#e3eaf7",
                color: "#1565c0",
              },
            }}
          >
            <LogoutIcon />
          </IconButton>
        </div>
      )}
      </div>
    </header>
  );
}