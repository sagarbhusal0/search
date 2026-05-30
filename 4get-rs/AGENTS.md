# Sorvx Search — Rust Backend

## Project Overview
A Rust rewrite of the Sorvx Search (formerly 4get) metasearch engine backend. Provides JSON API endpoints. The frontend is a Next.js app that proxies API requests to this Rust server.

## Architecture
```
src/
├── main.rs          # Entry point: Axum server, router setup
├── config.rs        # TOML config loading
├── errors.rs        # Error types with Axum IntoResponse
├── types.rs         # Request/response types (SearchQuery, WebResponse, etc.)
├── cache/           # Sled-based disk cache with TTL support
│   ├── mod.rs
│   └── pagination.rs
├── scraper/         # 35 scraper engines (web, image, video, news, music)
│   ├── mod.rs       # Scraper trait, build_registry()
│   ├── client.rs    # HTTP client, proxy pool
│   ├── ddg.rs, brave.rs, google.rs, ...  # individual scrapers
│   └── ...
└── routes/          # Axum route handlers (JSON API)
    ├── mod.rs       # Route definitions, AppState
    ├── web.rs       # GET /api/v1/web.php
    ├── image.rs     # GET /api/v1/images.php
    ├── video.rs     # GET /api/v1/videos.php
    ├── news.rs      # GET /api/v1/news.php
    ├── music.rs     # GET /api/v1/music.php
    ├── ac.rs        # GET /api/v1/ac.php (autocomplete)
    ├── proxy.rs     # GET /proxy.php (image proxy with resize)
    ├── favicon.rs   # GET /favicon.php (favicon proxy)
    └── healthz.rs   # GET /healthz.php
```

## API Endpoints
All return JSON. The Next.js frontend proxies through `/api/*` routes to these endpoints.

| Route | Params | Type |
|-------|--------|------|
| `/api/v1/web.php` | `s` (query), `scraper`, `p`, `npt`, `nsfw`, `safe`, `spellcheck` | WebResponse |
| `/api/v1/images.php` | `s`, `scraper`, `p`, `npt`, `nsfw` | ImageResponse |
| `/api/v1/videos.php` | `s`, `scraper`, `p`, `npt`, `nsfw` | VideoResponse |
| `/api/v1/news.php` | `s`, `scraper`, `p`, `npt`, `nsfw` | NewsResponse |
| `/api/v1/music.php` | `s`, `scraper`, `p`, `npt` | MusicResponse |
| `/api/v1/ac.php` | `s` (query), `scraper` | AutocompleteResponse |
| `/proxy.php` | `i` (image URL), `s` (size: original/portrait/landscape/square/thumb/cover) | image/* |
| `/favicon.php` | `s` (site URL) | image/png |
| `/healthz.php` | - | HealthzResponse |

## Key Decisions
- **No HTML rendering**: This backend only serves JSON APIs. The Next.js frontend handles all UI.
- **Default scrapers**: web=ddg, image=pixabay, video=yt, news=ddg, music=sc, autocomplete=ddg
- **Config format**: TOML (config.toml), mirrors PHP config.php structure
- **Image proxy**: Uses `image` crate for resize; supports Bing thumbnail passthrough and local resizing
- **Favicon proxy**: Scrapes HTML for favicon link tags, downloads, resizes to 16x16 PNG, caches to disk
- **Cache**: Sled embedded database with TTL support

## Build & Run
```bash
cd 4get-rs
cargo build --release
cargo run -- --config config.toml
```

## Next Steps
- Add captcha/bot protection middleware
- Add oracles (calculator, encoder, time, numerics)
- Add rate limiting
- Add instance federation (ping other instances)
- Add audio proxy endpoint (aproxys)
- Add OpenSearch XML endpoint
- Add CORS configuration for production
