/* eslint-disable @next/next/no-img-element */
"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* <svg
        viewBox="0 0 100 100"
        height="100px"
        width="100px"
        style={{
          display: "block",
          position: "fixed",
          top: "-30px",
          right: "-30px",
          zIndex: 50,
          // transform: "rotate(-90deg)",
        }}
      >
        <path
          d="M 0 54 C 19 66 79 66 100 50"
          stroke-width="3"
          stroke-linecap="round"
          fill="none"
          stroke="#133a8a"
        />
        <path
          d="M 46 1 C 15 12 3 68 30 95"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
          stroke="#133a8a"
        />
        <path
          d="M 7 28 C 5 36 10 53 26 44 Q 64 17 86 17"
          stroke-width="2.5"
          stroke-linecap="round"
          fill="none"
          stroke="#133a8a"
        />
        <path
          d="M 10 78 C 19 62 42 97 78 89"
          stroke-width="2.5"
          stroke-linecap="round"
          fill="none"
          stroke="#133a8a"
        />
      </svg> */}
      <article style={{ height: "100px" }} />
      <header
        className="header-responsive"
        style={{
          maxWidth: "1800px",
          width: "100%",
          // margin: "0 auto 1.5rem auto",
          color: "#133a8a",
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          boxSizing: "border-box",
          borderBottomLeftRadius: "12px",
          borderBottomRightRadius: "12px",
          padding: "1.5rem 2.5rem",
          minHeight: "90px",
          boxShadow: "0 4px 24px rgba(60, 84, 137, 0.1)",
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      >
        <img
          src={"/bbf-logo.png"}
          alt="Buzzerbeater France"
          style={{
            width: "100%",
            maxWidth: "800px",
            position: "absolute",
            top: "0",
            left: "50%",
            transform: "translate(-50%, -20%)",
            objectFit: "cover",
            maxHeight: "200px",
          }}
        />
        {/* <h1
          className="header-title"
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            letterSpacing: "1px",
            margin: 0,
          }}
        >
          Buzzerbeater France
        </h1> */}

        {/* <div
          style={{
            display: "flex",
            width: "300px",
            height: "3px",
            marginTop: "8px",
          }}
        >
          <div style={{ flex: 1, backgroundColor: "#0055A4" }}></div>
          <div style={{ flex: 1, backgroundColor: "#FFFFFF" }}></div>
          <div style={{ flex: 1, backgroundColor: "#EF4135" }}></div>
        </div> */}

        <style jsx>{`
          @media (max-width: 720px) {
            .header-title {
              text-align: center !important;
              width: 100% !important;
              margin-bottom: 0.3rem !important;
            }
          }
        `}</style>
      </header>
      {!isLoginPage && <Navigation isOpen={isMenuOpen} onToggle={toggleMenu} />}
    </>
  );
}
