const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
const runningCommands = new Map();

const ignoredDirs = new Set([
  'node_modules', '.git', 'dist', 'release', 'build', '.next', '.vite', 'coverage', '.cache', '.nemotron-backups'
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#050509',
    icon: path.join(__dirname, '..', 'public', 'assets', 'nemotron.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function safeReadText(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size > 1_500_000) {
    return `[Arquivo grande demais para abrir direto: ${(stat.size / 1024 / 1024).toFixed(2)} MB]`;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function scanDirectory(dir, root = dir, depth = 0) {
  if (depth > 7) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => !ignoredDirs.has(entry.name))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, 800)
    .map((entry) => {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
      const isDirectory = entry.isDirectory();
      return {
        name: entry.name,
        path: fullPath,
        relativePath: relPath,
        type: isDirectory ? 'directory' : 'file',
        children: isDirectory ? scanDirectory(fullPath, root, depth + 1) : []
      };
    });
}

function ensureInsideProject(projectRoot, targetPath) {
  const root = path.resolve(projectRoot);
  const target = path.resolve(targetPath);
  if (!target.startsWith(root)) {
    throw new Error('Caminho fora da pasta do projeto bloqueado por segurança.');
  }
}

function createBackup(projectRoot, filePath) {
  if (!fs.existsSync(filePath)) return null;
  const rel = path.relative(projectRoot, filePath).replace(/\\/g, '__');
  const backupDir = path.join(projectRoot, '.nemotron-backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${stamp}__${rel}`);
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}


function stripHtmlToText(html) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  return withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html, fallback) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtmlToText(match[1]).slice(0, 140) : fallback;
}

ipcMain.handle('dialog:selectProjectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar pasta do projeto',
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folder = result.filePaths[0];
  return {
    name: path.basename(folder),
    path: folder,
    tree: scanDirectory(folder)
  };
});

ipcMain.handle('project:scan', async (_event, projectPath) => {
  return scanDirectory(projectPath);
});

ipcMain.handle('file:read', async (_event, filePath) => {
  return safeReadText(filePath);
});

ipcMain.handle('file:write', async (_event, payload) => {
  const { projectRoot, filePath, content } = payload;
  ensureInsideProject(projectRoot, filePath);
  const backupPath = createBackup(projectRoot, filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true, backupPath };
});

ipcMain.handle('file:create', async (_event, payload) => {
  const { projectRoot, relativePath, content = '' } = payload;
  const filePath = path.join(projectRoot, relativePath);
  ensureInsideProject(projectRoot, filePath);
  if (fs.existsSync(filePath)) throw new Error('Arquivo já existe.');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true, filePath };
});

ipcMain.handle('file:delete', async (_event, payload) => {
  const { projectRoot, filePath } = payload;
  ensureInsideProject(projectRoot, filePath);
  createBackup(projectRoot, filePath);
  fs.rmSync(filePath, { recursive: true, force: true });
  return { ok: true };
});

ipcMain.handle('file:openExternal', async (_event, filePath) => {
  return shell.openPath(filePath);
});


ipcMain.handle('source:fetchUrl', async (_event, rawUrl) => {
  try {
    const url = new URL(String(rawUrl));
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { ok: false, url: String(rawUrl), error: 'Protocolo não permitido.' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NemotronDesktop/1.0',
        'Accept': 'text/html,text/plain,application/json;q=0.8,*/*;q=0.5'
      }
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { ok: false, url: url.toString(), error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();
    const title = contentType.includes('html') ? extractTitle(raw, url.hostname) : url.hostname;
    const text = contentType.includes('html') ? stripHtmlToText(raw) : raw.replace(/\s+/g, ' ').trim();
    return { ok: true, url: url.toString(), title, text: text.slice(0, 60000) };
  } catch (error) {
    return { ok: false, url: String(rawUrl), error: String(error) };
  }
});

ipcMain.handle('terminal:run', async (_event, payload) => {
  const { id, command, cwd } = payload;
  if (!command || !cwd) throw new Error('Comando ou pasta não informado.');

  const dangerous = /(rm\s+-rf|format\s|shutdown|del\s+\/s|Remove-Item\s+-Recurse|rd\s+\/s)/i;
  if (dangerous.test(command)) {
    throw new Error('Comando bloqueado por segurança. Execute manualmente se tiver certeza.');
  }

  const child = spawn(command, {
    cwd,
    shell: true,
    env: process.env
  });

  runningCommands.set(id, child);

  child.stdout.on('data', (data) => {
    mainWindow?.webContents.send('terminal:data', { id, type: 'stdout', data: data.toString() });
  });

  child.stderr.on('data', (data) => {
    mainWindow?.webContents.send('terminal:data', { id, type: 'stderr', data: data.toString() });
  });

  child.on('close', (code) => {
    runningCommands.delete(id);
    mainWindow?.webContents.send('terminal:data', { id, type: 'exit', data: `\n[processo finalizado com código ${code}]\n` });
  });

  return { ok: true };
});

ipcMain.handle('terminal:stop', async (_event, id) => {
  const child = runningCommands.get(id);
  if (child) {
    child.kill();
    runningCommands.delete(id);
  }
  return { ok: true };
});
