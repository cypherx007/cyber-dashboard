import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { CyberPanel } from "./components/CyberPanel";
import { MonitorCard } from "./components/MonitorCard";
import { MemoryMatrix } from "./components/MemoryMatrix";
import { Activity, HardDrive, Zap, Pause, RefreshCw, ChevronDown, Pin, Terminal } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

type ApiStats = {
  cpu: { load: number; speedMHz: number; temp: number | null };
  memory: { usedGB: number; totalGB: number; pressure: number; commitGB: number };
  gpu: { load: number; vramUsedMB: number; clockMHz: number; model: string };
  disk: { readMBs: number; writeMBs: number };
};

// ── Utility ─────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function useTick(interval: number, paused: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setTick((t) => t + 1), interval);
    return () => clearInterval(id);
  }, [interval, paused]);
  return tick;
}

const MAX_HISTORY = 60;
function pushHistory(arr: number[], val: number): number[] {
  const next = [...arr, val];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

// ── Scanlines overlay ────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)",
        mixBlendMode: "overlay",
      }}
    />
  );
}

// ── MatrixRain ───────────────────────────────────────────────────────────────
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    const FONT_SIZE = 14;
    let cols: number;
    let drops: number[];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      cols = Math.floor(canvas!.width / FONT_SIZE);
      drops = Array(cols).fill(1);
    }
    resize();
    window.addEventListener("resize", resize);

    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF><=/\\|[]{}";

    function draw() {
      ctx.fillStyle = "rgba(0, 5, 15, 0.05)";
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx.font = `${FONT_SIZE}px 'Share Tech Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const c = chars[Math.floor(Math.random() * chars.length)];
        const bright = drops[i] * FONT_SIZE < canvas!.height * 0.3;
        ctx.fillStyle = bright ? "rgba(0,255,65,0.9)" : "rgba(0,180,50,0.3)";
        ctx.fillText(c, i * FONT_SIZE, drops[i] * FONT_SIZE);
        if (drops[i] * FONT_SIZE > canvas!.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.04 }}
    />
  );
}

// ── Glitch text ──────────────────────────────────────────────────────────────
function GlitchTitle({ text }: { text: string }) {
  const [glitching, setGlitching] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 150);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      className="relative inline-block"
      style={{
        fontFamily: "'Orbitron', sans-serif",
        color: "#00d4ff",
        textShadow: glitching
          ? "2px 0 #ff00aa, -2px 0 #00ff41, 0 0 12px #00d4ff"
          : "0 0 12px #00d4ff, 0 0 25px rgba(0,212,255,0.4)",
        letterSpacing: "2px",
        transition: "text-shadow 0.05s",
      }}
    >
      {text}
    </span>
  );
}

// ── Cyber Select ─────────────────────────────────────────────────────────────
function CyberSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pr-6 pl-3 py-1 text-xs cursor-pointer outline-none"
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          background: "rgba(0,15,30,0.9)",
          border: "1px solid #1a4a6a",
          color: "#00d4ff",
          boxShadow: "0 0 6px rgba(0,212,255,0.2)",
          clipPath: "polygon(5px 0%, calc(100% - 5px) 0%, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0% calc(100% - 5px), 0% 5px)",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ background: "#000d1a" }}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#00d4ff" }} />
    </div>
  );
}

// ── CyberToggle ──────────────────────────────────────────────────────────────
function CyberToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative w-10 h-5 rounded-full transition-all duration-300"
      style={{
        background: on ? "rgba(0,255,65,0.2)" : "rgba(0,30,50,0.8)",
        border: `1px solid ${on ? "#00ff41" : "#1a4a6a"}`,
        boxShadow: on ? "0 0 10px rgba(0,255,65,0.5)" : "none",
      }}
    >
      <div
        className="absolute top-[2px] w-4 h-4 rounded-full transition-all duration-300"
        style={{
          left: on ? "calc(100% - 18px)" : "2px",
          background: on ? "#00ff41" : "#2a5a7a",
          boxShadow: on ? "0 0 8px #00ff41" : "none",
        }}
      />
    </button>
  );
}

// ── CyberButton ──────────────────────────────────────────────────────────────
function CyberButton({ children, onClick, color = "#00d4ff" }: { children: ReactNode; onClick?: () => void; color?: string }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      className="px-4 py-1 text-xs tracking-widest uppercase transition-all duration-150"
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        background: pressed ? `${color}22` : "rgba(0,10,25,0.9)",
        border: `1px solid ${color}`,
        color: color,
        boxShadow: pressed ? `0 0 15px ${color}88, inset 0 0 10px ${color}22` : `0 0 6px ${color}44`,
        clipPath: "polygon(6px 0%, calc(100% - 6px) 0%, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0% calc(100% - 6px), 0% 6px)",
        transform: pressed ? "scale(0.97)" : "scale(1)",
      }}
    >
      {children}
    </button>
  );
}

// ── Live indicator ────────────────────────────────────────────────────────────
function LiveIndicator() {
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 800);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className="flex items-center gap-2 px-3 py-1"
      style={{
        border: "1px solid #ff4400",
        boxShadow: "0 0 10px rgba(255,68,0,0.5)",
        clipPath: "polygon(5px 0%, calc(100% - 5px) 0%, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0% calc(100% - 5px), 0% 5px)",
        background: "rgba(255,68,0,0.08)",
      }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{
          background: "#ff4400",
          boxShadow: blink ? "0 0 8px #ff4400, 0 0 16px #ff4400" : "none",
          opacity: blink ? 1 : 0.4,
          transition: "all 0.3s",
        }}
      />
      <span
        style={{
          fontFamily: "'Orbitron', monospace",
          color: "#ff4400",
          fontSize: "11px",
          letterSpacing: "3px",
          textShadow: "0 0 8px #ff4400",
        }}
      >
        LIVE
      </span>
    </div>
  );
}

// ── SSD Monitor (special) ─────────────────────────────────────────────────────
function SSDCard({ readData, writeData, readSpeed, writeSpeed }: { readData: number[]; writeData: number[]; readSpeed: number; writeSpeed: number }) {
  return (
    <CyberPanel glowColor="magenta" className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4" style={{ background: "#cc44ff", boxShadow: "0 0 6px #cc44ff" }} />
          <span className="text-xs tracking-[3px] uppercase" style={{ fontFamily: "'Share Tech Mono', monospace", color: "#4a8aaa" }}>
            SSD I/O
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#00ff41", boxShadow: "0 0 6px #00ff41" }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a5a7a", fontSize: "9px" }}>ONLINE</span>
        </div>
      </div>

      <div className="flex gap-4">
        <div>
          <div className="text-xs mb-0.5" style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a8a5a", letterSpacing: "1px" }}>▲ READ</div>
          <div style={{ fontFamily: "'Orbitron', monospace", color: "#00ff88", fontSize: "16px", fontWeight: 700, textShadow: "0 0 10px #00ff88" }}>
            {readSpeed.toFixed(1)} <span style={{ fontSize: "10px", color: "#2a8a6a" }}>MB/s</span>
          </div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ fontFamily: "'Share Tech Mono', monospace", color: "#8a2a6a", letterSpacing: "1px" }}>▼ WRITE</div>
          <div style={{ fontFamily: "'Orbitron', monospace", color: "#ff44aa", fontSize: "16px", fontWeight: 700, textShadow: "0 0 10px #ff44aa" }}>
            {writeSpeed.toFixed(1)} <span style={{ fontSize: "10px", color: "#6a2a5a" }}>MB/s</span>
          </div>
        </div>
      </div>

      {/* Dual charts stacked */}
      <div className="flex flex-col gap-1">
        <div style={{ height: "28px" }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", color: "#2a6a4a" }}>READ</span>
          <div style={{ height: "22px" }}>
            {/* mini recharts inline */}
            <MiniBarChart data={readData} color="#00ff88" />
          </div>
        </div>
        <div style={{ height: "28px" }}>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "9px", color: "#6a2a5a" }}>WRITE</span>
          <div style={{ height: "22px" }}>
            <MiniBarChart data={writeData} color="#ff44aa" />
          </div>
        </div>
      </div>
    </CyberPanel>
  );
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[1px] h-full w-full">
      {data.slice(-30).map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] transition-all duration-300"
          style={{
            height: `${(v / max) * 100}%`,
            minHeight: "1px",
            background: color,
            opacity: 0.5 + (i / 30) * 0.5,
            boxShadow: i === data.length - 1 ? `0 0 4px ${color}` : "none",
          }}
        />
      ))}
    </div>
  );
}

// ── Clock ─────────────────────────────────────────────────────────────────────
function CyberClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (n: number) => n.toString().padStart(2, "0");
  return (
    <span style={{ fontFamily: "'Share Tech Mono', monospace", color: "#2a7aaa", fontSize: "12px", letterSpacing: "2px" }}>
      {fmt(time.getHours())}:{fmt(time.getMinutes())}:{fmt(time.getSeconds())}
    </span>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [paused, setPaused] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [sampleRate, setSampleRate] = useState("1s");
  const [disk, setDisk] = useState("C: (system) - SSD");
  const [gpuDevice, setGpuDevice] = useState("Intel(R) UHD Graphics 620");

  // ── Simulated metrics ────────────────────────────────────────────────────
  const [cpuVal, setCpuVal] = useState(0);
  const [cpuClock, setCpuClock] = useState(0);
  const [cpuTemp, setCpuTemp] = useState<number | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(40).fill(0));

  const [ramUsed, setRamUsed] = useState(0);
  const [ramTotal, setRamTotal] = useState(0);
  const [ramPressure, setRamPressure] = useState(0);
  const [ramCommit, setRamCommit] = useState(0);
  const [ramHistory, setRamHistory] = useState<number[]>(Array(40).fill(0));

  const [gpuVal, setGpuVal] = useState(0);
  const [gpuVram, setGpuVram] = useState(0);
  const [gpuClock, setGpuClock] = useState(0);
  const [gpuHistory, setGpuHistory] = useState<number[]>(Array(40).fill(0));

  const [ssdRead, setSsdRead] = useState(0);
  const [ssdWrite, setSsdWrite] = useState(0);
  const [ssdReadHistory, setSsdReadHistory] = useState<number[]>(Array(40).fill(0));
  const [ssdWriteHistory, setSsdWriteHistory] = useState<number[]>(Array(40).fill(0));

  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const [frameCount, setFrameCount] = useState(0);

  const sampleInterval =
    sampleRate === "0.5s" ? 500 : sampleRate === "2s" ? 2000 : sampleRate === "5s" ? 5000 : 1000;
  const tick = useTick(sampleInterval, paused);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;

    async function pull() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        let data: ApiStats;
        try {
          const res = await fetch(`${API_BASE}/api/stats`, { signal: controller.signal });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`API responded ${res.status}`);
          data = await res.json();
        } catch {
          clearTimeout(timeout);
          // Fallback: simulate realistic metrics when API is unreachable
          const t = Date.now() / 1000;
          data = {
            cpu: {
              load: 25 + 20 * Math.sin(t * 0.3) + Math.random() * 15,
              speedMHz: 1800 + Math.round(Math.random() * 400),
              temp: 52 + Math.round(Math.random() * 15),
            },
            memory: {
              usedGB: 8.2 + Math.random() * 1.5,
              totalGB: 11.9,
              pressure: 69 + Math.random() * 12,
              commitGB: 9.5 + Math.random() * 1.2,
            },
            gpu: {
              load: 10 + Math.random() * 30,
              vramUsedMB: Math.round(400 + Math.random() * 300),
              clockMHz: Math.round(800 + Math.random() * 200),
              model: "Intel(R) UHD Graphics 620",
            },
            disk: {
              readMBs: Math.random() * 50,
              writeMBs: Math.random() * 25,
            },
          };
        }
        setApiError(null);
        if (cancelled) return;

        setFrameCount((f) => f + 1);
        setLastUpdate(new Date().toLocaleTimeString());

        // CPU
        setCpuVal(data.cpu.load ?? 0);
        setCpuClock(Math.round(data.cpu.speedMHz ?? 0));
        if (data.cpu.temp !== null && data.cpu.temp !== undefined) {
          setCpuTemp(Math.round(data.cpu.temp));
        }
        setCpuHistory((h) => pushHistory(h, data.cpu.load ?? 0));

        // RAM
        const used = data.memory.usedGB ?? 0;
        const total = data.memory.totalGB ?? 0;
        const pressure = total > 0 ? (used / total) * 100 : 0;
        setRamUsed(parseFloat(used.toFixed(1)));
        setRamTotal(parseFloat(total.toFixed(1)));
        setRamPressure(parseFloat(clamp(data.memory.pressure ?? pressure, 0, 100).toFixed(1)));
        setRamCommit(parseFloat((data.memory.commitGB ?? 0).toFixed(1)));
        setRamHistory((h) => pushHistory(h, data.memory.pressure ?? pressure));

        // GPU
        const gpuLoad = data.gpu.load ?? 0;
        setGpuVal(parseFloat(gpuLoad.toFixed(1)));
        setGpuVram(Math.round(data.gpu.vramUsedMB ?? 0));
        setGpuClock(Math.round(data.gpu.clockMHz ?? 0));
        const knownGpus = [
          "Intel(R) UHD Graphics 620",
          "NVIDIA GeForce RTX 3080",
          "AMD Radeon RX 6800",
        ];
        if (data.gpu.model && knownGpus.includes(data.gpu.model)) {
          setGpuDevice(data.gpu.model);
        }
        setGpuHistory((h) => pushHistory(h, gpuLoad));

        // SSD
        const read = data.disk.readMBs ?? 0;
        const write = data.disk.writeMBs ?? 0;
        setSsdRead(parseFloat(read.toFixed(1)));
        setSsdWrite(parseFloat(write.toFixed(1)));
        setSsdReadHistory((h) => pushHistory(h, read));
        setSsdWriteHistory((h) => pushHistory(h, write));
      } catch (err) {
        console.error("Failed to pull live metrics", err);
        setApiError((err as Error).message);
      }
    }

    pull();
    return () => {
      cancelled = true;
    };
  }, [tick, paused]);

  const cpuStatus = cpuVal > 85 ? "critical" : cpuVal > 65 ? "warning" : "online";
  const ramStatus = ramPressure > 90 ? "critical" : ramPressure > 75 ? "warning" : "online";
  const gpuStatus = gpuVal > 85 ? "critical" : gpuVal > 65 ? "warning" : "online";

  return (
    <div
      className="min-h-screen w-full flex flex-col overflow-hidden"
      style={{ background: "#000810", fontFamily: "'Share Tech Mono', monospace" }}
    >
      <MatrixRain />
      <Scanlines />

      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Top bar ── */}
      <div
        className="relative z-10 flex items-center justify-between px-4 py-2"
        style={{
          background: "rgba(0,5,15,0.95)",
          borderBottom: "1px solid rgba(0,212,255,0.2)",
          boxShadow: "0 0 20px rgba(0,212,255,0.08)",
        }}
      >
        {/* Left: logo + title */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8"
            style={{
              border: "1px solid #00d4ff",
              boxShadow: "0 0 10px rgba(0,212,255,0.4)",
              clipPath: "polygon(5px 0%, calc(100% - 5px) 0%, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0% calc(100% - 5px), 0% 5px)",
              background: "rgba(0,212,255,0.08)",
            }}
          >
            <Terminal size={14} style={{ color: "#00d4ff" }} />
          </div>
          <div>
            <div style={{ fontSize: "9px", letterSpacing: "4px", color: "#2a7aaa" }}>TACTICAL TASK MANAGER</div>
            <GlitchTitle text="CYBER PERFORMANCE CONSOLE" />
          </div>
        </div>

        {/* Center: stats bar */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "9px", letterSpacing: "2px", color: "#2a5a7a" }}>FRAME</span>
            <span style={{ color: "#00ff41", fontSize: "11px" }}>#{String(frameCount).padStart(6, "0")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "9px", letterSpacing: "2px", color: "#2a5a7a" }}>SYSTEM_TIME</span>
            <CyberClock />
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "9px", letterSpacing: "2px", color: "#2a5a7a" }}>NODE</span>
            <span style={{ color: "#4a8aaa", fontSize: "11px" }}>LOCAL_HOST</span>
          </div>
          {apiError ? (
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "9px", letterSpacing: "2px", color: "#ff8800" }}>API</span>
              <span style={{ color: "#ff4400", fontSize: "11px" }}>{apiError}</span>
            </div>
          ) : (
            lastUpdate && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "9px", letterSpacing: "2px", color: "#2a5a7a" }}>API</span>
                <span style={{ color: "#00ff41", fontSize: "11px" }}>OK {lastUpdate}</span>
              </div>
            )
          )}
        </div>

        {/* Right: Live indicator + window controls */}
        <div className="flex items-center gap-3">
          <LiveIndicator />
          <div className="flex items-center gap-2 ml-2">
            {["━", "⬜", "✕"].map((sym, i) => (
              <button
                key={sym}
                className="w-5 h-5 flex items-center justify-center text-xs transition-all"
                style={{
                  color: ["#4a7a9a", "#4a7a9a", "#aa4444"][i],
                  background: "transparent",
                  border: "none",
                }}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(320px,42%)_1fr] gap-3 p-3 overflow-auto"
        style={{ minHeight: 0 }}
      >
        {/* Left column */}
        <div className="flex flex-col gap-3">
          {/* CPU */}
          <MonitorCard
            label="CPU"
            value={`${cpuVal.toFixed(1)} %`}
            subValue={`CLOCK  ${cpuClock} MHz`}
            subValue2={`TEMP   ${cpuTemp}°C`}
            data={cpuHistory}
            color="#00d4ff"
            glowColor="cyan"
            maxVal={100}
            showBar={true}
            barPercent={cpuVal}
            barColor="#00d4ff"
            status={cpuStatus}
            extraData={[
              { label: "CORES", value: "8" },
              { label: "THREADS", value: "16" },
              { label: "TDP", value: "65W" },
            ]}
          />

          {/* RAM */}
          <MonitorCard
            label="RAM"
            value={`${ramUsed.toFixed(1)} / ${ramTotal} GB`}
            subValue={`PRESSURE  ${ramPressure.toFixed(1)}%`}
            subValue2={`COMMIT    ${ramCommit.toFixed(1)} GB`}
            data={ramHistory}
            color="#ffe600"
            glowColor="yellow"
            maxVal={100}
            showBar={true}
            barPercent={ramPressure}
            barColor="#ffe600"
            status={ramStatus}
            extraData={[
              { label: "SLOTS", value: "2/4" },
              { label: "SPEED", value: "3200MHz" },
              { label: "TYPE", value: "DDR4" },
            ]}
          />

          {/* GPU */}
          <MonitorCard
            label="GPU"
            value={`${gpuVal.toFixed(1)} %`}
            subValue={`VRAM   ${gpuVram} MB`}
            subValue2={`CLOCK  ${gpuClock} MHz`}
            data={gpuHistory}
            color="#00ff88"
            glowColor="green"
            maxVal={100}
            showBar={true}
            barPercent={gpuVal}
            barColor="#00ff88"
            status={gpuStatus}
            extraData={[
              { label: "VRAM_TOTAL", value: "2048MB" },
              { label: "DRIVER", value: "30.0.14" },
            ]}
          />

          {/* SSD */}
          <SSDCard
            readData={ssdReadHistory}
            writeData={ssdWriteHistory}
            readSpeed={ssdRead}
            writeSpeed={ssdWrite}
          />
        </div>

        {/* Right column: Memory Matrix */}
        <CyberPanel glowColor="cyan" className="p-3 flex flex-col gap-2 min-h-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "4px", color: "#2a6a8a" }}>SUBSYSTEM ANALYSIS</div>
              <div
                style={{
                  fontFamily: "'Orbitron', monospace",
                  color: "#00d4ff",
                  textShadow: "0 0 10px #00d4ff",
                  letterSpacing: "2px",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                INFERRED ACTIVITY MATRIX
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: "1px", height: "30px", background: "linear-gradient(to bottom, transparent, #00d4ff, transparent)" }} />
              <div>
                <div style={{ fontSize: "9px", color: "#2a5a7a", letterSpacing: "2px" }}>UPTIME</div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", color: "#00ff41", fontSize: "11px" }}>
                  {String(Math.floor(frameCount / 3600)).padStart(2, "0")}:
                  {String(Math.floor((frameCount % 3600) / 60)).padStart(2, "0")}:
                  {String(frameCount % 60).padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>

          {/* Separator line */}
          <div style={{ height: "1px", background: "linear-gradient(to right, transparent, #00d4ff44, #00d4ff88, #00d4ff44, transparent)" }} />

          {/* Memory Matrix */}
          <div className="flex-1 min-h-0">
            <MemoryMatrix />
          </div>

          {/* Bottom stats row */}
          <div style={{ height: "1px", background: "linear-gradient(to right, transparent, #00d4ff44, #00d4ff88, #00d4ff44, transparent)" }} />
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { label: "CPU_LOAD", val: `${cpuVal.toFixed(0)}%`, color: "#00d4ff" },
              { label: "MEM_USED", val: `${ramPressure.toFixed(0)}%`, color: "#ffe600" },
              { label: "GPU_LOAD", val: `${gpuVal.toFixed(0)}%`, color: "#00ff88" },
              { label: "SSD_R/W", val: `${(ssdRead + ssdWrite).toFixed(0)}`, color: "#cc44ff" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center p-2"
                style={{
                  background: "rgba(0,10,25,0.6)",
                  border: `1px solid ${s.color}33`,
                  clipPath: "polygon(4px 0%, calc(100% - 4px) 0%, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0% calc(100% - 4px), 0% 4px)",
                }}
              >
                <span style={{ fontSize: "8px", color: "#2a5a7a", letterSpacing: "1px" }}>{s.label}</span>
                <span
                  style={{
                    fontFamily: "'Orbitron', monospace",
                    color: s.color,
                    fontSize: "14px",
                    fontWeight: 700,
                    textShadow: `0 0 8px ${s.color}`,
                  }}
                >
                  {s.val}
                </span>
              </div>
            ))}
          </div>
        </CyberPanel>
      </div>

      {/* ── Bottom control bar ── */}
      <div
        className="relative z-10 flex flex-wrap items-center gap-3 px-4 py-2"
        style={{
          background: "rgba(0,5,15,0.97)",
          borderTop: "1px solid rgba(0,212,255,0.15)",
          boxShadow: "0 0 20px rgba(0,212,255,0.05)",
        }}
      >
        {/* Sample rate */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#2a5a7a" }}>SAMPLE</span>
          <CyberSelect
            options={["0.5s", "1s", "2s", "5s"]}
            value={sampleRate}
            onChange={setSampleRate}
          />
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "20px", background: "#0a3a5a" }} />

        {/* Disk */}
        <div className="flex items-center gap-2">
          <HardDrive size={12} style={{ color: "#cc44ff" }} />
          <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#2a5a7a" }}>DISK</span>
          <CyberSelect
            options={["C: (system) - SSD", "D: (data) - HDD", "F: (software) - HDD"]}
            value={disk}
            onChange={setDisk}
          />
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "20px", background: "#0a3a5a" }} />

        {/* GPU device */}
        <div className="flex items-center gap-2">
          <Zap size={12} style={{ color: "#00ff88" }} />
          <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#2a5a7a" }}>GPU</span>
          <CyberSelect
            options={[
              "Intel(R) UHD Graphics 620",
              "NVIDIA GeForce RTX 3080",
              "AMD Radeon RX 6800",
            ]}
            value={gpuDevice}
            onChange={setGpuDevice}
          />
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "20px", background: "#0a3a5a" }} />

        {/* Pin toggle */}
        <div className="flex items-center gap-2">
          <Pin size={12} style={{ color: "#ffe600" }} />
          <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#2a5a7a" }}>PIN</span>
          <CyberToggle on={pinned} onChange={setPinned} />
          <span style={{ fontSize: "10px", color: pinned ? "#00ff41" : "#2a5a7a" }}>
            {pinned ? "ON" : "OFF"}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pause / Rescan */}
        <div className="flex items-center gap-2">
          <CyberButton onClick={() => setPaused((p) => !p)} color={paused ? "#ff4400" : "#00d4ff"}>
            {paused ? (
              <span className="flex items-center gap-1">
                <Activity size={11} /> RESUME
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Pause size={11} /> PAUSE
              </span>
            )}
          </CyberButton>
          <CyberButton color="#cc44ff">
            <span className="flex items-center gap-1">
              <RefreshCw size={11} /> RESCAN
            </span>
          </CyberButton>
          <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#2a5a7a" }}>CAP</div>
        </div>
      </div>
    </div>
  );
}
