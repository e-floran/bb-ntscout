/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";

export function Header() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <header
      className="header-responsive"
      style={{
        maxWidth: "1800px",
        width: "100%",
        margin: "0 auto 1.5rem auto",
        background: "linear-gradient(180deg, #1976d2 0%, #133a8a 100%)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        borderBottomLeftRadius: "12px",
        borderBottomRightRadius: "12px",
        padding: "1.5rem 2.5rem",
        minHeight: "64px",
        boxShadow: "0 4px 24px rgba(60, 84, 137, 0.1)",
      }}
    >
      <span
        className="header-title"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "2.5rem",
          fontWeight: 700,
          letterSpacing: "1px",
        }}
      >
        BB NTScout
      </span>
      <style jsx>{`
        @media (max-width: 720px) {
          .header-title {
            position: static !important;
            transform: none !important;
            left: auto !important;
            text-align: center !important;
            width: 100% !important;
            margin-bottom: 0.3rem !important;
          }
        }
      `}</style>
      {!isLoginPage && <Navigation />}
    </header>
  );
}
