import express from 'express';
import cors from 'cors';
import si from 'systeminformation';

const app = express();
const port = process.env.PORT || 8787;

app.use(cors());

let lastDisk = null;

// Cache GPU info — si.graphics() takes 30+ seconds on some systems
let cachedGpu = { model: 'Unknown GPU', utilizationGpu: 0, memoryUsed: 0, clockCore: 0 };
let gpuCacheReady = false;

// Fetch GPU info once at startup, then refresh every 60s
async function refreshGpu() {
  try {
    const graphics = await si.graphics();
    const gpu = graphics.controllers?.[0] ?? {};
    cachedGpu = {
      utilizationGpu: gpu.utilizationGpu ?? gpu.utilization ?? 0,
      memoryUsed: gpu.memoryUsed ?? 0,
      clockCore: gpu.clockCore ?? 0,
      model: gpu.model ?? 'Unknown GPU',
    };
    gpuCacheReady = true;
  } catch (e) {
    console.error('GPU info failed', e);
  }
}
refreshGpu();
setInterval(refreshGpu, 60000);

async function sampleStats() {
  const [load, mem, speed, disksIO] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuCurrentSpeed(),
    si.disksIO(),
  ]);
  const temp = { main: null };

  const io = disksIO || { readBytes: 0, writeBytes: 0 };

  const now = Date.now();
  let readMBs = 0;
  let writeMBs = 0;
  if (lastDisk) {
    const dt = Math.max((now - lastDisk.time) / 1000, 0.001);
    readMBs = (io.readBytes - lastDisk.readBytes) / dt / 1024 / 1024;
    writeMBs = (io.writeBytes - lastDisk.writeBytes) / dt / 1024 / 1024;
  }
  lastDisk = {
    time: now,
    readBytes: io.readBytes,
    writeBytes: io.writeBytes,
  };

  const cpuLoad = load.currentLoad ?? load.currentload ?? 0;
  const cpuTemp = temp?.main ?? null;
  const cpuSpeedMHz = (speed?.avg ?? 0) * 1000;
  return {
    cpu: {
      load: cpuLoad, // %
      speedMHz: cpuSpeedMHz,
      temp: cpuTemp,
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
      clockMHz: cachedGpu.clockCore ?? 0,
      model: cachedGpu.model ?? 'Unknown GPU',
    },
    disk: {
      readMBs: readMBs,
      writeMBs: writeMBs,
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
