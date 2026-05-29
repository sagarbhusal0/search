# Sorvx Search — Rust Migration Context

## Goal
Replace the PHP backend with a Rust backend (`4get-rs/`) while keeping the Next.js frontend unchanged.

## Key Changes

### 1. VideoResult.duration Type Fix
- **File:** `4get-rs/src/types.rs`
- **Change:** `duration: Option<String>` → `Option<i64>`
- **Reason:** Frontend expects a number (seconds), not a string.

### 2. Duration Parsing in Scrapers (10 files)
All these scrapers now parse duration strings (e.g., `"10:25"`) into seconds (`i64`):
- `4get-rs/src/scraper/ddg.rs`, `qwant.rs` (2x), `startpage.rs`, `brave.rs`, `yt.rs`, `yandex.rs`, `baidu.rs`, `vimeo.rs`, `sepiasearch.rs`, `yahoo_japan.rs`

### 3. All Rust Warnings Fixed (30 warnings)
- Removed unused imports across multiple scraper files
- Prefixed unused variables with `_`
- Added `#[allow(dead_code)]` on structurally necessary but currently unused fields in:
  - `4get-rs/src/config.rs` — config fields, bot protection, oracles, proxies
  - `4get-rs/src/cache/mod.rs` — `CacheStore` struct and methods
  - `4get-rs/src/cache/pagination.rs` — pagination cache methods
  - `4get-rs/src/errors.rs` — error variant unused fields
  - `4get-rs/src/routes/mod.rs` — `AppState.cache` field
  - `4get-rs/src/routes/web.rs`, `image.rs`, `video.rs`, `news.rs`, `music.rs`, `ac.rs` — `cache`, `nsfw`, `extra` fields on response structs
  - `4get-rs/src/scraper/client.rs` — `ProxyConfig`, `ProxyType`, `ProxyPool`, unused methods

### 4. `.gitignore` for Rust
- **File:** `4get-rs/.gitignore`
- **Content:** target/, Cargo.lock, config.toml

### 5. Frontend Env Var Rename
- **Changed:** `PHP_BACKEND_URL` → `BACKEND_URL` in all 8 frontend API routes + `.env.production` + `docker-compose.vps.yaml`
- **Backward compat:** Falls back to `PHP_BACKEND_URL` if `BACKEND_URL` is not set

### 6. PHP Code Removal from `rust` Branch
Deleted all PHP files/directories:
- `api/`, `lib/`, `scraper/`, `template/`, `resolve/`, `oracles/`, `audio/`, `banner/`, `icons/`, `static/`, `data/`, `.graphify/`, `.kiro/`
- Root `*.php`, `Dockerfile`, `docker/`, `deploy.sh`, `setup-ssl.sh`, `robots.txt`, `docker-compose.yaml`

### 7. Deployment Script Updates
- `deploy-vps.sh`, `deploy-local.sh`, `dev.sh`:
  - `PHP_BACKEND_URL` → `BACKEND_URL`
  - Removed PHP-specific build/run steps

### 8. Git Config
- User: `Sagar Bhusal <hokeyt1@gmail.com>`

## Verification Status

### `cargo check`: PASS (zero warnings, zero errors)
### `cargo test`: PASS (all tests pass)

### End-to-End Test (Rust backend on port 3001)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `/healthz.php` | ✅ OK | Returns `{"status":"ok"}` |
| `/api/v1/web.php` | ✅ OK | 19 results (Brave scraper) |
| `/api/v1/images.php` | ✅ OK | 46 results (Pixabay scraper) |
| `/api/v1/videos.php` | ✅ OK | 0 results (YT scraper — no results for query, likely anti-bot) |
| `/api/v1/news.php` | ✅ OK | 13 results (Brave scraper) |
| `/api/v1/music.php` | ❌ 500 | SoundCloud scraper returns "error decoding response body" |
| `/api/v1/ac.php` | ✅ OK | Returns suggestions (Brave scraper) |
| `/proxy.php` | ✅ OK | Returns resized images |

### Known Issues
1. **Music scraper (SoundCloud):** Returns 500 — `"HTTP error: error decoding response body"`. The scraper likely needs fixing for the current SoundCloud API response format.
2. **Video scraper (YouTube):** Returns 0 results. May be blocked by anti-bot measures or the HTML structure changed.
3. **Frontend:** Not yet tested end-to-end with the Rust backend. Node modules are installed but `npm run dev` still needs to be verified.

## Architecture
```
Rust Backend (port 3001)          Next.js Frontend (port 3000)
  4get-rs/src/                      frontend/src/
  ├── main.rs                      ├── app/
  ├── config.rs                       └── api/ (proxies to Rust)
  ├── types.rs                          ├── web/route.ts
  ├── errors.rs                        ├── images/route.ts
  ├── routes/                          ├── videos/route.ts
  │   ├── mod.rs                      ├── news/route.ts
  │   ├── web.rs                      ├── music/route.ts
  │   ├── image.rs                    ├── ac/route.ts
  │   ├── video.rs                    ├── proxy/route.ts
  │   ├── news.rs                     └── favicon/route.ts
  │   ├── music.rs
  │   ├── ac.rs
  │   ├── proxy.rs
  │   ├── favicon.rs
  │   └── healthz.rs
  ├── scraper/ (35 engines)
  │   ├── mod.rs
  │   ├── client.rs
  │   └── *.rs (individual scrapers)
  └── cache/
      ├── mod.rs
      └── pagination.rs
```

## API Routes
All endpoints match PHP backend paths for seamless frontend swap:

| Route | Params | Response |
|-------|--------|----------|
| `/healthz.php` | — | `{"status":"ok","service":"Sorvx","version":1,"timestamp":...}` |
| `/api/v1/web.php` | `s`, `scraper`, `p`, `npt`, `nsfw`, `safe`, `spellcheck` | WebResponse |
| `/api/v1/images.php` | `s`, `scraper`, `p`, `npt`, `nsfw` | ImageResponse |
| `/api/v1/videos.php` | `s`, `scraper`, `p`, `npt`, `nsfw` | VideoResponse |
| `/api/v1/news.php` | `s`, `scraper`, `p`, `npt`, `nsfw` | NewsResponse |
| `/api/v1/music.php` | `s`, `scraper`, `p`, `npt` | MusicResponse |
| `/api/v1/ac.php` | `s`, `scraper` | AutocompleteResponse |
| `/proxy.php` | `i` (URL), `s` (size) | image/* |

## Frontend Fixes (Current Session)

### Bug 1: Search results showing only "ok"
- **File:** `frontend/src/app/search/SearchResults.tsx` (line 82)
- **Issue:** `if (data.status)` treated `"ok"` as error (truthy string), blocking all results
- **Fix:** Changed to `if (data.status && data.status !== "ok")`

### Bug 2: Double-encoded search queries
- **File:** `frontend/src/app/components/SearchBar.tsx` (line 42)
- **Issue:** `encodeURIComponent()` inside `URLSearchParams.set()` caused double-encoding
- **Fix:** Changed `params.set("s", encodeURIComponent(searchQ.trim()))` to `params.set("s", searchQ.trim())`

### Bug 3: Images/Videos/News API routes missing error handling
- **Files:** `frontend/src/app/api/images/route.ts`, `videos/route.ts`, `news/route.ts`
- **Issue:** No content-type validation or status checking — backend errors silently returned empty results
- **Fix:** Added content-type check, `data.status !== "ok"` check, and proper 502 error responses (matching search route pattern)

### Bug 4: Proxy SSRF — incomplete 172.x.x private IP range
- **Files:** `frontend/src/app/api/proxy/route.ts`, `4get-rs/src/routes/proxy.rs`
- **Issue:** Only blocked `172.16.x.x` instead of full `172.16.0.0/12` range (172.16–31.x.x)
- **Fix:** Added proper range check for 172.16–31 in both frontend (JS) and backend (Rust `is_private_ip()` helper)

### Backend Verification
- `cargo check`: PASS (zero warnings, zero errors)
- `cargo build --release`: PASS
- Backend APIs confirmed working: images (46 results), videos (50 results), web, news, autocomplete
- Image proxy confirmed working end-to-end through Next.js → Rust proxy chain

### Scraper Cleanup
- **Removed 6 API-key scrapers** from backend: `pixabay`, `unsplash`, `google_api`, `google_cse`, `yep`, `marginalia`
- **Removed module declarations** and registry entries from `4get-rs/src/scraper/mod.rs`
- **Cleaned up config**: emptied `ScrapersConfig` struct, removed unused fields from `config.toml`
- **Zero warnings** after cleanup

### Frontend Dropdown Updates
- **Images**: brave (default) + ddg
- **Videos**: yt (default) + brave + ddg
- **News**: brave (default) + ddg
- DDG image search is blocked (403 anti-bot), brave is the working default

### Scraper Status (Current)
| Category | Scraper | Status | Results |
|----------|---------|--------|---------|
| Images | brave | OK | 47 |
| Images | ddg | 403 blocked (needs proxy rotation) | 0 |
| Videos | brave | OK | 50 |
| Videos | ddg | OK | 58 |
| Videos | yt | anti-bot | 0 |
| News | brave | OK | 50 |
| News | ddg | OK | 12 |

### DDG Image Proxy Support
- DDG blocks `i.js` endpoint from server IPs (returns 403).
- Rust backend now includes proxy pool infrastructure; DDG image scraper uses `self.http.get_or_raw_client(Some("ddg"))` for all HTTP calls.
- Proxy list file `data/proxies/ddg.txt` (empty placeholder) is referenced in `config.toml`.
- Frontend dropdown now includes DDG again; once proxies are added, DDG image search will work without 403.

## Next Steps
1. Populate `data/proxies/ddg.txt` with working proxies (or other scraper‑specific lists) to enable DDG image search.
2. Verify proxy pool loading works (unit tests for `HttpClient::get_or_raw_client`).
3. Fix YouTube video scraper (handle consent cookies / updated HTML structure) to return results.
4. Fix SoundCloud music scraper (adjust to current API response).
5. Add optional query params (`safe`, `spellcheck`, `extendedsearch`) to frontend API routes.
6. Implement captcha/bot‑protection middleware and rate limiting.
7. Run full end‑to‑end tests with Next.js (`npm run dev`) against the Rust backend.
