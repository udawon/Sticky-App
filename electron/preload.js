const { contextBridge, ipcRenderer } = require("electron");

// 렌더러(웹앱)에서 사용할 Electron API 노출
contextBridge.exposeInMainWorld("electronAPI", {
  // 창 최소화
  minimize: () => ipcRenderer.send("window-minimize"),
  // 창을 트레이로 숨기기 (종료 아님)
  hide: () => ipcRenderer.send("window-hide"),
  // Electron 환경 여부 확인
  isElectron: true,
  // 트레이 알람 뱃지 제어 (count > 0: 뱃지 on, 0: off)
  setBadge: (count) => ipcRenderer.send("set-badge", count),
});
