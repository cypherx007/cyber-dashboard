import { useState, useEffect, useMemo } from "react";

type MatrixMode = "SSD" | "CPU" | "RAM" | "GPU";

interface MemStick {
  sizeGB: number;
  type: string;
  clockSpeed: number;
  bank: string;
}

interface CellData {
  activity: number; // 0-1
}

interface MemoryMatrixProps {
  usedGB?: number;
  totalGB?: number;
  sticks?: MemStick[];
  cpuPerCore?: number[];
  cpuLoad?: number;
  gpuLoad?: number;
  gpuVramUsed?: number;
  gpuVramTotal?: number;
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
  if (mode === "CPU") {
    if (a < 0.1) return "#001a2e";
    if (a < 0.3) return "#00243e";
    if (a < 0.5) return "#003a5e";
    if (a < 0.7) return "#005a8e";
    if (a < 0.85) return "#0080c0";
    if (a < 0.95) return "#00aaee";
    return "#00d4ff";
  }
  if (mode === "GPU") {
    if (a < 0.1) return "#001a0a";
    if (a < 0.3) return "#002e14";
    if (a < 0.5) return "#00502a";
    if (a < 0.7) return "#007a44";
    if (a < 0.85) return "#00aa66";
    if (a < 0.95) return "#00dd88";
    return "#00ff88";
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
const TOTAL_CELLS = ROWS * COLS;

export function MemoryMatrix({
  usedGB = 0,
  totalGB = 0,
  sticks = [],
  cpuPerCore = [],
  cpuLoad = 0,
  gpuLoad = 0,
  gpuVramUsed = 0,
  gpuVramTotal = 0,
}: MemoryMatrixProps) {
  const [mode, setMode] = useState<MatrixMode>("RAM");
  const [viewMode, setViewMode] = useState<"PAGE" | "COMMIT">("PAGE");
  const [cells, setCells] = useState<CellData[][]>(
    Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ({ activity: Math.random() * 0.1 }))
    )
  );

  // DIMM boundaries for RAM mode
  const dimmBoundaries = useMemo(() => {
    if (sticks.length <= 1) return new Set<number>();
    const totalStickGB = sticks.reduce((s, st) => s + st.sizeGB, 0);
    if (totalStickGB <= 0) return new Set<number>();
    const bounds = new Set<number>();
    let cumGB = 0;
    for (let i = 0; i < sticks.length - 1; i++) {
      cumGB += sticks[i].sizeGB;
      bounds.add(Math.round((cumGB / totalStickGB) * TOTAL_CELLS));
    }
    return bounds;
  }, [sticks]);

  // Animate cells based on mode
  useEffect(() => {
    const interval = setInterval(() => {
      setCells(() => {
        let idx = 0;
        return Array.from({ length: ROWS }, () =>
          Array.from({ length: COLS }, () => {
            const cellIdx = idx++;
            const jitter = (Math.random() - 0.5) * 0.08;

            if (mode === "RAM") {
              const hasData = totalGB > 0;
              const usedCount = hasData ? Math.round((usedGB / totalGB) * TOTAL_CELLS) : 0;
              if (!hasData) return { activity: Math.random() * 0.15 };
              if (cellIdx < usedCount) {
                return { activity: Math.max(0.4, Math.min(1, 0.55 + Math.random() * 0.4 + jitter)) };
              }
              return { activity: Math.max(0, Math.min(0.15, 0.04 + Math.random() * 0.08)) };
            }

            if (mode === "CPU") {
              const coreCount = cpuPerCore.length;
              if (coreCount === 0) return { activity: Math.random() * 0.15 };
              // Each core gets TOTAL_CELLS/coreCount blocks
              // Within a core's block, fill proportional to that core's load
              const cellsPerCore = Math.floor(TOTAL_CELLS / coreCount);
              const coreIdx = Math.min(Math.floor(cellIdx / cellsPerCore), coreCount - 1);
              const coreLoad = cpuPerCore[coreIdx] ?? 0;
              const posInCore = cellIdx - coreIdx * cellsPerCore;
              const usedInCore = Math.round((coreLoad / 100) * cellsPerCore);
              if (posInCore < usedInCore) {
                const intensity = 0.5 + (coreLoad / 100) * 0.5;
                return { activity: Math.max(0.4, Math.min(1, intensity + jitter)) };
              }
              return { activity: Math.max(0, Math.min(0.15, 0.04 + Math.random() * 0.06)) };
            }

            if (mode === "GPU") {
              const hasVram = gpuVramTotal > 0;
              if (!hasVram && gpuLoad <= 0) return { activity: Math.random() * 0.15 };
              // GPU: fill blocks proportional to GPU load %
              const usedCount = Math.round((gpuLoad / 100) * TOTAL_CELLS);
              if (cellIdx < usedCount) {
                return { activity: Math.max(0.4, Math.min(1, 0.55 + Math.random() * 0.4 + jitter)) };
              }
              return { activity: Math.max(0, Math.min(0.15, 0.04 + Math.random() * 0.06)) };
            }

            // SSD mode — animated random pattern
            return { activity: Math.random() * 0.6 + Math.random() * 0.4 * Math.sin(Date.now() / 500 + cellIdx * 0.3) * 0.5 + 0.25 };
          })
        );
      });
    }, 800);
    return () => clearInterval(interval);
  }, [mode, usedGB, totalGB, cpuPerCore, cpuLoad, gpuLoad, gpuVramUsed, gpuVramTotal]);

  const modes: MatrixMode[] = ["SSD", "CPU", "RAM", "GPU"];
  const modeColors: Record<MatrixMode, string> = {
    SSD: "#cc44ff",
    CPU: "#00d4ff",
    RAM: "#ffcc00",
    GPU: "#00ff88",
  };

  // Header + stats per mode
  const coreCount = cpuPerCore.length;
  const modeInfo = (() => {
    switch (mode) {
      case "RAM": {
        const usedCount = totalGB > 0 ? Math.round((usedGB / totalGB) * TOTAL_CELLS) : 0;
        return {
          header: sticks.length > 0 ? `${sticks.length} DIMMs // ${totalGB.toFixed(0)}GB` : `${TOTAL_CELLS} SLOTS`,
          stats: totalGB > 0 ? {
            left: `USED: ${usedCount}/${TOTAL_CELLS} BLOCKS (${usedGB.toFixed(1)}GB)`,
            right: `FREE: ${TOTAL_CELLS - usedCount} (${(totalGB - usedGB).toFixed(1)}GB)`,
          } : null,
          legendLeft: "FREE",
          legendRight: "USED",
        };
      }
      case "CPU": {
        const usedCount = Math.round((cpuLoad / 100) * TOTAL_CELLS);
        return {
          header: coreCount > 0 ? `${coreCount} THREADS // ${cpuLoad.toFixed(0)}% LOAD` : `${TOTAL_CELLS} SLOTS`,
          stats: coreCount > 0 ? {
            left: `ACTIVE: ${usedCount}/${TOTAL_CELLS} BLOCKS (${cpuLoad.toFixed(1)}%)`,
            right: `${coreCount} CORES @ ${cpuPerCore.map(c => c.toFixed(0) + "%").join(" ")}`,
          } : null,
          legendLeft: "IDLE",
          legendRight: "ACTIVE",
        };
      }
      case "GPU": {
        const usedCount = Math.round((gpuLoad / 100) * TOTAL_CELLS);
        return {
          header: gpuVramTotal > 0 ? `VRAM ${gpuVramUsed}/${gpuVramTotal}MB` : `GPU ${gpuLoad.toFixed(0)}% LOAD`,
          stats: {
            left: `ACTIVE: ${usedCount}/${TOTAL_CELLS} BLOCKS (${gpuLoad.toFixed(1)}%)`,
            right: gpuVramTotal > 0 ? `VRAM: ${gpuVramUsed}MB / ${gpuVramTotal}MB` : "VRAM: ---",
          },
          legendLeft: "IDLE",
          legendRight: "ACTIVE",
        };
      }
      case "SSD":
        return {
          header: "DISK I/O ACTIVITY",
          stats: null,
          legendLeft: "LOW",
          legendRight: "HIGH",
        };
    }
  })();

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

      {/* Header label */}
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
        {mode}_BANKS // {modeInfo.header}
      </div>

      {/* Stats line */}
      {modeInfo.stats && (
        <div className="flex justify-between px-1 gap-2" style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px" }}>
          <span style={{ color: modeColors[mode], flexShrink: 0 }}>{modeInfo.stats.left}</span>
          <span style={{ color: "#2a5a7a", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{modeInfo.stats.right}</span>
        </div>
      )}

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
            const cellIdx = ri * COLS + ci;
            const color = activityColorForMode(cell.activity, mode);
            const isHot = cell.activity > 0.8;

            // Core boundaries for CPU mode
            const cellsPerCore = coreCount > 0 ? Math.floor(TOTAL_CELLS / coreCount) : 0;
            const isCpuBoundary = mode === "CPU" && cellsPerCore > 0 && cellIdx > 0 && cellIdx % cellsPerCore === 0 && ci === 0;
            const isRamBoundary = mode === "RAM" && dimmBoundaries.has(cellIdx) && ci === 0;

            return (
              <div
                key={`${ri}-${ci}`}
                className="rounded-[1px] transition-colors duration-500"
                style={{
                  background: color,
                  boxShadow: isHot ? `0 0 4px ${color}` : "none",
                  minHeight: "6px",
                  borderTop: (isCpuBoundary || isRamBoundary) ? `1px solid ${modeColors[mode]}66` : "none",
                }}
              />
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 px-1">
        <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a5a7a", fontSize: "9px" }}>{modeInfo.legendLeft}</span>
        <div className="flex-1 h-[4px] rounded" style={{
          background: `linear-gradient(to right, #0a1a0a, ${modeColors[mode]})`,
        }} />
        <span style={{ fontFamily: "'Share Tech Mono', monospace", color: modeColors[mode], fontSize: "9px" }}>{modeInfo.legendRight}</span>
      </div>
    </div>
  );
}
