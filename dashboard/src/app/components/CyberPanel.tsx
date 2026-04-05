import React from "react";

interface CyberPanelProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "cyan" | "green" | "magenta" | "orange" | "yellow";
  title?: string;
  titleExtra?: React.ReactNode;
  cornerSize?: number;
}

const glowMap = {
  cyan: {
    border: "#00d4ff",
    shadow: "0 0 8px rgba(0,212,255,0.5), 0 0 20px rgba(0,212,255,0.15), inset 0 0 30px rgba(0,212,255,0.03)",
    text: "#00d4ff",
    corner: "#00d4ff",
  },
  green: {
    border: "#00ff41",
    shadow: "0 0 8px rgba(0,255,65,0.5), 0 0 20px rgba(0,255,65,0.15), inset 0 0 30px rgba(0,255,65,0.03)",
    text: "#00ff41",
    corner: "#00ff41",
  },
  magenta: {
    border: "#ff00aa",
    shadow: "0 0 8px rgba(255,0,170,0.5), 0 0 20px rgba(255,0,170,0.15), inset 0 0 30px rgba(255,0,170,0.03)",
    text: "#ff00aa",
    corner: "#ff00aa",
  },
  orange: {
    border: "#ff6600",
    shadow: "0 0 8px rgba(255,102,0,0.5), 0 0 20px rgba(255,102,0,0.15), inset 0 0 30px rgba(255,102,0,0.03)",
    text: "#ff6600",
    corner: "#ff6600",
  },
  yellow: {
    border: "#ffe600",
    shadow: "0 0 8px rgba(255,230,0,0.5), 0 0 20px rgba(255,230,0,0.15), inset 0 0 30px rgba(255,230,0,0.03)",
    text: "#ffe600",
    corner: "#ffe600",
  },
};

export function CyberPanel({
  children,
  className = "",
  glowColor = "cyan",
  cornerSize = 12,
}: CyberPanelProps) {
  const glow = glowMap[glowColor];
  const cs = cornerSize;

  return (
    <div
      className={`relative ${className}`}
      style={{
        background: "rgba(0, 8, 20, 0.9)",
        border: `1px solid ${glow.border}`,
        boxShadow: glow.shadow,
        clipPath: `polygon(${cs}px 0%, calc(100% - ${cs}px) 0%, 100% ${cs}px, 100% calc(100% - ${cs}px), calc(100% - ${cs}px) 100%, ${cs}px 100%, 0% calc(100% - ${cs}px), 0% ${cs}px)`,
      }}
    >
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 pointer-events-none" style={{ color: glow.corner }}>
        <svg width={cs + 4} height={cs + 4} viewBox={`0 0 ${cs + 4} ${cs + 4}`}>
          <polyline points={`${cs + 4},2 2,2 2,${cs + 4}`} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="absolute top-0 right-0 pointer-events-none" style={{ color: glow.corner }}>
        <svg width={cs + 4} height={cs + 4} viewBox={`0 0 ${cs + 4} ${cs + 4}`}>
          <polyline points={`0,2 ${cs + 2},2 ${cs + 2},${cs + 4}`} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 pointer-events-none" style={{ color: glow.corner }}>
        <svg width={cs + 4} height={cs + 4} viewBox={`0 0 ${cs + 4} ${cs + 4}`}>
          <polyline points={`${cs + 4},${cs + 2} 2,${cs + 2} 2,0`} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 pointer-events-none" style={{ color: glow.corner }}>
        <svg width={cs + 4} height={cs + 4} viewBox={`0 0 ${cs + 4} ${cs + 4}`}>
          <polyline points={`0,${cs + 2} ${cs + 2},${cs + 2} ${cs + 2},0`} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      {children}
    </div>
  );
}
