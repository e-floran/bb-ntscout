"use client";

import CircularProgress from "@mui/material/CircularProgress";

interface LoadingStateProps {
  message?: string;
  size?: number;
}

export function LoadingState({
  message = "Chargement...",
  size = 40,
}: LoadingStateProps) {
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
        <CircularProgress
          size={size}
          sx={{
            color: "#3b82f6",
          }}
        />
        <p
          style={{
            fontSize: "1.1rem",
            color: "#6b7280",
            margin: 0,
            fontWeight: 500,
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
