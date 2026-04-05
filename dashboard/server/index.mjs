import express from 'express';
import cors from 'cors';
import si from 'systeminformation';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const port = process.env.PORT || 8787;

app.use(cors());


// Cache GPU info — si.graphics() takes 30+ seconds on some systems
let cachedGpu = { model: 'Unknown GPU', utilizationGpu: 0, memoryUsed: 0, memoryTotal: 0, clockCore: 0, vram: 0 };
let gpuCacheReady = false;

// Fetch GPU info once at startup, then refresh every 60s
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
    gpuCacheReady = true;
  } catch (e) {
    console.error('GPU info failed', e);
  }
}
refreshGpu();
setInterval(refreshGpu, 60000);

// Cache CPU info — si.cpu() takes ~6s
let cachedCpuInfo = { brand: 'Unknown', cores: 0, physicalCores: 0, speed: 0 };
let cpuInfoReady = false;

async function refreshCpuInfo() {
  try {
    const cpu = await si.cpu();
    cachedCpuInfo = {
      brand: cpu.brand ?? 'Unknown',
      cores: cpu.cores ?? 0,
      physicalCores: cpu.physicalCores ?? 0,
      speed: cpu.speed ?? 0,
    };
    cpuInfoReady = true;
  } catch (e) {
    console.error('CPU info failed', e);
  }
}
refreshCpuInfo();
setInterval(refreshCpuInfo, 120000);

// Cache GPU info — also store VRAM total from si.graphics()
// Note: Intel integrated GPUs don't report utilization/clock/vramUsed

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
    console.error('memLayout failed', e);
  }
}
refreshMemLayout();
setInterval(refreshMemLayout, 120000);

// Cache disk I/O via PowerShell (si.disksIO returns null on some Windows systems)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const diskScript = path.join(__dirname, 'disk-io.ps1');
let cachedDiskIO = { readMBs: 0, writeMBs: 0 };

function refreshDiskIO() {
  execFile('powershell', ['-ExecutionPolicy', 'Bypass', '-File', diskScript], { timeout: 8000 }, (err, stdout) => {
    if (err) return;
    const parts = stdout.trim().split(',');
    const readBytes = parseFloat(parts[0]) || 0;
    const writeBytes = parseFloat(parts[1]) || 0;
    cachedDiskIO = {
      readMBs: readBytes / 1024 / 1024,
      writeMBs: writeBytes / 1024 / 1024,
    };
  });
}
refreshDiskIO();
setInterval(refreshDiskIO, 2000);

async function sampleStats() {
  const [load, mem, speed] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuCurrentSpeed(),
  ]);
  const temp = { main: null };
  const readMBs = cachedDiskIO.readMBs;
  const writeMBs = cachedDiskIO.writeMBs;

  const cpuLoad = load.currentLoad ?? load.currentload ?? 0;
  const cpuTemp = temp?.main ?? null;
  const cpuSpeedMHz = (speed?.avg ?? 0) * 1000;
  const perCore = (load.cpus || []).map((c) => c.load ?? 0);
  return {
    cpu: {
      load: cpuLoad,
      speedMHz: cpuSpeedMHz,
      temp: cpuTemp,
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
      readMBs: readMBs,
      writeMBs: writeMBs,
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
    console.error('Failed to read stats', err);
    res.status(500).json({ error: 'Failed to read system stats' });
  }
});

app.listen(port, () => {
  console.log(`System metrics API running on http://localhost:${port}`);
});
