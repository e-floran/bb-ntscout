"use client";

import Link from "next/link";
import IconButton from "@mui/material/IconButton";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeIcon from "@mui/icons-material/Home";
import BarChartIcon from "@mui/icons-material/BarChart";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavigationProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface UserProfile {
  role: string;
}

export function Navigation({ isOpen, onToggle }: NavigationProps) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user profile to get role
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const userProfile: UserProfile = await response.json();
          setUserRole(userProfile.role);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onToggle();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onToggle]);

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

  // Check if user can access analyze page
  const canAccessAnalyze =
    userRole && ["Admin", "Coach", "Staff"].includes(userRole);

  // Check if user can access scouting page
  const canAccessScouting =
    userRole && ["Admin", "Coach", "Staff", "Scout"].includes(userRole);

  return (
    <>
      {/* Fixed Burger/Close Button */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          right: "0px",
          transform: "translateY(-50%)",
          zIndex: 1001,
        }}
      >
        <IconButton
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={onToggle}
          sx={{
            color: "#1976d2",
            backgroundColor: "transparent",
            width: "50px",
            height: "50px",
            "&:hover": {
              backgroundColor: "rgba(25, 118, 210, 0.1)",
            },
          }}
        >
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      </div>

      {/* Navigation Menu */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: "calc(50% + 30px)",
            right: "0px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "0",
            zIndex: 1000,
            backdropFilter: "blur(10px)",
          }}
        >
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            {/* Home button - always visible for authenticated users */}
            <li>
              <Link href="/" onClick={onToggle}>
                <IconButton
                  aria-label="Accueil"
                  sx={{
                    color: "#1976d2",
                    backgroundColor: "transparent",
                    width: "50px",
                    height: "50px",
                    "&:hover": {
                      backgroundColor: "rgba(25, 118, 210, 0.1)",
                    },
                  }}
                >
                  <HomeIcon />
                </IconButton>
              </Link>
            </li>

            {/* Analyze button - only for Admin, Coach, Staff */}
            {canAccessAnalyze && (
              <li>
                <Link href="/analyze" onClick={onToggle}>
                  <IconButton
                    aria-label="Analyse"
                    sx={{
                      color: "#1976d2",
                      backgroundColor: "transparent",
                      width: "50px",
                      height: "50px",
                      "&:hover": {
                        backgroundColor: "rgba(25, 118, 210, 0.1)",
                      },
                    }}
                  >
                    <BarChartIcon />
                  </IconButton>
                </Link>
              </li>
            )}

            {/* Scouting button - only for Admin, Coach, Staff, Scout */}
            {canAccessScouting && (
              <li>
                <Link href="/scouting" onClick={onToggle}>
                  <IconButton
                    aria-label="Scouting"
                    sx={{
                      color: "#1976d2",
                      backgroundColor: "transparent",
                      width: "50px",
                      height: "50px",
                      "&:hover": {
                        backgroundColor: "rgba(25, 118, 210, 0.1)",
                      },
                    }}
                  >
                    <SearchIcon />
                  </IconButton>
                </Link>
              </li>
            )}

            {/* Logout button - always visible for authenticated users */}
            <li>
              <IconButton
                aria-label="Déconnexion"
                onClick={handleLogout}
                sx={{
                  color: "#1976d2",
                  backgroundColor: "transparent",
                  width: "50px",
                  height: "50px",
                  "&:hover": {
                    backgroundColor: "rgba(25, 118, 210, 0.1)",
                  },
                }}
              >
                <LogoutIcon />
              </IconButton>
            </li>
          </ul>
        </div>
      )}
    </>
  );
}
