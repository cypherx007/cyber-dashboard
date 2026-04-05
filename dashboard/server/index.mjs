import express from 'express';
import cors from 'cors';
import si from 'systeminformation';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';

const app = express();
const port = process.env.PORT || 8787;

// CORS — restrict to known origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:8787', `http://localhost:${port}`];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET'],
  credentials: false,
}));

// Simple rate limiter — max 60 requests per minute per IP
const rateMap = new Map();
app.use('/api', (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 60000;
  }
  entry.count++;
  rateMap.set(ip, entry);
  if (entry.count > 60) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
});

// Cleanup stale rate limit entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now > entry.reset) rateMap.delete(ip);
  }
}, 300000);

// ── Cached system info ──────────────────────────────────────────────────────

// Cache GPU info — si.graphics() takes 30+ seconds on some systems
let cachedGpu = { model: 'Unknown GPU', utilizationGpu: 0, memoryUsed: 0, memoryTotal: 0, clockCore: 0, vram: 0 };

async function refreshGpu() {
  try {
    const graphics = await si.graphics();
    const gpu = graphics.controllers?.[0] ?? {};
    cachedGpu = {
      utilizationGpu: gpu.utilizationGpu ?? gpu.utilization ?? 0,
      memoryUsed: gpu.memoryUsed ?? 0,
      memoryTotal: gpu.memoryTotal ?? 0,
      clockCore: gpu.clockCore ?? 0,
      vram: gpu.vram ?? 0,
      model: gpu.model ?? 'Unknown GPU',
    };
  } catch (e) {
    console.error('[cache] GPU refresh failed');
  }
}
refreshGpu();
const gpuInterval = setInterval(refreshGpu, 60000);

// Cache CPU info — si.cpu() takes ~6s
let cachedCpuInfo = { brand: 'Unknown', cores: 0, physicalCores: 0, speed: 0 };

async function refreshCpuInfo() {
  try {
    const cpu = await si.cpu();
    cachedCpuInfo = {
      brand: cpu.brand ?? 'Unknown',
      cores: cpu.cores ?? 0,
      physicalCores: cpu.physicalCores ?? 0,
      speed: cpu.speed ?? 0,
    };
  } catch (e) {
    console.error('[cache] CPU info refresh failed');
  }
}
refreshCpuInfo();
const cpuInfoInterval = setInterval(refreshCpuInfo, 120000);

// Cache RAM layout — si.memLayout() can be slow on some systems
let cachedMemLayout = { sticks: [], totalSlots: 0 };
let memLayoutReady = false;

async function refreshMemLayout() {
  try {
    const layout = await si.memLayout();
    const sticks = (layout || []).map((dimm) => ({
      sizeGB: (dimm.size ?? 0) / 1073741824,
      type: dimm.type ?? 'Unknown',
      clockSpeed: dimm.clockSpeed ?? 0,
      bank: dimm.bank ?? '',
    }));
    const count = sticks.length;
    cachedMemLayout = {
      sticks,
      totalSlots: count <= 2 ? 4 : count + (count % 2),
    };
    memLayoutReady = true;
  } catch (e) {
    console.error('[cache] memLayout refresh failed');
  }
}
refreshMemLayout();
const memLayoutInterval = setInterval(refreshMemLayout, 120000);

// Cache disk I/O via PowerShell (si.disksIO returns null on some Windows systems)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const diskScript = path.resolve(__dirname, 'disk-io.ps1');
let cachedDiskIO = { readMBs: 0, writeMBs: 0 };

function refreshDiskIO() {
  if (!existsSync(diskScript)) return;
  execFile('powershell', ['-ExecutionPolicy', 'Bypass', '-File', diskScript],
    { timeout: 8000, maxBuffer: 1024 },
    (err, stdout) => {
      if (err) return;
      const parts = stdout.trim().split(',');
      if (parts.length < 2) return;
      const readBytes = parseFloat(parts[0]);
      const writeBytes = parseFloat(parts[1]);
      if (!isFinite(readBytes) || !isFinite(writeBytes)) return;
      cachedDiskIO = {
        readMBs: readBytes / 1024 / 1024,
        writeMBs: writeBytes / 1024 / 1024,
      };
    });
}
refreshDiskIO();
const diskInterval = setInterval(refreshDiskIO, 2000);

// ── Cleanup on exit ─────────────────────────────────────────────────────────
function cleanup() {
  clearInterval(gpuInterval);
  clearInterval(cpuInfoInterval);
  clearInterval(memLayoutInterval);
  clearInterval(diskInterval);
}
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('SIGINT', () => { cleanup(); process.exit(0); });

// ── Stats endpoint ──────────────────────────────────────────────────────────

async function sampleStats() {
  const [load, mem, speed] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuCurrentSpeed(),
  ]);

  const cpuLoad = load.currentLoad ?? load.currentload ?? 0;
  const cpuSpeedMHz = (speed?.avg ?? 0) * 1000;
  const perCore = (load.cpus || []).map((c) => c.load ?? 0);

  return {
    cpu: {
      load: cpuLoad,
      speedMHz: cpuSpeedMHz,
      temp: null,
      cores: cachedCpuInfo.cores,
      physicalCores: cachedCpuInfo.physicalCores,
      brand: cachedCpuInfo.brand,
      perCore,
    },
    memory: {
      usedGB: mem.active / 1024 / 1024 / 1024,
      totalGB: mem.total / 1024 / 1024 / 1024,
      pressure: (mem.active / mem.total) * 100,
      commitGB: (mem.used + (mem.swapused ?? 0)) / 1024 / 1024 / 1024,
    },
    gpu: {
      load: cachedGpu.utilizationGpu ?? 0,
      vramUsedMB: cachedGpu.memoryUsed ?? 0,
      vramTotalMB: cachedGpu.memoryTotal || cachedGpu.vram || 0,
      clockMHz: cachedGpu.clockCore ?? 0,
      model: cachedGpu.model ?? 'Unknown GPU',
    },
    disk: {
      readMBs: cachedDiskIO.readMBs,
      writeMBs: cachedDiskIO.writeMBs,
    },
    memoryLayout: {
      sticks: cachedMemLayout.sticks,
      totalSlots: cachedMemLayout.totalSlots,
      ready: memLayoutReady,
    },
  };
}

app.get('/api/stats', async (_req, res) => {
  try {
    const stats = await sampleStats();
    res.json(stats);
  } catch (err) {
    console.error('[api] Stats collection failed');
    res.status(500).json({ error: 'Service unavailable' });
  }
});

// ── Production: serve built frontend ────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (process.env.NODE_ENV === 'production' && existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`System metrics API running on http://localhost:${port}`);
});
