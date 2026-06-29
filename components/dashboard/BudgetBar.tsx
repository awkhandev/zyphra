"use client";
import React from "react";
import { fmt, s } from "./shared";

export function BudgetBar({
  spent,
  budget,
}: {
  spent: number;
  budget: number | null;
}) {
  if (!budget)
    return <span style={{ fontSize: 12, color: "#56565F" }}>No limit</span>;
  const pct = Math.min((spent / budget) * 100, 100);
  const color = pct >= 90 ? "#EF4444" : pct >= 75 ? "#F59E0B" : "#6366F1";
  return (
    <div>
      <div
        style={{
          height: 6,
          background: "#18181C",
          borderRadius: 3,
          overflow: "hidden",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.3s",
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: "#9898A6", ...s.mono }}>
        ${fmt(spent, 2)} / ${fmt(budget, 2)}
      </span>
    </div>
  );
}
