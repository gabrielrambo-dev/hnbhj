const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nemotron', {
  selectProjectFolder: () => ipcRenderer.invoke('dialog:selectProjectFolder'),
  scanProject: (projectPath) => ipcRenderer.invoke('project:scan', projectPath),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (payload) => ipcRenderer.invoke('file:write', payload),
  createFile: (payload) => ipcRenderer.invoke('file:create', payload),
  deleteFile: (payload) => ipcRenderer.invoke('file:delete', payload),
  openExternal: (filePath) => ipcRenderer.invoke('file:openExternal', filePath),
  fetchUrl: (url) => ipcRenderer.invoke('source:fetchUrl', url),
  runCommand: (payload) => ipcRenderer.invoke('terminal:run', payload),
  stopCommand: (id) => ipcRenderer.invoke('terminal:stop', id),
  onTerminalData: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('terminal:data', listener);
    return () => ipcRenderer.removeListener('terminal:data', listener);
  }
});
