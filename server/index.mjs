import express from 'express';
import cors from 'cors';
import si from 'systeminformation';

const app = express();
const port = process.env.PORT || 8787;

app.use(cors());

let lastDisk = null;

async function sampleStats() {
  const [load, temp, mem, speed, graphics, disksIO] = await Promise.all([
    si.currentLoad(),
    si.cpuTemperature(),
    si.mem(),
    si.cpuCurrentSpeed(),
    si.graphics(),
    si.disksIO(),
  ]);

  const now = Date.now();
  let readMBs = 0;
  let writeMBs = 0;
  if (lastDisk) {
    const dt = Math.max((now - lastDisk.time) / 1000, 0.001);
    readMBs = (disksIO.readBytes - lastDisk.readBytes) / dt / 1024 / 1024;
    writeMBs = (disksIO.writeBytes - lastDisk.writeBytes) / dt / 1024 / 1024;
  }
  lastDisk = {
    time: now,
    readBytes: disksIO.readBytes,
    writeBytes: disksIO.writeBytes,
  };

  const gpu = graphics.controllers?.[0] ?? {};
  return {
    cpu: {
      load: load.currentload, // %
      speedMHz: (speed.avg ?? 0) * 1000,
      temp: temp.main ?? null,
    },
    memory: {
      usedGB: mem.active / 1024 / 1024 / 1024,
      totalGB: mem.total / 1024 / 1024 / 1024,
      pressure: (mem.active / mem.total) * 100,
      commitGB: (mem.used + (mem.swapused ?? 0)) / 1024 / 1024 / 1024,
    },
    gpu: {
      load: gpu.utilizationGpu ?? gpu.utilization ?? 0,
      vramUsedMB: gpu.memoryUsed ?? 0,
      clockMHz: gpu.clockCore ?? 0,
      model: gpu.model ?? 'Unknown GPU',
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
