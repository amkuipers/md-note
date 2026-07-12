# Google Sign-In + Google Drive storage for md-note — research summary (July 2026)

## 1. Auth: current recommended browser-only approach

The **Google Identity Services (GIS)** library is the current (and only supported) way — the old `gapi.auth2` / Google Sign-In platform library was fully deprecated years ago. One script serves both jobs:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

GIS deliberately splits **authentication** (who the user is — `google.accounts.id`, ID tokens, One Tap / Sign in with Google button) from **authorization** (API access — `google.accounts.oauth2`). For Drive access you only need the authorization half; you don't strictly need "sign-in" at all.

Two authorization models:

- **Token model** (`google.accounts.oauth2.initTokenClient(...)` → `tokenClient.requestAccessToken()`): OAuth 2.0 **implicit grant** run entirely in the browser. Returns a short-lived access token (~1 hour, `expires_in` in the response) directly to a JS callback. **No refresh tokens ever** — when the token expires you call `requestAccessToken()` again. If the user is still signed in to Google and already consented, the popup opens and auto-closes without user input, but it *is* a popup: it must be tied to a user gesture or popup blockers may eat it. Google notes consent is only required the first time per scope; `hasGrantedAllScopes()` checks grants.
- **Code model** (`initCodeClient`): authorization code + PKCE, but the code must be exchanged **on a backend**; that backend gets a refresh token. Google's guidance explicitly recommends the code flow as more secure, and flags the implicit flow's in-browser token handling as its weakest option — but the token model remains fully supported and is the standard choice when you have no backend to hold secrets.

For a browser-only app, the token model is the practical answer; for md-note (which *does* have a local Node server) the code model is a legitimate upgrade path (see §6).

## 2. Drive scopes and verification implications

| Scope | Access | Classification |
|---|---|---|
| `https://www.googleapis.com/auth/drive.file` | Only files/folders the app **created or the user explicitly opened** (via Google Picker) | **Non-sensitive** — Google's recommended scope |
| `https://www.googleapis.com/auth/drive.appdata` | Hidden per-app "Application Data folder" | **Non-sensitive** |
| `https://www.googleapis.com/auth/drive` (also `drive.readonly`, `drive.metadata`…) | All of the user's Drive | **Restricted** — heaviest verification, potential paid CASA security assessment, only certain app categories qualify |

Verification facts:

- **Non-sensitive scopes** (`drive.file`, `drive.appdata`) need only basic app/brand verification when published; no scope justification, no security assessment.
- An app left in **"Testing"** publishing status shows the **"Google hasn't verified this app"** warning screen, which **test users** (explicitly added, max **100**) can click through via "Continue". The oft-cited **100-user cap** applies to unverified apps using sensitive/restricted scopes; test-user lists are capped at 100 regardless.
- Testing-mode **refresh tokens expire after 7 days** (relevant only to the code-model alternative; access tokens in the token model are unaffected).
- For a personal app: create the project, set audience **External**, add your own Gmail/Workspace address as a test user, stay in Testing forever. With only `drive.file`/`drive.appdata` you never need to submit for verification.

**Which scope for md-note?** `drive.file`. The project's core contract is that `.md` files stay human-readable/editable outside the app — `appDataFolder` contents are **invisible in the Drive UI** (users can only see total storage and delete the whole folder under Drive settings → Manage apps), which would break that. With `drive.file`, the app creates an "md-note" folder and its files, and automatically retains access to everything it created; the user sees and can edit them in Drive. Caveat: files created/edited by *other* apps or manually uploaded are invisible to the app unless opened through the **Google Picker**. `appDataFolder` is still a fine choice if hiding the data is acceptable.

## 3. Calling Drive REST API v3 directly from browser JS

Yes — `www.googleapis.com` supports **CORS**; plain `fetch` with `Authorization: Bearer <access_token>` works (the Authorization header triggers a normal CORS preflight, which Google handles). No `gapi` client library needed. Known CORS edge cases exist around `alt=media` downloads with extra headers like `Range`, but ordinary metadata + content operations are fine.

Key operations (all `https://www.googleapis.com/drive/v3` unless noted):

- **Create folder**: `POST /files` with JSON body `{"name":"md-note","mimeType":"application/vnd.google-apps.folder"}`.
- **Create file with content** (multipart, best ≤5 MB — plenty for notes): `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, `Content-Type: multipart/related; boundary=X`; part 1 = JSON metadata (`{"name":"desktop.json","parents":[folderId]}`, `Content-Type: application/json; charset=UTF-8`), part 2 = the content with its own MIME type. In the browser you can build this with a `Blob([metadataPart, filePart])`.
- **Update content**: `PATCH https://www.googleapis.com/upload/drive/v3/files/{fileId}?uploadType=media` (content only) or `uploadType=multipart` (content + metadata).
- **Read content**: `GET /files/{fileId}?alt=media`.
- **List app's files**: `GET /files?q=...` — with `drive.file` the listing is automatically limited to files the app can see; query by parent (`'folderId' in parents`), name, `trashed=false`, etc.
- **appDataFolder variant**: use `"parents":["appDataFolder"]` on create and `spaces=appDataFolder` on list; the folder auto-creates on first upload; no sharing/trashing/moving inside it.

## 4. Google Cloud Console setup burden

One-time, ~10 minutes, free:

1. Create a Google Cloud project.
2. **Enable the Google Drive API** (APIs & Services → Library).
3. Configure the OAuth consent screen — now under **"Google Auth Platform"** in the console (Branding / Audience / Clients tabs): app name, support email, audience **External**, add yourself under **Test users**.
4. Create an **OAuth client ID**, type **Web application**, and add **Authorized JavaScript origins**: both `http://localhost` and `http://localhost:3000` (localhost is exempt from the HTTPS requirement; any other origin must be HTTPS). No redirect URI is needed for the GIS token model.
5. Put the client ID string in the frontend. **No API key is needed** — API keys are only for unauthenticated/public data or the gapi discovery client; every md-note request carries a Bearer token. No client secret exists for pure-browser flows either. The client ID is not a secret.

Gotcha: origins are port-specific, so a `PORT=8080` user would need that origin added too (or the developer documents "use port 3000 with Drive sync").

## 5. Constraints and gotchas

- **~1 h token lifetime, no refresh tokens** in the token model. Re-auth = call `requestAccessToken()` again. If the Google session is alive and consent granted, it completes without user interaction, but browsers may block the popup unless it's triggered by a click — the standard pattern is: on a 401 from Drive, queue the write and show a "Reconnect Google Drive" button (or proactively refresh on a user gesture shortly before `expires_in`).
- **No offline access** in the browser flow — the app can only sync while open and the user's Google session is valid. md-note's 600 ms debounced save model fits, but the `keepalive` save-on-tab-close still works only while the token is fresh.
- **FedCM / third-party cookies**: GIS *sign-in* (One Tap, `google.accounts.id`) was force-migrated to **FedCM** (mandatory since Aug 2025); the migration is handled inside the library and mostly transparent. The **OAuth authorization popup flows (`google.accounts.oauth2`) don't rely on third-party cookies** and are unaffected. Google is continuing FedCM investment even though Chrome dropped full third-party-cookie deprecation.
- **Rate limits**: Drive API default quota is on the order of 12,000 queries/min per project (and per-user throttles) — orders of magnitude beyond a one-user notes app; just debounce (already done) and back off on 403/429.
- **Testing-mode warning screen** on every consent (click-through for test users); 7-day refresh-token expiry in Testing applies only if you adopt the code model.
- **Multipart uploads ≤5 MB** — fine for markdown; use resumable uploads if ever needed.
- `drive.file` blindness to externally created files: a `.md` the user drops into the Drive folder by hand won't be seen by the app without the Picker. (This is the one real trade-off vs. today's "edit files freely on disk" model.)

## 6. Alternatives

- **Use the existing `server.js` as an OAuth backend (authorization code flow + PKCE)**: server holds the client secret and a **refresh token**, so sync survives token expiry and works headlessly. Cost: secret/token storage on disk, a redirect-URI route, and token-refresh logic — meaningful complexity for a zero-dependency server. Google recommends this flow for security, and it's the right call if background/offline sync ever matters; for an interactive single-user localhost app the token model is simpler and adequate. (Middle ground: keep local filesystem as primary storage and treat Drive as an optional mirror/backup, so an expired token never blocks note-taking.)
- **Google Picker API**: not a storage backend by itself, but the standard companion to `drive.file` — it lets the user grant the app access to pre-existing files/folders without any broader scope. Note the Picker *does* require an API key in addition to the OAuth token.
- **Sync the local `data/` folder with the official Google Drive desktop client** — zero code, keeps the current architecture, no OAuth at all. Worth stating as the pragmatic baseline for a one-user hobby setup.

## Recommended approach for md-note

Given: local hobby app, likely one user, localhost, existing debounced full-state PUT.

1. **Token model + `drive.file`**, pure client-side; keep `server.js` untouched (static serving only). Stay in Testing mode with yourself as the only test user — no verification ever needed.
2. Load `https://accounts.google.com/gsi/client`; add a "Connect Google Drive" menu item that calls `initTokenClient({client_id, scope: 'https://www.googleapis.com/auth/drive.file'})` → `requestAccessToken()`.
3. Mirror the on-disk model in Drive: an `md-note` root folder, one subfolder per desktop containing `desktop.json` + `notes/<id>.md` — preserving the "readable outside the app" contract in the Drive UI. Cache folder/file IDs (e.g. in `localStorage` or in `desktop.json`) to avoid list-by-name lookups on every save.
4. Route `markDirty()`'s debounced save to a storage adapter: local-API mode (today's PUT) or Drive mode (multipart `PATCH` per changed file). On 401, hold dirty state and surface a one-click reconnect.
5. Skip `appDataFolder` (hides the markdown) and skip the full `drive` scope (restricted-scope verification pain for zero benefit).

## Official docs

- Token model (browser authorization): https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Choosing token vs. code model: https://developers.google.com/identity/oauth2/web/guides/choose-authorization-model
- How user authorization works: https://developers.google.com/identity/oauth2/web/guides/how-user-authz-works
- OAuth for client-side web apps (implicit flow, CORS + Bearer examples, JS origins): https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow
- Get a client ID: https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid
- Drive scopes & sensitivity: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- appDataFolder guide: https://developers.google.com/workspace/drive/api/guides/appdata
- Uploads (multipart): https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Consent screen configuration: https://developers.google.com/workspace/guides/configure-oauth-consent
- Verification FAQ (100-user cap, testing mode): https://support.google.com/cloud/answer/13463817 and minimum scopes: https://support.google.com/cloud/answer/13807380
- FedCM migration: https://developers.google.com/identity/gsi/web/guides/fedcm-migration
