const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const AutoLaunch = require("electron-auto-launch");

// 단일 인스턴스 잠금 (중복 실행 방지)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// 네이티브 메뉴바 완전 제거
Menu.setApplicationMenu(null);

let mainWindow = null;
let tray = null;
let nextServer = null;
let trayIconNormal = null;  // 기본 트레이 아이콘 (NativeImage 캐시)
let trayIconBadge = null;   // 알람 뱃지 트레이 아이콘 (NativeImage 캐시)
const PORT = 3333;

// ─────────────────────────────────────────────
// Next.js 서버 실행 (프로덕션 모드)
// ─────────────────────────────────────────────
function startNextServer() {
  if (process.env.ELECTRON_DEV === "1") return;

  const serverPath = path.join(__dirname, "../.next/standalone/server.js");

  nextServer = spawn("node", [serverPath], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      NEXT_PUBLIC_BASE_PATH: "",
    },
    cwd: path.join(__dirname, ".."),
  });

  nextServer.stdout.on("data", (data) => console.log(`[Next.js] ${data}`));
  nextServer.stderr.on("data", (data) => console.error(`[Next.js 오류] ${data}`));
  nextServer.on("close", (code) => console.log(`[Next.js] 서버 종료 (코드: ${code})`));
}

// ─────────────────────────────────────────────
// BrowserWindow 생성 (프레임리스)
// ─────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 560,
    resizable: false,
    // 네이티브 프레임(타이틀바 + 메뉴바) 제거 → 앱 자체 UI로 대체
    frame: false,
    skipTaskbar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // 렌더러에 Electron API 주입
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../public/icon.ico"),
    // Windows 11 기본 둥근 모서리 유지
    roundedCorners: true,
  });

  // 창 닫기(숨기기) → 트레이로
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // 외부 링크 → 기본 브라우저
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
}

// ─────────────────────────────────────────────
// IPC 핸들러 — 웹앱에서 창 제어
// ─────────────────────────────────────────────
ipcMain.on("window-minimize", () => mainWindow?.minimize());
ipcMain.on("window-hide", () => mainWindow?.hide());

// ─────────────────────────────────────────────
// IPC 핸들러 — 알람 뱃지 제어
// count > 0: 뱃지 아이콘으로 교체 + 툴팁에 건수 표시
// count = 0: 기본 아이콘 복귀
// ─────────────────────────────────────────────
ipcMain.on("set-badge", (_, count) => {
  if (!tray) return;
  if (count > 0) {
    tray.setImage(trayIconBadge);
    tray.setToolTip(`Sticky — 읽지 않은 알림 ${count}건`);
  } else {
    tray.setImage(trayIconNormal);
    tray.setToolTip("Sticky — 팀 메모 & 과제 관리");
  }
});

// ─────────────────────────────────────────────
// 시스템 트레이 설정
// ─────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, "../public/icon.ico");
  const badgePath = path.join(__dirname, "../public/icon-badge.ico");

  // 기본 아이콘 로드
  try {
    trayIconNormal = nativeImage.createFromPath(iconPath);
    if (trayIconNormal.isEmpty()) throw new Error("아이콘 비어있음");
  } catch {
    trayIconNormal = nativeImage.createEmpty();
  }

  // 뱃지 아이콘 로드 (없으면 기본 아이콘으로 폴백)
  try {
    trayIconBadge = nativeImage.createFromPath(badgePath);
    if (trayIconBadge.isEmpty()) throw new Error("뱃지 아이콘 비어있음");
  } catch {
    trayIconBadge = trayIconNormal;
  }

  tray = new Tray(trayIconNormal);
  tray.setToolTip("Sticky — 팀 메모 & 과제 관리");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Sticky 열기",
      click: () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
      },
    },
    { type: "separator" },
    {
      label: "종료",
      click: () => { app.isQuitting = true; app.quit(); },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // 좌클릭 → 창 토글
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─────────────────────────────────────────────
// Windows 자동 시작 설정
// ─────────────────────────────────────────────
function setupAutoLaunch() {
  if (process.env.ELECTRON_DEV === "1") return;

  const stickyAutoLaunch = new AutoLaunch({
    name: "Sticky",
    path: app.getPath("exe"),
  });

  stickyAutoLaunch.isEnabled().then((isEnabled) => {
    if (!isEnabled) {
      stickyAutoLaunch.enable();
      console.log("[AutoLaunch] Windows 시작 시 자동 실행 등록됨");
    }
  });
}

// ─────────────────────────────────────────────
// 두 번째 인스턴스 → 기존 창 포커스
// ─────────────────────────────────────────────
app.on("second-instance", () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// ─────────────────────────────────────────────
// 앱 초기화
// ─────────────────────────────────────────────
app.whenReady().then(async () => {
  startNextServer();

  if (process.env.ELECTRON_DEV !== "1") {
    await waitForServer(`http://localhost:${PORT}`, 10000);
  }

  createWindow();
  createTray();
  setupAutoLaunch();
});

// ─────────────────────────────────────────────
// 서버 준비 대기 헬퍼
// ─────────────────────────────────────────────
async function waitForServer(url, timeout) {
  const http = require("http");
  const start = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(url, () => resolve(true));
      req.on("error", () => {
        if (Date.now() - start < timeout) setTimeout(check, 500);
        else { console.warn("[waitForServer] 시간 초과, 강제 진행"); resolve(false); }
      });
      req.setTimeout(1000, () => {
        req.destroy();
        if (Date.now() - start < timeout) setTimeout(check, 500);
        else resolve(false);
      });
    };
    check();
  });
}

app.on("window-all-closed", () => {});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (nextServer) { nextServer.kill(); nextServer = null; }
});
