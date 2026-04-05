import { useState, useEffect } from "react";

type MatrixMode = "SSD" | "CPU" | "RAM" | "GPU";

interface CellData {
  activity: number; // 0-1
}

function generateCells(rows: number, cols: number): CellData[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ activity: Math.random() }))
  );
}

function activityColor(a: number): string {
  if (a < 0.1) return "#0a1a0a";
  if (a < 0.25) return "#0d2e0d";
  if (a < 0.4) return "#1a4a10";
  if (a < 0.55) return "#2a6818";
  if (a < 0.7) return "#3d9422";
  if (a < 0.82) return "#6dc62e";
  if (a < 0.92) return "#b8e840";
  return "#e8ff44";
}

function activityColorForMode(a: number, mode: MatrixMode): string {
  if (mode === "RAM") {
    if (a < 0.1) return "#1a0e00";
    if (a < 0.3) return "#2e1a00";
    if (a < 0.5) return "#5c3500";
    if (a < 0.7) return "#8c5500";
    if (a < 0.85) return "#c47a00";
    if (a < 0.95) return "#e8a800";
    return "#ffcc00";
  }
  if (mode === "GPU") {
    if (a < 0.1) return "#00050d";
    if (a < 0.3) return "#000d1a";
    if (a < 0.5) return "#00183a";
    if (a < 0.7) return "#002a6e";
    if (a < 0.85) return "#0040b0";
    if (a < 0.95) return "#0066e0";
    return "#00aaff";
  }
  if (mode === "SSD") {
    if (a < 0.1) return "#050014";
    if (a < 0.3) return "#0d0028";
    if (a < 0.5) return "#1a0050";
    if (a < 0.7) return "#2e0090";
    if (a < 0.85) return "#5500cc";
    if (a < 0.95) return "#8800ff";
    return "#cc44ff";
  }
  return activityColor(a);
}

const ROWS = 8;
const COLS = 16;

export function MemoryMatrix() {
  const [mode, setMode] = useState<MatrixMode>("RAM");
  const [viewMode, setViewMode] = useState<"PAGE" | "COMMIT">("PAGE");
  const [cells, setCells] = useState<CellData[][]>(generateCells(ROWS, COLS));

  useEffect(() => {
    const interval = setInterval(() => {
      setCells((prev) =>
        prev.map((row) =>
          row.map((cell) => {
            const delta = (Math.random() - 0.5) * 0.3;
            return { activity: Math.max(0, Math.min(1, cell.activity + delta)) };
          })
        )
      );
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const modes: MatrixMode[] = ["SSD", "CPU", "RAM", "GPU"];
  const modeColors: Record<MatrixMode, string> = {
    SSD: "#cc44ff",
    CPU: "#00d4ff",
    RAM: "#ffcc00",
    GPU: "#00ff88",
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Mode selector */}
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 px-2 py-1 text-xs transition-all duration-200"
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              background: mode === m ? `${modeColors[m]}22` : "rgba(0,20,40,0.6)",
              border: `1px solid ${mode === m ? modeColors[m] : "#1a3a5a"}`,
              color: mode === m ? modeColors[m] : "#4a7a9a",
              boxShadow: mode === m ? `0 0 10px ${modeColors[m]}44, inset 0 0 8px ${modeColors[m]}11` : "none",
              clipPath: "polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Mode label */}
      <div style={{ fontFamily: "'Share Tech Mono', monospace", color: "#4a8aaa", fontSize: "11px" }}>
        MODE: <span style={{ color: modeColors[mode] }}>{viewMode === "PAGE" ? "PAGE_ANALYSIS" : "COMMIT_ANALYSIS"}</span>
      </div>

      {/* Page / Commit tabs */}
      <div className="flex gap-1">
        {(["PAGE", "COMMIT"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            className="flex-1 py-1 text-xs transition-all duration-200"
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              background: viewMode === v ? `${modeColors[mode]}33` : "rgba(0,15,30,0.8)",
              border: `1px solid ${viewMode === v ? modeColors[mode] : "#1a3a5a"}`,
              color: viewMode === v ? modeColors[mode] : "#2a5a7a",
              boxShadow: viewMode === v ? `0 0 8px ${modeColors[mode]}44` : "none",
              clipPath: "polygon(3px 0%, calc(100% - 3px) 0%, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0% calc(100% - 3px), 0% 3px)",
            }}
          >
            ▶ {v}
          </button>
        ))}
      </div>

      {/* MEM BANKS label */}
      <div
        className="text-center py-1"
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          color: "#2a6a8a",
          fontSize: "10px",
          letterSpacing: "4px",
          borderBottom: "1px solid #0a2a3a",
        }}
      >
        MEM_BANKS // {ROWS * COLS} SLOTS
      </div>

      {/* Cell grid */}
      <div
        className="flex-1 grid gap-[3px] p-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {cells.map((row, ri) =>
          row.map((cell, ci) => {
            const color = activityColorForMode(cell.activity, mode);
            const isHot = cell.activity > 0.8;
            return (
              <div
                key={`${ri}-${ci}`}
                className="rounded-[1px] transition-colors duration-500"
                style={{
                  background: color,
                  boxShadow: isHot ? `0 0 4px ${color}` : "none",
                  minHeight: "6px",
                }}
                title={`${Math.round(cell.activity * 100)}%`}
              />
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 px-1">
        <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a5a7a", fontSize: "9px" }}>IDLE</span>
        <div className="flex-1 h-[4px] rounded" style={{
          background: `linear-gradient(to right, #0a1a0a, ${modeColors[mode]})`,
        }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", color: modeColors[mode], fontSize: "9px" }}>ACTIVE</span>
      </div>
    </div>
  );
}
