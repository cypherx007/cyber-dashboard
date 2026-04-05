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
    <CyberPanel glowColor={glowColor} className="flex-1 min-h-0 p-2 flex flex-col gap-0.5 overflow-hidden">
      {/* Header + value row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-1 h-3"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span
            className="text-[10px] tracking-[3px] uppercase"
            style={{ fontFamily: "'Share Tech Mono', monospace", color: "#4a8aaa" }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
          />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a5a7a", fontSize: "8px" }}>
            {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main value */}
      <div
        className="tracking-wider leading-tight"
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "clamp(12px, 1.8vw, 18px)",
          color: color,
          textShadow: `0 0 10px ${color}, 0 0 20px ${color}44`,
          fontWeight: 700,
        }}
      >
        {value}
      </div>

      {/* Sub values — inline to save vertical space */}
      {(subValue || subValue2) && (
        <div className="flex gap-3 text-[10px] tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          {subValue && <span style={{ color: "#3a8aaa" }}>{subValue}</span>}
          {subValue2 && <span style={{ color: "#2a6a8a" }}>{subValue2}</span>}
        </div>
      )}

      {/* Extra data row */}
      {extraData.length > 0 && (
        <div className="flex gap-3">
          {extraData.map((d) => (
            <div key={d.label} className="flex items-baseline gap-1">
              <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a5a7a", fontSize: "8px", letterSpacing: "1px" }}>
                {d.label}
              </span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#4a9aba", fontSize: "10px" }}>
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {showBar && (
        <div className="relative h-[2px] rounded overflow-hidden" style={{ background: "#0a1a2a" }}>
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

      {/* Chart — fills remaining space */}
      <div className="flex-1 min-h-0">
        <NeonLineChart data={data} color={color} height="100%" maxVal={maxVal} />
      </div>
    </CyberPanel>
  );
}
