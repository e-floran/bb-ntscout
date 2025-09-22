"use client";

import Link from "next/link";
import IconButton from "@mui/material/IconButton";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuthenticatedUser } from "@/app/hooks/useAuthenticatedUser";
import { useRouter } from "next/navigation";

export function Navigation() {
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
    <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          gap: "2rem",
          alignItems: "center",
        }}
      >
        <li>
          <Link
            href="/"
            style={{
              color: "#fff",
              textDecoration: "none",
              fontWeight: "500",
              fontSize: "1.1rem",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Accueil
          </Link>
        </li>
        <li>
          <Link
            href="/scouting"
            style={{
              color: "#fff",
              textDecoration: "none",
              fontWeight: "500",
              fontSize: "1.1rem",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              transition: "background-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Scouting
          </Link>
        </li>
      </ul>

      {userName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "1rem", fontWeight: 400, color: "#fff" }}>
            <b>{userName}</b>
          </span>
          <IconButton
            aria-label="Déconnexion"
            onClick={handleLogout}
            sx={{
              p: "5px",
              fontSize: "0.7rem",
              background: "#f5f7fa",
              color: "#1976d2",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              "& .MuiSvgIcon-root": {
                fontSize: "1.2rem",
              },
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
    </nav>
  );
}
