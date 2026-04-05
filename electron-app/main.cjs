const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const { execFile } = require('child_process');
const fs = require('fs');

// ── Express API Server ──────────────────────────────────────────────────────

const server = express();
const PORT = 18787; // Use high port to avoid conflicts

server.use(cors({ origin: true, methods: ['GET'], credentials: false }));

// Cache GPU info
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
  } catch (e) { /* silent */ }
}
refreshGpu();
const gpuInterval = setInterval(refreshGpu, 60000);

// Cache CPU info
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
  } catch (e) { /* silent */ }
}
refreshCpuInfo();
const cpuInfoInterval = setInterval(refreshCpuInfo, 120000);

// Cache RAM layout
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
    cachedMemLayout = { sticks, totalSlots: count <= 2 ? 4 : count + (count % 2) };
    memLayoutReady = true;
  } catch (e) { /* silent */ }
}
refreshMemLayout();
const memLayoutInterval = setInterval(refreshMemLayout, 120000);

// Cache disk I/O via PowerShell
function getDiskScriptPath() {
  // In packaged app: resources/server/disk-io.ps1
  const resourcePath = path.join(process.resourcesPath || '', 'server', 'disk-io.ps1');
  if (fs.existsSync(resourcePath)) return resourcePath;
  // In dev: ./server/disk-io.ps1
  const devPath = path.join(__dirname, 'server', 'disk-io.ps1');
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

let cachedDiskIO = { readMBs: 0, writeMBs: 0 };
function refreshDiskIO() {
  const scriptPath = getDiskScriptPath();
  if (!scriptPath) return;
  execFile('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    { timeout: 8000, maxBuffer: 1024 },
    (err, stdout) => {
      if (err) return;
      const parts = stdout.trim().split(',');
      if (parts.length < 2) return;
      const readBytes = parseFloat(parts[0]);
      const writeBytes = parseFloat(parts[1]);
      if (!isFinite(readBytes) || !isFinite(writeBytes)) return;
      cachedDiskIO = { readMBs: readBytes / 1024 / 1024, writeMBs: writeBytes / 1024 / 1024 };
    });
}
refreshDiskIO();
const diskInterval = setInterval(refreshDiskIO, 2000);

// Stats endpoint
async function sampleStats() {
  const [load, mem, speed] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuCurrentSpeed(),
  ]);
  const cpuLoad = load.currentLoad ?? load.currentload ?? 0;
  const perCore = (load.cpus || []).map((c) => c.load ?? 0);
  return {
    cpu: {
      load: cpuLoad,
      speedMHz: (speed?.avg ?? 0) * 1000,
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
    disk: { readMBs: cachedDiskIO.readMBs, writeMBs: cachedDiskIO.writeMBs },
    memoryLayout: { sticks: cachedMemLayout.sticks, totalSlots: cachedMemLayout.totalSlots, ready: memLayoutReady },
  };
}

server.get('/api/stats', async (_req, res) => {
  try {
    const stats = await sampleStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Service unavailable' });
  }
});

// Serve built frontend
const distPath = path.join(__dirname, 'dist');
server.use(express.static(distPath));
server.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Electron Window ─────────────────────────────────────────────────────────

let mainWindow = null;
let httpServer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'Cyber Performance Console',
    backgroundColor: '#000810',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  httpServer = server.listen(PORT, () => {
    console.log(`Cyber Dashboard API on http://localhost:${PORT}`);
    createWindow();
  });
});

app.on('window-all-closed', () => {
  clearInterval(gpuInterval);
  clearInterval(cpuInfoInterval);
  clearInterval(memLayoutInterval);
  clearInterval(diskInterval);
  if (httpServer) httpServer.close();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
