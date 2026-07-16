import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  onUpdateDownloaded: (callback: (info: { currentVersion: string; latestVersion: string; downloadUrl?: string }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on("update-downloaded", subscription);
    return () => {
      ipcRenderer.removeListener("update-downloaded", subscription);
    };
  },
  restartAndInstall: () => {
    ipcRenderer.send("restart-app");
  }
});
