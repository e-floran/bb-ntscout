"use client";

import React from "react";
import { SkeletonTable } from "./SkeletonTable";
import { SectionId } from "../page";

interface CollapsibleSectionProps {
  sectionId: SectionId;
  title: string;
  isCollapsed: boolean;
  showSkeletons: boolean;
  onToggle: (sectionId: SectionId) => void;
  children: React.ReactNode;
}

export function CollapsibleSection({
  sectionId,
  title,
  isCollapsed,
  showSkeletons,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  if (showSkeletons) {
    return (
      <div className="analysis-section">
        <div
          className="analysis-title"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid #e0e0e0",
            marginBottom: "15px",
          }}
        >
          <span>{title}</span>
          <span style={{ fontSize: "18px" }}>▼</span>
        </div>
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="analysis-section">
      <div
        className="analysis-title"
        onClick={() => onToggle(sectionId)}
        style={{
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 0",
          borderBottom: "1px solid #e0e0e0",
          marginBottom: isCollapsed ? 0 : "15px",
        }}
      >
        <span>{title}</span>
        <span
          style={{
            fontSize: "18px",
            fontWeight: "normal",
            transition: "transform 0.2s ease",
          }}
        >
          {isCollapsed ? "▶" : "▼"}
        </span>
      </div>
      {!isCollapsed && <div style={{ paddingTop: "15px" }}>{children}</div>}
    </div>
  );
}
