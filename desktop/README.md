# PickleFund Desktop (Electron Wrapper)

App desktop trỏ đến app web production. Không chứa code business logic.

## Setup

```bash
cd desktop
npm install
```

## Chạy thử

```bash
npm start
```

## Build Windows Installer

Yêu cầu:
- Node.js 20+
- Windows (hoặc Wine trên Linux/Mac)
- Icon file: `assets/icon.ico` (256×256 ICO)

```bash
npm run build:win
```

Output: `dist-electron/PickleFund Setup 2.0.0.exe`

> **Nếu `build:win` bị Windows Defender block** (NSIS bị quarantine), dùng `package:win` thay thế:
>
> ```bash
> npm run package:win
> ```
>
> Output: `dist-packager/PickleFund-win32-x64/` — nén thư mục này thành ZIP để phát hành.  
> Đây là cách tạo ra `PickleFund-v2.0.0-win32-x64.zip` trong RC1.

## Cấu hình URL

Mặc định trỏ đến `https://app.picklefund.uk`.
Để dùng local Docker: set env `PICKLEFUND_URL=http://localhost` trước khi chạy.

## Icon

Đặt icon files vào `desktop/assets/`:
- `icon.ico` — Windows (256×256)
- `icon.icns` — macOS
- `icon.png` — Linux (512×512)
