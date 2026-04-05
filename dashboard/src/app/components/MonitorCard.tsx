import { NeonLineChart } from "./NeonLineChart";
import { CyberPanel } from "./CyberPanel";
import { Activity } from "lucide-react";

type GlowColor = "cyan" | "green" | "magenta" | "orange" | "yellow";

interface MonitorCardProps {
  label: string;
  value: string;
  subValue?: string;
  subValue2?: string;
  data: number[];
  color: string;
  glowColor: GlowColor;
  maxVal?: number;
  showBar?: boolean;
  barPercent?: number;
  barColor?: string;
  status?: "online" | "warning" | "critical";
  unit?: string;
  extraData?: { label: string; value: string }[];
}

export function MonitorCard({
  label,
  value,
  subValue,
  subValue2,
  data,
  color,
  glowColor,
  maxVal = 100,
  showBar = false,
  barPercent = 0,
  barColor,
  status = "online",
  extraData = [],
}: MonitorCardProps) {
  const statusColor = status === "online" ? "#00ff41" : status === "warning" ? "#ffe600" : "#ff2244";
  const bColor = barColor || color;

  return (
    <CyberPanel glowColor={glowColor} className="p-2 flex flex-col gap-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-1 h-4"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span
            className="text-xs tracking-[3px] uppercase"
            style={{ fontFamily: "'Share Tech Mono', monospace", color: "#4a8aaa" }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
          />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a5a7a", fontSize: "9px" }}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main value */}
      <div
        className="tracking-wider"
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "clamp(14px, 2vw, 20px)",
          color: color,
          textShadow: `0 0 10px ${color}, 0 0 20px ${color}44`,
          fontWeight: 700,
        }}
      >
        {value}
      </div>

      {/* Sub values */}
      {subValue && (
        <div
          className="text-xs tracking-wider"
          style={{ fontFamily: "'Share Tech Mono', monospace", color: "#3a8aaa" }}
        >
          {subValue}
        </div>
      )}
      {subValue2 && (
        <div
          className="text-xs tracking-wider"
          style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a6a8a" }}
        >
          {subValue2}
        </div>
      )}

      {/* Extra data row */}
      {extraData.length > 0 && (
        <div className="flex gap-3">
          {extraData.map((d) => (
            <div key={d.label} className="flex flex-col">
              <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a5a7a", fontSize: "9px", letterSpacing: "1px" }}>
                {d.label}
              </span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#4a9aba", fontSize: "11px" }}>
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {showBar && (
        <div className="relative h-[3px] rounded overflow-hidden" style={{ background: "#0a1a2a" }}>
          <div
            className="absolute left-0 top-0 h-full transition-all duration-300 rounded"
            style={{
              width: `${Math.min(barPercent, 100)}%`,
              background: bColor,
              boxShadow: `0 0 8px ${bColor}`,
            }}
          />
        </div>
      )}

      {/* Chart */}
      <div>
        <NeonLineChart data={data} color={color} height={40} maxVal={maxVal} />
      </div>
    </CyberPanel>
  );
}
