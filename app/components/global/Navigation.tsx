"use client";

import Link from "next/link";
import IconButton from "@mui/material/IconButton";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import BarChartIcon from "@mui/icons-material/BarChart";
import SearchIcon from "@mui/icons-material/Search";
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
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <li>
          <Link href="/">
            <IconButton
              aria-label="Accueil"
              sx={{
                color: "#fff",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              <HomeIcon />
            </IconButton>
          </Link>
        </li>
        <li>
          <Link href="/analyze">
            <IconButton
              aria-label="Analyse"
              sx={{
                color: "#fff",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              <BarChartIcon />
            </IconButton>
          </Link>
        </li>
        <li>
          <Link href="/scouting">
            <IconButton
              aria-label="Scouting"
              sx={{
                color: "#fff",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              <SearchIcon />
            </IconButton>
          </Link>
        </li>
      </ul>
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
    </nav>
  );
}
