const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  catalog: () => ipcRenderer.invoke('catalog'),
  current: () => ipcRenderer.invoke('current'),
  apply: (spec) => ipcRenderer.invoke('apply', spec),
  setSize: (size) => ipcRenderer.invoke('size', size),
  restorePrevious: () => ipcRenderer.invoke('restore-previous'),
  restoreDefault: () => ipcRenderer.invoke('restore-default'),
  exportInf: (spec) => ipcRenderer.invoke('export-inf', spec),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  loadState: () => ipcRenderer.invoke('state-load'),
  saveState: (st) => ipcRenderer.invoke('state-save', st),
  platform: process.platform,
});
