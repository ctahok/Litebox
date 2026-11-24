# LiteBox - Product Specification & Phased Vibe-Coding Blueprint

> **Instructions for AI Coding Agent:**
> Read this entire specification before writing any code. Execute strictly **one sub-phase at a time** in order (starting at Phase 1, Sub-Phase 1.1). After finishing each sub-phase, run all verification commands (`npm run typecheck`, `npm test`, and manual/automated acceptance checks listed in that sub-phase), report what was built and verified, and wait for user approval before moving to the next sub-phase.

---

## 1. Engineering Guardrails (Non-Negotiable Rules)

1. **Modern View API Only:** Always use Electron `WebContentsView`. Never use deprecated `BrowserView` or `<webview>`.
2. **Shared Session Model:** All embedded web services share one persistent session partition: `persist:shared-apps`, strictly governed by the global proxy state.
3. **Zero Local DNS Leaks:** Always enforce `--host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE 127.0.0.1"` and `--disable-features=AsyncDns` before `app.whenReady()`. Route all session traffic through the embedded local loopback relay (`src/main/proxyRelay.ts`). Never resolve target hostnames locally when proxy or SSH tunnel mode is enabled.
4. **Fail-Closed Kill Switch:** Never fall back from `PROXY_ACTIVE` (standard proxy or SSH tunnel) to `DIRECT` on upstream error, SSH disconnect, port conflict, host-key mismatch, timeout, or DPAPI decryption failure. Lock into `KILL_SWITCH_LOCKED` and sever all open sockets immediately.
5. **Prevent Native Modal Occlusion:** Because `WebContentsView` renders above the React DOM layer, whenever any React modal or drawer opens, call `window.liteboxApi.setOverlayOpen(true)` so the main process detaches the active `WebContentsView` and restores it when `setOverlayOpen(false)` is called.
6. **Zero Plaintext Secrets:** Never write proxy passwords, SSH passwords, SSH private keys, or key passphrases in plaintext to `config.json` or logs. Always encrypt with Electron `safeStorage` (Windows DPAPI).
7. **True Portable Mode:** When `isPortable === true`, store 100% of app data inside `./LiteBox-Data` beside the executable. Never write to `%APPDATA%` or Windows Registry (`HKCU\...\Run`).
8. **Pure JS SSH Stack:** Use `ssh2` in the Electron main process (configured without mandatory native C++ compilation) so Windows builds work reliably locally and in GitHub Actions without requiring `ssh.exe` or PuTTY on the user's machine.

---

## 2. Product Overview & Core Architecture

**LiteBox** is a lightweight, privacy-focused Windows desktop wrapper (trimmed-down Rambox alternative) for **WhatsApp Web**, **Telegram Web**, and custom web applications. It ships as both a standard **NSIS Windows installer** and a **true portable `.exe`**.

### Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime** | Electron (33+ / latest stable), Node 22 LTS | Reliable `WebContentsView`, native Windows DPAPI (`safeStorage`), full WhatsApp/Telegram compatibility. |
| **Shell UI** | React 18+, Vite (`electron-vite`), Tailwind CSS, TypeScript, `lucide-react` | Fast iteration, clean compact icon rail, dark/light/system themes. |
| **Web Embedding** | `WebContentsView` on `persist:shared-apps` | Clean memory release on tab hibernation, stable focus, unified global proxy control. |
| **Proxy Relay** | Embedded Node.js HTTP/CONNECT loopback server (`127.0.0.1:0`) + `socks` | Solves Chromium's lack of native SOCKS5 auth, enables instant ON/OFF switching without restart, enforces remote DNS and kill switch. |
| **SSH Tunnel Engine** | Embedded `ssh2` client + RFC 1928 local SOCKS5 listener on custom port (`127.0.0.1:<customPort>`) | Builds dynamic SSH tunnels (`ssh -D` equivalent) from saved custom SSH hosts (with optional Jump Host / ProxyJump) directly into a local SOCKS5 proxy on any user-chosen port. |
| **Packaging & CI** | `electron-builder` + GitHub Actions (`windows-latest`) | Automated `LiteBox-Setup-x.y.z.exe` (NSIS) and `LiteBox-Portable-x.y.z.exe` releases. |

### Traffic Routing, SSH Tunnel & Leak-Prevention Flow

```text
[WebContentsView (persist:shared-apps)]
   |  (Chromium DNS locked via --host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE 127.0.0.1")
   |  (WebRTC default: disable_non_proxied_udp)
   v
[Local Loopback Relay: 127.0.0.1:<ephemeralPort>]  (src/main/proxyRelay.ts)
   |
   +--> Mode: DIRECT              --> Direct Node net.connect
   +--> Mode: KILL_SWITCH_LOCKED  --> Immediate HTTP 503 + destroy socket (zero fallback)
   +--> Mode: PROXY_ACTIVE
          |
          +--> Upstream: SOCKS5 / SOCKS4a / HTTP / HTTPS (with optional auth, remote DNS)
          |
          +--> Upstream: SSH Tunnel Profile
                 |
                 v
               [Local RFC 1928 SOCKS5 Server: 127.0.0.1:<customPort>] (src/main/sshTunnelManager.ts)
                 |  (Accepts ATYP 0x03 domain strings; never resolves locally)
                 v
               [Optional Jump Host (ssh2 forwardOut)] --> [Target SSH Host (ssh2 direct-tcpip)]
                 |
                 v
               Remote SSH Server resolves DNS & connects to destination
```

### Portable vs. Installed Storage Resolution

Executed synchronously at startup **before** `app.whenReady()`:

1. If `process.env.PORTABLE_EXECUTABLE_DIR` is defined (injected automatically by `electron-builder` portable `.exe`):
   * `isPortable = true`
   * `userData = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'LiteBox-Data')`
2. Else if `portable.flag` exists next to `process.execPath` (or `process.cwd()` when `!app.isPackaged`):
   * `isPortable = true`
   * `userData = path.join(baseDir, 'LiteBox-Data')`
3. Else:
   * `isPortable = false`
   * Use default Electron `%APPDATA%\LiteBox`.

---

## 3. Repository Structure & `config.json` Schema

### Target Directory Layout

```text
litebox/
├── .github/workflows/build-windows.yml
├── build/
│   ├── icon.ico
│   └── icon.png
├── src/
│   ├── main/
│   │   ├── index.ts                # Boot sequence, Chromium flags, app lifecycle
│   │   ├── paths.ts                # Portable vs. installed userData resolver
│   │   ├── configStore.ts          # Atomic JSON config read/write + recovery
│   │   ├── cryptoStore.ts          # Windows DPAPI safeStorage wrapper
│   │   ├── proxyRelay.ts           # Embedded local HTTP/CONNECT loopback relay
│   │   ├── sshTunnelManager.ts     # ssh2 client, jump host, TOFU, custom-port SOCKS5 server
│   │   ├── proxyManager.ts         # Coordinates proxyRelay, sshTunnelManager & shared session
│   │   ├── proxyTester.ts          # Out-of-band proxy & SSH tunnel latency/exit-IP tester
│   │   ├── viewManager.ts          # WebContentsView lifecycle, UA, bounds, hibernation, badges
│   │   ├── trayManager.ts          # System tray icon, tooltip, context menu
│   │   └── ipcHandlers.ts          # Strictly typed IPC handler allowlist
│   ├── preload/
│   │   ├── shellPreload.ts         # contextBridge API for React shell
│   │   └── servicePreload.ts       # Lightweight web view preload (notification click-to-focus)
│   ├── renderer/
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── Sidebar.tsx
│   │       ├── ProxyStatusPill.tsx
│   │       ├── AddServiceModal.tsx
│   │       ├── ProxyManagerModal.tsx
│   │       ├── SshHostModal.tsx
│   │       ├── HostKeyPromptModal.tsx
│   │       ├── SettingsModal.tsx
│   │       └── KillSwitchOverlay.tsx
│   └── shared/
│       └── types.ts                # Shared interfaces & IPC channel constants
├── tests/
│   ├── configStore.test.ts
│   ├── proxyRelay.test.ts
│   └── sshTunnelManager.test.ts
├── electron-builder.yml
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

### `config.json` Schema (`src/shared/types.ts`)

```json
{
  "version": 1,
  "theme": "system",
  "window": {
    "width": 1280,
    "height": 840,
    "minimizeToTray": true,
    "closeToTray": true,
    "launchOnStartup": false
  },
  "hibernation": {
    "enabled": true,
    "timeoutMinutes": 30
  },
  "privacy": {
    "blockWebRtcNonProxiedUdp": true
  },
  "proxy": {
    "enabled": false,
    "activeProfileId": null,
    "profiles": [
      {
        "id": "uuid-proxy-1",
        "name": "Frankfurt SOCKS5",
        "type": "standard",
        "protocol": "socks5",
        "host": "proxy.example.com",
        "port": 1080,
        "username": "user1",
        "encryptedPasswordB64": "AQAAANCMnd8BFd...",
        "requiresReauth": false
      },
      {
        "id": "uuid-tunnel-1",
        "name": "My VPS Tunnel (SOCKS5 :10808)",
        "type": "ssh_tunnel",
        "sshHostId": "uuid-ssh-1",
        "localSocksHost": "127.0.0.1",
        "localSocksPort": 10808,
        "autoReconnect": true
      }
    ],
    "sshHosts": [
      {
        "id": "uuid-ssh-1",
        "name": "Hetzner Frankfurt VPS",
        "host": "203.0.113.10",
        "port": 22,
        "username": "tunneluser",
        "authType": "privateKey",
        "encryptedPasswordB64": null,
        "keySource": "inline",
        "encryptedPrivateKeyB64": "AQAAANCMnd8BFd...",
        "privateKeyPath": null,
        "encryptedPassphraseB64": null,
        "jumpHostId": null,
        "knownHostFingerprint": "SHA256:abcdef123456...",
        "keepaliveIntervalSec": 15,
        "requiresReauth": false
      }
    ]
  },
  "services": [
    {
      "id": "uuid-whatsapp",
      "name": "WhatsApp",
      "preset": "whatsapp",
      "url": "[https://web.whatsapp.com](https://web.whatsapp.com)",
      "muted": false,
      "hibernated": false,
      "order": 0
    },
    {
      "id": "uuid-telegram",
      "name": "Telegram",
      "preset": "telegram",
      "url": "[https://web.telegram.org/k/](https://web.telegram.org/k/)",
      "muted": false,
      "hibernated": false,
      "order": 1
    }
  ]
}
```

---

## 4. Phased Implementation Plan

---

### Phase 1: Project Scaffolding, Dual Storage & Clean Shell

#### Sub-Phase 1.1: Universal Electron + Vite + React + Tailwind Bootstrap
* **Deliverables:** `package.json`, `tsconfig.json`, `electron.vite.config.ts`, `tailwind.config.js`, `src/shared/types.ts`, `src/main/index.ts`, `src/preload/shellPreload.ts`, `src/renderer/App.tsx`.
* **Implementation Requirements:**
  1. Initialize `LiteBox` with `electron-vite`, Electron (latest stable), TypeScript, React 18+, Tailwind CSS, and `lucide-react`.
  2. Enforce `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` on the shell window.
  3. Define complete TypeScript interfaces in `src/shared/types.ts` for `AppConfig`, `ServiceTab`, `StandardProxyProfile`, `SshTunnelProfile`, `SshHostConfig`, `ProxyStatus`, `TunnelState`, and typed IPC channels.
  4. Keep `package.json` scripts cross-platform (`dev`, `build`, `typecheck`, `lint`, `test`).
  5. Render a placeholder shell window (`1280x840`, min `900x600`) displaying Electron, Chromium, and Node versions retrieved through `window.liteboxApi`.
* **Acceptance Tests:**
  * `npm run typecheck` passes with 0 errors.
  * `npm run dev` launches cleanly with 0 console errors.
  * `window.require` is `undefined` inside renderer DevTools.

#### Sub-Phase 1.2: Portable vs. Installed Path Resolver & Atomic Config Store
* **Deliverables:** `src/main/paths.ts`, `src/main/configStore.ts`, `src/main/index.ts`.
* **Implementation Requirements:**
  1. In `src/main/paths.ts`, detect portable mode synchronously **before** `app.whenReady()` via `process.env.PORTABLE_EXECUTABLE_DIR` or presence of `portable.flag`, and call `app.setPath('userData', resolvedPath)`.
  2. In `src/main/configStore.ts`, implement atomic writes (`config.json.tmp` then `fs.renameSync`), schema validation, and corruption recovery (rename corrupt JSON to `config.json.corrupt` and restore defaults).
  3. Pre-populate WhatsApp Web and Telegram Web on first launch, `theme: 'system'`, `hibernation: { enabled: true, timeoutMinutes: 30 }`, `blockWebRtcNonProxiedUdp: true`, empty `profiles` and `sshHosts` arrays.
  4. Expose `getConfig`, `updateConfig`, and `getRuntimeInfo` (`isPortable`, `dataPath`) via typed IPC.
* **Acceptance Tests:**
  * Creating `portable.flag` in project root and running `npm run dev` creates `./LiteBox-Data/config.json` and reports `isPortable: true`.
  * Deleting `portable.flag` switches to default OS AppData and reports `isPortable: false`.
  * Corrupting `config.json` backs it up to `config.json.corrupt` and boots without crashing.

#### Sub-Phase 1.3: Base Shell UI (Rambox-Style Rail, Theme Toggle & Overlay Protocol)
* **Deliverables:** `src/renderer/App.tsx`, `src/renderer/components/Sidebar.tsx`, `src/renderer/components/ProxyStatusPill.tsx`, `src/renderer/components/SettingsModal.tsx`.
* **Implementation Requirements:**
  1. Fixed `68px`-wide left vertical icon rail plus full-bleed right viewport for `WebContentsView`.
  2. Left rail top-to-bottom:
     * `ProxyStatusPill` showing routing state (Gray = Direct, Green = Proxy/SSH Tunnel Active, Amber = SSH Connecting/Reconnecting, Red = Kill Switch Locked).
     * Scrollable list of service icons with active bar, unread badge pill, muted indicator, and sleeping moon overlay.
     * `+` Add Service button.
     * Bottom pinned buttons: Proxy & SSH Tunnels icon, Settings gear icon.
  3. Sync Dark / Light / System theme with Electron `nativeTheme.themeSource` via IPC and Tailwind dark mode classes.
  4. Enforce the overlay protocol: opening/closing any modal invokes `window.liteboxApi.setOverlayOpen(true/false)`.
* **Acceptance Tests:**
  * Dark, Light, and System themes apply instantly to both the rail and native window frame and persist across restarts.
  * Opening/closing Settings toggles `ui:set-overlay-open` cleanly (including Escape key close).
  * Window resizes cleanly down to `900x600` with zero clipping.

---

### Phase 2: Web Service Engine (`WebContentsView`) & Tab Controls

#### Sub-Phase 2.1: Shared Session, Clean Chrome User-Agent & Presets
* **Deliverables:** `src/main/viewManager.ts`, `src/renderer/components/AddServiceModal.tsx`.
* **Implementation Requirements:**
  1. Use a single shared persistent session: `session.fromPartition('persist:shared-apps')`.
  2. Strip `Electron/x.y.z` and `LiteBox/x.y.z` from `session.getUserAgent()` and apply this clean Chrome User-Agent globally so WhatsApp Web never displays an outdated-browser block.
  3. Maintain `Map<serviceId, { view: WebContentsView | null, lastActiveAt: number, unreadCount: number }>`.
  4. Attach active `WebContentsView` to `mainWindow.contentView` at `{ x: 68, y: 0, width: contentWidth - 68, height: contentHeight }`, updating on resize/maximize/unmaximize.
  5. Honor `ui:set-overlay-open`: detach active view on `true`, re-attach and re-sync bounds on `false`.
  6. Build `AddServiceModal.tsx` with presets:
     * WhatsApp Web (`https://web.whatsapp.com`)
     * Telegram Web K (`https://web.telegram.org/k/`)
     * Telegram Web A (`https://web.telegram.org/a/`)
     * Custom Web App (display name + validated `http:`/`https:` URL + favicon fallback).
* **Acceptance Tests:**
  * WhatsApp Web loads its QR screen cleanly (no "Update Chrome" warning) and Telegram Web loads normally.
  * Adding a custom URL creates a rail icon and renders in the viewport.
  * Opening Settings hides the active web view so the modal is fully interactive; closing Settings restores exact page state without reload.
  * Logins persist across app restarts.

#### Sub-Phase 2.2: Drag-to-Reorder, Right-Click Tab Menu & Tab Hibernation
* **Deliverables:** `src/renderer/components/Sidebar.tsx`, `src/main/viewManager.ts`, `src/main/ipcHandlers.ts`.
* **Implementation Requirements:**
  1. Vertical drag-to-reorder on rail icons, persisted immediately to `config.json`.
  2. Native Electron right-click context menu on each tab:
     * Reload tab
     * Hibernate now / Wake tab
     * Mute audio / Unmute audio (persisted via `webContents.setAudioMuted`)
     * Clear site cache for this service origin + reload
     * Edit name/URL
     * Remove service (with confirmation)
  3. Tab hibernation:
     * Destroys `WebContentsView` (`view.webContents.close()`) to release Chromium RAM while keeping the icon dimmed with a moon badge.
     * Clicking a hibernated tab recreates the view on demand with preserved session cookies.
     * 60-second background timer auto-hibernates inactive tabs exceeding `timeoutMinutes` (never hibernates active visible tab).
  4. Add hibernation settings (enable toggle + timeout selector: `10`, `15`, `30`, `60`, `120` min) in `SettingsModal.tsx`.
* **Acceptance Tests:**
  * Dragging Telegram above WhatsApp persists after restart.
  * Manual hibernation lowers Electron RAM in Task Manager; clicking wakes the tab still logged in.
  * Muting silences tab audio and shows a muted indicator.

---

### Phase 3: Loopback Proxy Relay, SSH-to-SOCKS5 Tunnel Engine & Leak Protection

#### Sub-Phase 3.1: Embedded Local Loopback Relay (SOCKS4a, SOCKS5, HTTP, HTTPS + Auth)
* **Deliverables:** `src/main/proxyRelay.ts`.
* **Dependencies:** `socks`.
* **Implementation Requirements:**
  1. Start an HTTP/CONNECT proxy server strictly on `127.0.0.1` with ephemeral port `0` (`server.listen(0, '127.0.0.1')`).
  2. Support explicit states: `'DIRECT'`, `'PROXY_ACTIVE'`, and `'KILL_SWITCH_LOCKED'`.
  3. Handle HTTP proxy requests and HTTPS/WebSocket `CONNECT host:port` tunnels:
     * `DIRECT`: `net.connect` directly to target.
     * `PROXY_ACTIVE`:
       * `socks5`: Use `socks` (`type: 5`) passing raw hostname string (forces `ATYP 0x03` remote DNS) + optional username/password.
       * `socks4`: Use `socks` (`type: 4`) passing raw hostname string (SOCKS4a remote DNS) + optional userId; fail closed if upstream rejects SOCKS4a (never resolve DNS locally).
       * `http` / `https`: Connect TCP (or TLS for `https`) to upstream proxy, send `CONNECT targetHost:targetPort HTTP/1.1` with `Proxy-Authorization: Basic ...` when credentials exist, verify HTTP `200`, then pipe sockets.
     * `KILL_SWITCH_LOCKED`: Immediately return `HTTP/1.1 503 Service Unavailable` and destroy sockets.
  4. Track all open client/upstream sockets in a `Set` and implement `closeAllSockets()` to kill live tunnels instantaneously on state transitions.
  5. Handle all socket `error`, `timeout`, and `close` events cleanly so unhandled errors never crash the main process.
* **Acceptance Tests:**
  * Relay binds strictly to `127.0.0.1:<port>`.
  * `curl -x http://127.0.0.1:<port> https://api.ipify.org` returns local IP in `DIRECT`, proxy IP in `PROXY_ACTIVE` (tested with SOCKS5+auth and HTTP+auth), and `503` in `KILL_SWITCH_LOCKED`.

#### Sub-Phase 3.2: Windows DPAPI Credential Encryption & Cross-PC Recovery
* **Deliverables:** `src/main/cryptoStore.ts`.
* **Implementation Requirements:**
  1. `encryptSecret(plainText: string)` uses `safeStorage.encryptString(plainText)` and returns base64.
  2. `decryptSecret(b64: string)` wraps `safeStorage.decryptString(Buffer.from(b64, 'base64'))` in `try/catch`; on failure (e.g., Portable folder copied to another PC/Windows user), returns `{ ok: false, reason: 'DPAPI_MISMATCH' }` instead of throwing.
  3. Supports encrypting all secret fields: standard proxy passwords, SSH passwords, inline SSH private keys, and SSH private key passphrases.
  4. Never transmit decrypted secrets to the renderer over IPC; only expose `{ hasPassword, hasInlineKey, hasPassphrase, requiresReauth }`.
* **Acceptance Tests:**
  * Saving proxy passwords, SSH passwords, or pasted SSH private keys stores only base64 DPAPI blobs in `config.json` (zero plaintext substrings on disk).
  * Corrupting an encrypted blob sets `requiresReauth: true` without crashing and locks the kill switch if that profile is active.

#### Sub-Phase 3.3: Custom SSH Hosts & Local SOCKS5 Tunnel Builder (`ssh2` + Custom Port)
* **Deliverables:** `src/main/sshTunnelManager.ts`.
* **Dependencies:** `ssh2` (install without mandatory native addons; ensure `electron.vite.config.ts` externalizes `ssh2` cleanly for the main process bundle).
* **Implementation Requirements:**
  1. Build a self-contained RFC 1928 SOCKS5 TCP server in `src/main/sshTunnelManager.ts` bound strictly to `127.0.0.1:<localSocksPort>` (user-configurable custom port `1024-65535`, default `10808`):
     * Support SOCKS5 version `0x05`, `NO AUTH` (`0x00`), and `CONNECT` (`0x01`).
     * Parse `ATYP 0x01` (IPv4), `ATYP 0x03` (Domain Name string - critical for remote DNS), and `ATYP 0x04` (IPv6).
     * Reject `BIND` and `UDP ASSOCIATE` with reply code `0x07` (Command not supported).
     * For every `CONNECT`, open an SSH `direct-tcpip` channel via `activeSshClient.forwardOut('127.0.0.1', socket.remotePort || 0, dstHost, dstPort, cb)` and pipe `socket <-> stream` bidirectionally.
     * Track all active SOCKS5 sockets and SSH channels in a `Set` for immediate teardown.
  2. SSH Client & Auth Management:
     * Support `password` auth and `privateKey` auth (accepting either a DPAPI-encrypted inline key pasted/imported into config for true portability, or a local private key file path, plus optional encrypted passphrase).
     * Support optional **Jump Host (ProxyJump)** (`jumpHostId` referencing another saved `SshHostConfig`): connect to jump host first, call `jumpClient.forwardOut` to the target SSH host:port, and connect target `ssh2.Client` over `{ sock: stream }`. Detect and reject circular jump chains.
  3. Host Key Verification (TOFU - Trust On First Use):
     * Use `hostHash: 'sha256'` and `hostVerifier` on every SSH connection (including jump host).
     * If `knownHostFingerprint` is `null`: pause/reject with structured `HOST_KEY_UNKNOWN` payload containing `{ sshHostId, host, port, fingerprint }` so the UI prompts the user to trust and save it.
     * If `knownHostFingerprint` exists and differs: reject immediately with `HOST_KEY_MISMATCH` (possible MITM) and keep kill switch locked.
  4. Keepalive, Port-Conflict & Auto-Reconnect Handling:
     * Enable `keepaliveInterval: keepaliveIntervalSec * 1000` and `keepaliveCountMax: 3`.
     * Handle `EADDRINUSE` on `localSocksPort` cleanly with a descriptive error (`PORT_IN_USE`) and never fall back to `DIRECT`.
     * When an active SSH tunnel drops unexpectedly and `autoReconnect` is enabled, emit `TUNNEL_RECONNECTING` (keeping kill switch engaged!), retry with capped exponential backoff (`2s -> 4s -> 8s -> 15s -> 30s`), and emit `TUNNEL_READY` once re-established.
     * On `stopTunnel()` or app quit, close the local SOCKS5 listener, destroy active channels, and call `client.end()` on target and jump clients cleanly.
* **Acceptance Tests:**
  * Starting a tunnel against an SSH host spins up a real SOCKS5 proxy on `127.0.0.1:<customPort>` verifiable externally via `curl --socks5-hostname 127.0.0.1:<customPort> https://api.ipify.org` returning the SSH server's IP.
  * Connecting to a brand-new SSH host triggers `HOST_KEY_UNKNOWN` with its SHA-256 fingerprint; trusting saves it to `config.json`; altering the saved fingerprint causes `HOST_KEY_MISMATCH`.
  * Stopping the tunnel or quitting LiteBox immediately frees `<customPort>` (confirmed via `netstat -ano`).

#### Sub-Phase 3.4: Unified `proxyManager.ts`, Fail-Closed Kill Switch & WebRTC Blocking
* **Deliverables:** `src/main/proxyManager.ts`, updates to `src/main/index.ts` and `src/main/viewManager.ts`.
* **Implementation Requirements:**
  1. In `src/main/index.ts` before `app.whenReady()`, append:
     * `app.commandLine.appendSwitch('host-resolver-rules', 'MAP * ~NOTFOUND , EXCLUDE 127.0.0.1')`
     * `app.commandLine.appendSwitch('disable-features', 'AsyncDns')`
  2. In `src/main/proxyManager.ts`, coordinate `proxyRelay`, `sshTunnelManager`, and `persist:shared-apps`:
     * Always bind `persist:shared-apps` permanently to `127.0.0.1:<relayPort>` with empty `proxyBypassRules`.
     * When activating a `standard` profile: stop any running SSH tunnel, decrypt password via `cryptoStore`, configure `proxyRelay` to `PROXY_ACTIVE`, and flush connections.
     * When activating an `ssh_tunnel` profile:
       1. Immediately set `proxyRelay` to `KILL_SWITCH_LOCKED` and flush connections while SSH handshakes.
       2. Start `sshTunnelManager` for `sshHostId` on `127.0.0.1:<localSocksPort>`.
       3. Once `TUNNEL_READY` fires, configure `proxyRelay` in `PROXY_ACTIVE` targeting `socks5://127.0.0.1:<localSocksPort>`.
       4. If `TUNNEL_DROPPED`, `TUNNEL_RECONNECTING`, `HOST_KEY_MISMATCH`, `PORT_IN_USE`, or `DPAPI_MISMATCH` occurs, keep `proxyRelay` in `KILL_SWITCH_LOCKED`, call `proxyRelay.closeAllSockets()`, and call `await sharedSession.closeAllConnections()`.
     * On startup, if `config.proxy.enabled === true`, never boot in `DIRECT` mode: start directly in `KILL_SWITCH_LOCKED` until the active standard profile decrypts or SSH tunnel connects.
  3. Apply WebRTC IP handling policy (`disable_non_proxied_udp` by default; `default_public_interface_only` when user opts in via Settings) to every `WebContentsView` immediately on creation and on toggle change.
* **Acceptance Tests:**
  * With an active SSH tunnel profile, `https://browserleaks.com/ip`, `https://browserleaks.com/webrtc`, and `https://dnsleaktest.com` inside a custom tab show the SSH server's IP, zero WebRTC IP leaks, and zero local ISP DNS queries.
  * Killing the remote SSH connection drops the tab into `KILL_SWITCH_LOCKED` immediately with zero fallback to direct internet; restoring SSH automatically restores connectivity.

---

### Phase 4: Proxy & SSH Tunnel Manager UI + Live Latency Tester

#### Sub-Phase 4.1: Proxy Profiles, SSH Host Manager, Host-Key Prompt & Status Pill
* **Deliverables:** `src/renderer/components/ProxyManagerModal.tsx`, `src/renderer/components/SshHostModal.tsx`, `src/renderer/components/HostKeyPromptModal.tsx`, `src/renderer/components/ProxyStatusPill.tsx`.
* **Implementation Requirements:**
  1. `ProxyStatusPill.tsx`:
     * Clear color states: Gray (`Direct`), Green (`Proxy Active` / `SSH Tunnel :10808`), Amber (`SSH Connecting...`), Pulsing Red (`Kill Switch Locked`).
     * Hover tooltip shows active profile name, type (e.g., `SSH Tunnel -> 127.0.0.1:10808`), and error details if locked.
     * Left-click toggles Global Proxy ON/OFF; right-click or chevron opens Proxy Manager.
  2. `ProxyManagerModal.tsx` with two clean tabs:
     * **Tab 1: Proxy Profiles**
       * Master Global Proxy ON/OFF toggle + leak-protection status badges (`Remote DNS: ON`, `Kill Switch: ON`, `WebRTC UDP Block: ON/OFF`).
       * Unified list of both `Standard Proxy` profiles (SOCKS5, SOCKS4a, HTTP, HTTPS) and `SSH Tunnel` profiles (showing linked SSH host, custom local SOCKS5 address `127.0.0.1:<port>` with one-click copy button, and live tunnel state badge).
       * Add/Edit form supporting switching between:
         * **Standard Proxy:** Name, Protocol (`SOCKS5`, `SOCKS4a`, `HTTP`, `HTTPS`), Host, Custom Port (`1-65535`), optional Username & Password (blank on edit preserves existing DPAPI secret unless "Clear password" is clicked).
         * **SSH Tunnel (Local SOCKS5):** Name, SSH Host dropdown (with quick "+ Add SSH Host" button), Custom Local SOCKS5 Port (`1024-65535`, default `10808`), Auto-Reconnect toggle.
     * **Tab 2: SSH Hosts**
       * CRUD list of saved custom SSH hosts (Name, `user@host:port`, Auth type badge, Jump Host indicator, Trusted fingerprint badge with "Reset known host key" action).
       * `SshHostModal.tsx` form: Name, Host, SSH Port (default `22`), Username, Auth Method (`Password` or `Private Key`), Private Key source (`Paste / Import Key File into Encrypted Config` for true portability OR `Reference Local Key File Path`), optional Key Passphrase, optional Jump Host dropdown (excluding self to prevent loops), Keepalive interval.
  3. `HostKeyPromptModal.tsx`:
     * Triggered whenever `HOST_KEY_UNKNOWN` occurs during connect or test: displays host, port, and SHA-256 fingerprint with "Trust & Save Fingerprint" and "Cancel" buttons.
* **Acceptance Tests:**
  * User can create a custom SSH host (password or private key), attach it to an SSH Tunnel profile on custom port `10899`, trust its host key via the modal, toggle Proxy ON, and see `127.0.0.1:10899` active in the status pill.
  * Switching seamlessly between a standard SOCKS5 profile, an SSH Tunnel profile, and Direct mode updates routing and status indicators cleanly with zero restarts.

#### Sub-Phase 4.2: Live Connection, SSH Handshake, Latency & Exit IP Tester
* **Deliverables:** `src/main/proxyTester.ts`, IPC wiring, inline UI indicators.
* **Implementation Requirements:**
  1. Test either saved profiles (`standard` or `ssh_tunnel`) or unsaved form drafts without disturbing the active `proxyRelay` or live chat tabs.
  2. For `standard` profiles: connect through the upstream proxy with an 8-second timeout and fetch `https://api.ipify.org?format=json` (fallback `https://ifconfig.me/ip`).
  3. For `ssh_tunnel` profiles (or standalone SSH host test): establish a temporary isolated `ssh2` session (honoring Jump Host and TOFU verification), call `forwardOut` directly to `api.ipify.org:443`, perform HTTPS GET over the forwarded stream, measure total latency in ms, extract exit IP, and tear down the temporary SSH connection immediately.
  4. Return structured diagnostics distinguishing: `AUTH_FAILED`, `HOST_KEY_UNKNOWN`, `HOST_KEY_MISMATCH`, `CONNECTION_REFUSED`, `TIMEOUT`, `KEY_PARSE_ERROR`, `PORT_IN_USE`, and `SOCKS4A_UNSUPPORTED`.
* **Acceptance Tests:**
  * Testing a valid SSH host or standard proxy displays green status, latency in ms, and remote exit IP without interrupting active WhatsApp/Telegram tabs.
  * Testing wrong SSH credentials or an unreachable port returns a clear diagnostic error within the timeout without freezing the UI.

---

### Phase 5: Windows Desktop Integration

#### Sub-Phase 5.1: System Tray, Minimize/Close-to-Tray & Launch on Startup
* **Deliverables:** `src/main/trayManager.ts`, updates to `src/main/index.ts` and `src/renderer/components/SettingsModal.tsx`.
* **Implementation Requirements:**
  1. Single-instance lock (`app.requestSingleInstanceLock()`): launching a second instance focuses/restores the existing window from tray and quits the duplicate.
  2. System Tray icon with left-click show/hide toggle and right-click menu:
     * Show / Hide LiteBox
     * Status label (e.g., `SSH Tunnel ON (127.0.0.1:10808)` or `Proxy: Direct`)
     * Toggle Global Proxy ON/OFF
     * Separator
     * Quit LiteBox (sets `isQuitting = true`, cleanly stops SSH tunnels and closes tray)
  3. Configurable `closeToTray` (default `true`) and `minimizeToTray` (default `true`).
  4. Launch on Windows Startup:
     * Installed mode (`!isPortable`): toggles `app.setLoginItemSettings({ openAtLogin, args: ['--start-minimized'] })` and honors `--start-minimized`.
     * Portable mode (`isPortable`): disable toggle in UI with helper note ("Disabled in Portable mode to keep Windows Registry clean").
* **Acceptance Tests:**
  * Clicking X minimizes LiteBox to tray while chats and SSH tunnel stay connected; tray menu Quit cleanly closes the app and frees the SSH SOCKS5 port.
  * Portable mode keeps startup toggle disabled and makes zero Windows Registry writes.

#### Sub-Phase 5.2: Native Windows Notifications & Unread Badge Counters
* **Deliverables:** `src/preload/servicePreload.ts`, updates to `src/main/viewManager.ts` and `src/main/trayManager.ts`.
* **Implementation Requirements:**
  1. Attach `src/preload/servicePreload.ts` (`contextIsolation: true`) to all `WebContentsView` instances.
  2. Allow `'notifications'`, `'media'`, and user-initiated clipboard permissions for loaded service origins via `sharedSession.setPermissionRequestHandler`.
  3. Clicking a Windows toast notification restores LiteBox from tray, focuses the window, and activates the exact service tab.
  4. Parse unread counts from `page-title-updated` (e.g., `(3) WhatsApp`, `(12) Telegram`), show red count pills on sidebar tabs (capped at `99+`), aggregate total unread count onto the Windows taskbar overlay icon (`mainWindow.setOverlayIcon`), and update the tray tooltip and unread-dot tray icon.
* **Acceptance Tests:**
  * Incoming WhatsApp/Telegram message while in tray raises a native Windows notification; clicking it opens LiteBox directly to that tab.
  * Sidebar badge, Windows taskbar overlay icon, and tray tooltip update accurately and clear when messages are read.

---

### Phase 6: Security Hardening, Edge Cases & Automated Verification

#### Sub-Phase 6.1: External Links, Downloads, Spellcheck Menu & Kill-Switch Screen
* **Deliverables:** Updates to `src/main/viewManager.ts`, `src/renderer/components/KillSwitchOverlay.tsx`.
* **Implementation Requirements:**
  1. `webContents.setWindowOpenHandler`: open external `http://` and `https://` links in Windows default browser via `shell.openExternal`; block `javascript:`, `file:`, and unknown schemes.
  2. `sharedSession.on('will-download')`: save downloads cleanly to the user's Downloads folder and show a brief shell toast with a working "Show in folder" action.
  3. Right-click context menu inside web pages: Cut, Copy, Paste, Copy Link Address, Save Image As, and native Electron spellcheck suggestions.
  4. Listen to `did-fail-load` and `render-process-gone`: when blocked by `KILL_SWITCH_LOCKED` or tunnel disconnect, render `KillSwitchOverlay.tsx` with error reason, "Open Proxy Manager", and "Retry" buttons instead of raw Chromium error codes.
* **Acceptance Tests:**
  * Clicking a link in WhatsApp/Telegram opens in the default Windows browser.
  * Downloading an image/PDF shows a toast whose "Show in folder" opens Windows Explorer at the file.
  * When kill switch blocks loading, LiteBox shows the clean branded kill-switch overlay with working recovery buttons.

#### Sub-Phase 6.2: Automated Vitest Security & Portability Test Suite
* **Deliverables:** `tests/configStore.test.ts`, `tests/proxyRelay.test.ts`, `tests/sshTunnelManager.test.ts`.
* **Implementation Requirements:**
  1. `tests/configStore.test.ts`: atomic write/read roundtrip, schema defaults, corruption backup/recovery.
  2. `tests/proxyRelay.test.ts`: mock local target, mock SOCKS5 server (with auth), mock HTTP proxy (with auth); verify `DIRECT`, `PROXY_ACTIVE` (passing hostname strings without local DNS resolution), wrong-auth fail-closed, `KILL_SWITCH_LOCKED` (`503`), and `closeAllSockets()`.
  3. `tests/sshTunnelManager.test.ts`: spin up an in-process mock `ssh2.Server` on `127.0.0.1` accepting `direct-tcpip` forwarding to a local mock HTTP target; verify:
     * Custom-port local SOCKS5 listener binds on chosen port and tunnels traffic with `ATYP 0x03` hostname intact.
     * `HOST_KEY_UNKNOWN` triggers before trust and succeeds once fingerprint is trusted.
     * `HOST_KEY_MISMATCH` fails closed.
     * Dropping the mock SSH server triggers `TUNNEL_DROPPED` and destroys active client sockets immediately.
     * `stopTunnel()` releases the custom TCP port cleanly.
* **Acceptance Tests:**
  * `npm test` passes 100% in under 15 seconds across Windows, Linux, and macOS.
  * `npm run typecheck && npm run build` passes with 0 errors.

---

### Phase 7: Windows Packaging (NSIS + Portable `.exe`) & GitHub Actions CI/CD

#### Sub-Phase 7.1: `electron-builder` Dual Packaging Config
* **Deliverables:** `electron-builder.yml`, `build/icon.ico`, `build/icon.png`, updated `package.json`.
* **Implementation Requirements:**
  1. Configure `electron-builder.yml`:
     * `appId: com.litebox.desktop`
     * `productName: LiteBox`
     * `win.target`:
       * `nsis` (`arch: x64`) -> `artifactName: "LiteBox-Setup-${version}.exe"` (`oneClick: false`, `allowToChangeInstallationDirectory: true`, `perMachine: false`, Desktop + Start Menu shortcuts). * `portable` (`arch: x64`) -> `artifactName: "LiteBox-Portable-${version}.exe"`.
  2. Add `"dist:win": "electron-vite build && electron-builder --win --x64"` to `package.json`.
  3. Generate valid multi-resolution `build/icon.ico` and `build/icon.png` placeholder assets if missing.
* **Acceptance Tests:**
  * `npm run dist:win` outputs both `dist/LiteBox-Setup-*.exe` and `dist/LiteBox-Portable-*.exe`.
  * Running `LiteBox-Portable-*.exe` inside an empty folder creates `./LiteBox-Data` beside the `.exe` and leaves `%APPDATA%\LiteBox` untouched.
  * Installing `LiteBox-Setup-*.exe` completes without UAC elevation, stores data in `%APPDATA%\LiteBox`, enables startup launch, and uninstalls cleanly.

#### Sub-Phase 7.2: GitHub Actions Automated Windows Build & Release Pipeline
* **Deliverables:** `.github/workflows/build-windows.yml`.
* **Implementation Requirements:**
  1. Triggers: push tags `v*`, manual `workflow_dispatch`, and PRs to `main` (check-only, no release).
  2. Runs on `windows-latest` with Node 22 LTS and npm cache.
  3. Steps: checkout -> `npm ci` -> `npm run typecheck` -> `npm test` -> `npm run dist:win` (`CSC_IDENTITY_AUTO_DISCOVERY: false`) -> generate `SHA256SUMS.txt` -> upload build artifacts -> publish GitHub Release with `softprops/action-gh-release` on `v*` tags attaching both `.exe` files and `SHA256SUMS.txt`.
  4. Minimal permissions: `contents: read` on PRs, `contents: write` only on release job.
* **Acceptance Tests:**
  * Manual `workflow_dispatch` produces downloadable NSIS `.exe`, Portable `.exe`, and `SHA256SUMS.txt`.
  * Pushing tag `v0.1.0` publishes a GitHub Release with both binaries and checksums attached.