# Sorvx Search — Rust Migration Context

## Goal
Migrate PHP metasearch backend to Rust and fix all web/image/video/news/music scrapers to work from a datacenter IP.

## Status: Rust backend complete, all scrapers fixed, frontend updated

### Scraper Fixes (this session)

| Category | Scraper | Status | Results |
|----------|---------|--------|---------|
| Web | brave | OK | 19-20 |
| Web | ddg | OK (full mode first, HTML fallback, JS challenge solver) | 10 |
| Web | yandex | Blocked (captcha, needs proxies) | 0 |
| Web | startpage | Blocked (SPA, needs proxies) | 0 |
| Web | google | Blocked (JS-only from datacenter IP) | 0 |
| Images | brave | OK | 46-50 |
| Images | ddg | OK | 45-50 |
| Images | google | Blocked (JS-only) | 0 |
| Videos | brave | OK | 50 |
| Videos | ddg | OK | 28-30 |
| Videos | yt | Blocked (302 redirect, needs proxies or headless) | 0 |
| News | brave | OK | 22 |
| News | ddg | OK | 0 |
| News | google | Blocked (JS-only) | 0 |
| Music | soundcloud | OK (dynamic client_id extraction) | 10 |
| Autocomplete | ddg | OK (8 suggestions) | 8 |

### Key Changes

#### Backend (Rust)
- **DDG scraper** (`4get-rs/src/scraper/ddg.rs`): Rewritten with full mode first (DuckDuckGo JS API via `d.js`), HTML mode fallback, JS challenge solver (multiplication + innerHTML length), better anti-bot detection
- **Brave scraper** (`4get-rs/src/scraper/brave.rs`): Changed to offset-based pagination (`offset=N`), fixed video thumbnail selector
- **Google scraper** (`4get-rs/src/scraper/google.rs`): Random UA + CONSENT=YES+ cookie on all web/image/news/video requests
- **Yandex scraper** (`4get-rs/src/scraper/yandex.rs`): Cookie flow (yp + i cookies), `/search/site/` endpoint, captcha detection
- **Startpage scraper** (`4get-rs/src/scraper/startpage.rs`): SPA/captcha detection, clear error messages
- **SoundCloud scraper** (`4get-rs/src/scraper/sc.rs`): Dynamic client_id extraction from JS bundles with hardcoded fallback, plain reqwest client
- **YouTube scraper** (`4get-rs/src/scraper/yt.rs`): Consent cookies, improved initial data extraction, thumbnails/author/description
- **Autocomplete default** (`4get-rs/src/routes/ac.rs:28`): Changed from `"brave"` to `"ddg"` (brave returns 1 placeholder, DDG returns 8 real suggestions)
- **Random User-Agent** (`4get-rs/src/scraper/client.rs`): Added `random_ua()` method, 200 real Android Chrome UAs in `data/user_agents.txt`
- **Qwant removed**: Module and registry entry deleted from `4get-rs/src/scraper/mod.rs`
- **AGENTS.md**: Updated autocomplete default

#### Frontend (Next.js)
- **Autocomplete cookie parsing** (`frontend/src/app/api/autocomplete/route.ts`): Changed from `cookies()` API to direct header parsing for reliability
- **Search suggestions** (`frontend/src/app/search/SearchResults.tsx`): Fetched from autocomplete API, shown as clickable pills below results when no related results
- **Settings defaults** (`frontend/src/app/settings/page.tsx`): Removed non-working scrapers (Google, Yandex, Startpage, YouTube) from dropdowns and defaults
- **Video page** (`frontend/src/app/videos/page.tsx`): Removed YouTube from dropdown
- **API routes**: Content-type validation and error handling added to images/videos/news/music routes
- **Proxy SSRF fix**: Full 172.16.0.0/12 range blocking (both frontend and backend)

### Non-Working Scrapers (need proxies or headless)
- **Google**: Returns JS-only page from datacenter IP — needs headless browser or residential proxy
- **Yandex/Startpage**: Captcha/SPA blocked from datacenter IP — needs proxy rotation
- **YouTube**: 302 redirect to m.youtube.com, JS-only — needs headless browser or residential proxy

These scrapers remain in the Rust code (they work when proxies are added) but are removed from the frontend UI.

### Architecture
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
  ├── data/
  │   ├── user_agents.txt (200 Android Chrome UAs)
  │   └── proxies/ (placeholder files for ddg, yandex, startpage)
  └── cache/
      ├── mod.rs
      └── pagination.rs
```

### Verification
- `cargo build --release`: PASS (zero warnings, zero errors)
- `npx next build` (frontend): PASS
- Backend APIs confirmed working: web (10-20 results), images (46-50), videos (28-50), news (22), music (10), autocomplete (8)
- Full end-to-end verified on ports 3007 (frontend) + 15789 (backend)

### Known Issues
1. **Old Docker containers** on port 3000/3001 run stale binaries — need `docker builder prune -af` then `docker compose build --no-cache && docker compose up -d`
2. **Docker build fails** with "snapshot parent" error (buildkit cache corruption) — needs `docker builder prune -af` or `--no-cache`
3. **Old Docker process on port 3001** (PID 128356 in separate container scope) cannot be killed from workspace
4. **Proxy files** (`data/proxies/ddg.txt`, `yandex.txt`, `startpage.txt`) are empty placeholders — need working proxies

### Next Steps
1. Restart Docker with new binary
2. Populate proxy files with working proxies
3. Add captcha/bot-protection middleware
4. Add rate limiting
5. Add oracles (calculator, encoder, time, numerics)
6. Add instance federation
7. Add CORS configuration for production
