import { useState, useEffect, useMemo } from "react";

type MatrixMode = "DISK" | "CPU" | "RAM" | "GPU";

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
  commitGB?: number;
  sticks?: MemStick[];
  cpuPerCore?: number[];
  cpuLoad?: number;
  gpuLoad?: number;
  gpuVramUsed?: number;
  gpuVramTotal?: number;
  ssdRead?: number;
  ssdWrite?: number;
  diskLabel?: string;
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
  if (mode === "DISK") {
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
  commitGB = 0,
  sticks = [],
  cpuPerCore = [],
  cpuLoad = 0,
  gpuLoad = 0,
  gpuVramUsed = 0,
  gpuVramTotal = 0,
  ssdRead = 0,
  ssdWrite = 0,
  diskLabel = "",
}: MemoryMatrixProps) {
  const diskType = diskLabel.includes("HDD") ? "HDD" : "SSD";
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

  // Animate cells based on mode + viewMode
  useEffect(() => {
    const interval = setInterval(() => {
      setCells(() => {
        let idx = 0;
        return Array.from({ length: ROWS }, () =>
          Array.from({ length: COLS }, () => {
            const cellIdx = idx++;
            const jitter = (Math.random() - 0.5) * 0.08;

            if (mode === "RAM") {
              if (viewMode === "PAGE") {
                // PAGE: active/physical memory usage
                const hasData = totalGB > 0;
                const usedCount = hasData ? Math.round((usedGB / totalGB) * TOTAL_CELLS) : 0;
                if (!hasData) return { activity: Math.random() * 0.15 };
                if (cellIdx < usedCount) {
                  return { activity: Math.max(0.4, Math.min(1, 0.55 + Math.random() * 0.4 + jitter)) };
                }
                return { activity: Math.max(0, Math.min(0.15, 0.04 + Math.random() * 0.08)) };
              } else {
                // COMMIT: committed memory (physical + swap/pagefile)
                const hasData = totalGB > 0;
                const commitRatio = hasData ? Math.min(commitGB / totalGB, 1.5) : 0;
                const usedCount = Math.round((commitRatio / 1.5) * TOTAL_CELLS);
                if (!hasData) return { activity: Math.random() * 0.15 };
                if (cellIdx < usedCount) {
                  const intensity = 0.4 + commitRatio * 0.4;
                  return { activity: Math.max(0.3, Math.min(1, intensity + jitter)) };
                }
                return { activity: Math.max(0, Math.min(0.15, 0.04 + Math.random() * 0.08)) };
              }
            }

            if (mode === "CPU") {
              if (viewMode === "PAGE") {
                // PAGE: per-core utilization — each core gets its own block section
                const coreCount = cpuPerCore.length;
                if (coreCount === 0) return { activity: Math.random() * 0.15 };
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
              } else {
                // COMMIT: aggregate CPU load — all blocks filled proportionally
                const usedCount = Math.round((cpuLoad / 100) * TOTAL_CELLS);
                if (cellIdx < usedCount) {
                  return { activity: Math.max(0.4, Math.min(1, 0.55 + Math.random() * 0.4 + jitter)) };
                }
                return { activity: Math.max(0, Math.min(0.15, 0.04 + Math.random() * 0.06)) };
              }
            }

            if (mode === "GPU") {
              if (viewMode === "PAGE") {
                // PAGE: GPU compute utilization
                if (gpuLoad <= 0) return { activity: Math.random() * 0.15 };
                const usedCount = Math.round((gpuLoad / 100) * TOTAL_CELLS);
                if (cellIdx < usedCount) {
                  return { activity: Math.max(0.4, Math.min(1, 0.55 + Math.random() * 0.4 + jitter)) };
                }
                return { activity: Math.max(0, Math.min(0.15, 0.04 + Math.random() * 0.06)) };
              } else {
                // COMMIT: VRAM usage blocks
                if (gpuVramTotal <= 0) return { activity: Math.random() * 0.15 };
                const usedCount = Math.round((gpuVramUsed / gpuVramTotal) * TOTAL_CELLS);
                if (cellIdx < usedCount) {
                  return { activity: Math.max(0.4, Math.min(1, 0.55 + Math.random() * 0.4 + jitter)) };
                }
                return { activity: Math.max(0, Math.min(0.12, 0.03 + Math.random() * 0.06)) };
              }
            }

            // SSD mode — use log scale so even small I/O is visible
            // logScale: 0 MB/s -> 0, 0.1 -> ~0.15, 1 -> ~0.35, 10 -> ~0.6, 100 -> ~0.85, 500 -> 1.0
            function logScale(speed: number): number {
              if (speed <= 0) return 0;
              return Math.min(Math.log10(speed + 1) / Math.log10(500), 1);
            }

            if (viewMode === "PAGE") {
              // PAGE: top half = read, bottom half = write
              const halfCells = TOTAL_CELLS / 2;
              if (cellIdx < halfCells) {
                const readRatio = logScale(ssdRead);
                const filled = Math.max(ssdRead > 0 ? 1 : 0, Math.round(readRatio * halfCells));
                if (cellIdx < filled) {
                  return { activity: Math.max(0.4, Math.min(1, 0.5 + readRatio * 0.5 + jitter)) };
                }
                return { activity: Math.max(0, Math.min(0.12, 0.03 + Math.random() * 0.06)) };
              } else {
                const writeRatio = logScale(ssdWrite);
                const filled = Math.max(ssdWrite > 0 ? 1 : 0, Math.round(writeRatio * halfCells));
                const posInHalf = cellIdx - halfCells;
                if (posInHalf < filled) {
                  return { activity: Math.max(0.4, Math.min(1, 0.5 + writeRatio * 0.5 + jitter)) };
                }
                return { activity: Math.max(0, Math.min(0.12, 0.03 + Math.random() * 0.06)) };
              }
            } else {
              // COMMIT: combined throughput
              const totalSpeed = ssdRead + ssdWrite;
              const ratio = logScale(totalSpeed);
              const usedCount = Math.max(totalSpeed > 0 ? 1 : 0, Math.round(ratio * TOTAL_CELLS));
              if (cellIdx < usedCount) {
                return { activity: Math.max(0.4, Math.min(1, 0.5 + ratio * 0.5 + jitter)) };
              }
              return { activity: Math.max(0, Math.min(0.12, 0.03 + Math.random() * 0.06)) };
            }
          })
        );
      });
    }, 800);
    return () => clearInterval(interval);
  }, [mode, viewMode, usedGB, totalGB, commitGB, cpuPerCore, cpuLoad, gpuLoad, gpuVramUsed, gpuVramTotal, ssdRead, ssdWrite]);

  const modes: MatrixMode[] = ["DISK", "CPU", "RAM", "GPU"];
  const modeColors: Record<MatrixMode, string> = {
    DISK: "#cc44ff",
    CPU: "#00d4ff",
    RAM: "#ffcc00",
    GPU: "#00ff88",
  };

  // Header + stats per mode per viewMode
  const coreCount = cpuPerCore.length;
  const modeInfo = (() => {
    switch (mode) {
      case "RAM": {
        if (viewMode === "PAGE") {
          const usedCount = totalGB > 0 ? Math.round((usedGB / totalGB) * TOTAL_CELLS) : 0;
          return {
            header: sticks.length > 0 ? `${sticks.length} DIMMs // ${totalGB.toFixed(0)}GB` : `${TOTAL_CELLS} SLOTS`,
            stats: totalGB > 0 ? {
              left: `ACTIVE: ${usedCount}/${TOTAL_CELLS} (${usedGB.toFixed(1)}GB)`,
              right: `FREE: ${TOTAL_CELLS - usedCount} (${(totalGB - usedGB).toFixed(1)}GB)`,
            } : null,
            legendLeft: "FREE",
            legendRight: "ACTIVE",
          };
        } else {
          const commitRatio = totalGB > 0 ? Math.min(commitGB / totalGB, 1.5) : 0;
          const usedCount = Math.round((commitRatio / 1.5) * TOTAL_CELLS);
          return {
            header: `COMMIT ${commitGB.toFixed(1)}GB / ${totalGB.toFixed(0)}GB`,
            stats: {
              left: `COMMITTED: ${usedCount}/${TOTAL_CELLS} (${commitGB.toFixed(1)}GB)`,
              right: `RATIO: ${(commitRatio * 100).toFixed(0)}% of RAM`,
            },
            legendLeft: "FREE",
            legendRight: "COMMITTED",
          };
        }
      }
      case "CPU": {
        if (viewMode === "PAGE") {
          const usedCount = Math.round((cpuLoad / 100) * TOTAL_CELLS);
          return {
            header: coreCount > 0 ? `${coreCount} THREADS // PER-CORE` : `${TOTAL_CELLS} SLOTS`,
            stats: coreCount > 0 ? {
              left: `LOAD: ${cpuLoad.toFixed(1)}% (${usedCount}/${TOTAL_CELLS})`,
              right: cpuPerCore.map(c => c.toFixed(0) + "%").join(" "),
            } : null,
            legendLeft: "IDLE",
            legendRight: "ACTIVE",
          };
        } else {
          const usedCount = Math.round((cpuLoad / 100) * TOTAL_CELLS);
          return {
            header: `AGGREGATE // ${cpuLoad.toFixed(0)}% TOTAL`,
            stats: {
              left: `ACTIVE: ${usedCount}/${TOTAL_CELLS} BLOCKS`,
              right: `${coreCount} THREADS COMBINED`,
            },
            legendLeft: "IDLE",
            legendRight: "ACTIVE",
          };
        }
      }
      case "GPU": {
        if (viewMode === "PAGE") {
          const usedCount = Math.round((gpuLoad / 100) * TOTAL_CELLS);
          return {
            header: `COMPUTE // ${gpuLoad.toFixed(0)}% LOAD`,
            stats: {
              left: `ACTIVE: ${usedCount}/${TOTAL_CELLS} BLOCKS`,
              right: `GPU UTILIZATION`,
            },
            legendLeft: "IDLE",
            legendRight: "ACTIVE",
          };
        } else {
          const usedCount = gpuVramTotal > 0 ? Math.round((gpuVramUsed / gpuVramTotal) * TOTAL_CELLS) : 0;
          return {
            header: `VRAM ${gpuVramUsed}/${gpuVramTotal}MB`,
            stats: {
              left: `USED: ${usedCount}/${TOTAL_CELLS} BLOCKS`,
              right: gpuVramTotal > 0 ? `${((gpuVramUsed / gpuVramTotal) * 100).toFixed(1)}% VRAM` : "---",
            },
            legendLeft: "FREE",
            legendRight: "USED",
          };
        }
      }
      case "DISK": {
        const shortDisk = diskLabel ? diskLabel.split(" ")[0] : "";
        if (viewMode === "PAGE") {
          return {
            header: `${shortDisk} R: ${ssdRead.toFixed(1)} / W: ${ssdWrite.toFixed(1)} MB/s`,
            stats: {
              left: `READ: ${ssdRead.toFixed(1)} MB/s (TOP)`,
              right: `WRITE: ${ssdWrite.toFixed(1)} MB/s (BTM)`,
            },
            legendLeft: "LOW",
            legendRight: "HIGH",
          };
        } else {
          const totalSpeed = ssdRead + ssdWrite;
          return {
            header: `${shortDisk} THROUGHPUT ${totalSpeed.toFixed(1)} MB/s`,
            stats: {
              left: `COMBINED: ${totalSpeed.toFixed(1)} MB/s`,
              right: `R: ${ssdRead.toFixed(1)} + W: ${ssdWrite.toFixed(1)}`,
            },
            legendLeft: "LOW",
            legendRight: "HIGH",
          };
        }
      }
    }
  })();

  // View mode labels per mode
  const pageLabel = (() => {
    switch (mode) {
      case "RAM": return "PHYSICAL";
      case "CPU": return "PER-CORE";
      case "GPU": return "COMPUTE";
      case "DISK": return "R / W";
    }
  })();
  const commitLabel = (() => {
    switch (mode) {
      case "RAM": return "COMMIT";
      case "CPU": return "AGGREGATE";
      case "GPU": return "VRAM";
      case "DISK": return "THROUGHPUT";
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
            {m === "DISK" ? diskType : m}
          </button>
        ))}
      </div>

      {/* View mode tabs — context-aware labels */}
      <div className="flex gap-1">
        {([["PAGE", pageLabel], ["COMMIT", commitLabel]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setViewMode(key as "PAGE" | "COMMIT")}
            className="flex-1 py-1 text-xs transition-all duration-200"
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              background: viewMode === key ? `${modeColors[mode]}33` : "rgba(0,15,30,0.8)",
              border: `1px solid ${viewMode === key ? modeColors[mode] : "#1a3a5a"}`,
              color: viewMode === key ? modeColors[mode] : "#2a5a7a",
              boxShadow: viewMode === key ? `0 0 8px ${modeColors[mode]}44` : "none",
              clipPath: "polygon(3px 0%, calc(100% - 3px) 0%, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0% calc(100% - 3px), 0% 3px)",
            }}
          >
            ▶ {label}
          </button>
        ))}
      </div>

      {/* Header label */}
      <div
        className="text-center py-0.5"
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          color: "#2a6a8a",
          fontSize: "10px",
          letterSpacing: "4px",
          borderBottom: "1px solid #0a2a3a",
        }}
      >
        {mode === "DISK" ? diskType : mode}_BANKS // {modeInfo.header}
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

            const cellsPerCore = coreCount > 0 ? Math.floor(TOTAL_CELLS / coreCount) : 0;
            const isCpuBoundary = mode === "CPU" && viewMode === "PAGE" && cellsPerCore > 0 && cellIdx > 0 && cellIdx % cellsPerCore === 0 && ci === 0;
            const isRamBoundary = mode === "RAM" && dimmBoundaries.has(cellIdx) && ci === 0;
            const isSsdBoundary = mode === "DISK" && viewMode === "PAGE" && cellIdx === TOTAL_CELLS / 2 && ci === 0;

            return (
              <div
                key={`${ri}-${ci}`}
                className="rounded-[1px] transition-colors duration-500"
                style={{
                  background: color,
                  boxShadow: isHot ? `0 0 4px ${color}` : "none",
                  minHeight: "6px",
                  borderTop: (isCpuBoundary || isRamBoundary || isSsdBoundary) ? `1px solid ${modeColors[mode]}66` : "none",
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
