# PickleFund Desktop — Đóng gói thương mại (EPIC12)

Ứng dụng Electron mỏng, nạp web production `https://app.picklefund.uk` (ghi đè bằng
`PICKLEFUND_URL`). Kế thừa mọi tính năng web (AI Manager, Workflows, branding, PWA…).

## Kiến trúc & bảo mật
- `main.js`: `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`; link
  ngoài mở bằng trình duyệt hệ thống; menu tối giản + **Giới thiệu** (hiển thị version + URL).
- Cửa sổ tiêu đề `PickleFund v<version>` (khi web nạp xong, title do trang web đặt theo branding).
- Version lấy từ `package.json` (`app.getVersion()`) — hiện **2.1.0**.

## Build
```bash
cd desktop
npm install            # nếu chưa có node_modules (electron + electron-builder)

# Windows: NSIS installer + portable exe
npm run build:win      # → dist-electron/  (PickleFund Setup <ver>.exe, PickleFund-Portable-<ver>.exe)

# Đóng gói nhanh (folder chạy được, không cần installer)
npm run package:win    # → dist-packager/PickleFund-win32-x64/PickleFund.exe

# macOS (.dmg) / Linux (.AppImage)
npm run build:mac      # CẦN assets/icon.icns (hiện CHƯA có)
npm run build:linux
```

## Signing readiness (chưa có chứng chỉ trả phí)
Build hiện tại **KHÔNG ký số** → Windows SmartScreen/Defender có thể cảnh báo
"Unknown publisher"; macSẽ chặn Gatekeeper. Khi có chứng chỉ, cấu hình qua **biến
môi trường** (KHÔNG commit chứng chỉ/mật khẩu):

- Windows (electron-builder tự nhận): `CSC_LINK` (đường dẫn/base64 file .pfx),
  `CSC_KEY_PASSWORD`.
- macOS: `CSC_LINK` + `CSC_KEY_PASSWORD`, notarize: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.

Không cần sửa code — electron-builder đọc các biến này khi build.

## Auto-update plan (chưa bật — cần signing + release feed)
Kế hoạch dùng `electron-updater` + provider GitHub Releases:
1. Thêm dependency `electron-updater`; trong `main.js` gọi `autoUpdater.checkForUpdatesAndNotify()` sau `whenReady`.
2. Thêm `publish: { provider: 'github', owner: 'tunglt6-spec', repo: 'picklefund' }` vào `build`.
3. `electron-builder --publish always` để đẩy artifact + `latest.yml` lên GitHub Releases.
**Điều kiện tiên quyết**: build phải **được ký số** (auto-update không an toàn/không chạy ổn nếu unsigned). ⇒ **DEFERRED** tới khi có chứng chỉ. Trong lúc chờ: phát hành thủ công (tải installer mới từ Releases).

## Known limitations
- Chưa ký số → cảnh báo publisher khi cài (đến khi có chứng chỉ).
- `assets/icon.icns` chưa có → build macOS sẽ thiếu icon (tạo từ icon.png khi cần).
- Auto-update chưa wire (cần signing + publish config).
- Build/launch GUI không kiểm được trong môi trường headless CI/agent → xác minh trên máy có màn hình.
