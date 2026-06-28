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

## Cấu hình URL

Mặc định trỏ đến `https://app.picklefund.uk`.
Để dùng local Docker: set env `PICKLEFUND_URL=http://localhost` trước khi chạy.

## Icon

Đặt icon files vào `desktop/assets/`:
- `icon.ico` — Windows (256×256)
- `icon.icns` — macOS
- `icon.png` — Linux (512×512)
