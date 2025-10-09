"use client";

import CircularProgress from "@mui/material/CircularProgress";

interface RedirectingStateProps {
  message?: string;
  reason?: string;
}

export function RedirectingState({
  message = "Redirection en cours...",
  reason = "Vous n'avez pas l'autorisation d'accéder à cette page.",
}: RedirectingStateProps) {
  return (
    <div className="main-container">
      <div
        className="form-container"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
          gap: "1rem",
        }}
      >
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            maxWidth: "500px",
            boxShadow: "0 4px 24px rgba(60, 84, 137, 0.1)",
          }}
        >
          <CircularProgress
            size={32}
            sx={{
              color: "#f59e0b",
              marginBottom: "1rem",
            }}
          />
          <h3
            style={{
              fontSize: "1.2rem",
              color: "#92400e",
              margin: "0 0 0.5rem 0",
              fontWeight: 600,
            }}
          >
            {message}
          </h3>
          <p
            style={{
              fontSize: "1rem",
              color: "#a16207",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            {reason}
          </p>
        </div>
      </div>
    </div>
  );
}
