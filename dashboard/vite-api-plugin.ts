import type { Plugin } from 'vite';
import si from 'systeminformation';

let lastDisk: { time: number; readBytes: number; writeBytes: number } | null = null;

async function sampleStats() {
  const [load, temp, mem, speed, graphics, disksIO] = await Promise.all([
    si.currentLoad(),
    si.cpuTemperature(),
    si.mem(),
    si.cpuCurrentSpeed(),
    si.graphics(),
    si.disksIO(),
  ]);

  const io = disksIO || { readBytes: 0, writeBytes: 0 };
  const now = Date.now();
  let readMBs = 0;
  let writeMBs = 0;
  if (lastDisk) {
    const dt = Math.max((now - lastDisk.time) / 1000, 0.001);
    readMBs = ((io as any).readBytes - lastDisk.readBytes) / dt / 1024 / 1024;
    writeMBs = ((io as any).writeBytes - lastDisk.writeBytes) / dt / 1024 / 1024;
  }
  lastDisk = {
    time: now,
    readBytes: (io as any).readBytes,
    writeBytes: (io as any).writeBytes,
  };

  const gpu = (graphics as any).controllers?.[0] ?? {};
  return {
    cpu: {
      load: (load as any).currentLoad ?? (load as any).currentload ?? 0,
      speedMHz: ((speed as any)?.avg ?? 0) * 1000,
      temp: (temp as any)?.main ?? null,
    },
    memory: {
      usedGB: mem.active / 1024 / 1024 / 1024,
      totalGB: mem.total / 1024 / 1024 / 1024,
      pressure: (mem.active / mem.total) * 100,
      commitGB: (mem.used + ((mem as any).swapused ?? 0)) / 1024 / 1024 / 1024,
    },
    gpu: {
      load: gpu.utilizationGpu ?? gpu.utilization ?? 0,
      vramUsedMB: gpu.memoryUsed ?? 0,
      clockMHz: gpu.clockCore ?? 0,
      model: gpu.model ?? 'Unknown GPU',
    },
    disk: { readMBs, writeMBs },
  };
}

export function apiPlugin(): Plugin {
  return {
    name: 'system-stats-api',
    configureServer(server) {
      server.middlewares.use('/api/stats', async (_req, res) => {
        try {
          const stats = await sampleStats();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(stats));
        } catch (err) {
          console.error('Failed to read stats', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read system stats' }));
        }
      });
    },
  };
}
