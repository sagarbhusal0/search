## <a href="https://4get.ca/donate">Donate to the project here!</a>

# 4get search
**4get** is a proxy search engine that doesn't suck.

**Sorvx Search** — a privacy-focused metasearch engine. This branch (`rust`) replaces the PHP backend with a **Rust/Axum JSON API server**. The Next.js frontend stays unchanged.

## Architecture

```
┌──────────┐     proxies /api/*     ┌──────────────┐
│  Browser  │ ──────────────────►   │  Next.js     │
│           │ ◄──────────────────── │  (public)    │
└──────────┘     HTML/CSS/JS        └──────┬───────┘
                                           │
                                    PHP_BACKEND_URL
                                           ▼
                                   ┌──────────────┐
                                   │  Rust/Axum   │
                                   │  (internal)   │
                                   │  :3001        │
                                   │               │
                                   │  35 scrapers  │
                                   │  + proxy      │
                                   │  + favicon    │
                                   └──────────────┘
```

- **Rust backend** (`sorvx-rs/`) — Axum server on `:3001`, JSON API only
- **Next.js frontend** (`frontend/`) — UI on `:3000`, proxies API calls
- **No PHP / Apache required**

## VPS Deployment (Docker)

```bash
git clone -b rust https://github.com/sagarbhusal0/search.git
cd search
chmod +x deploy-vps.sh
./deploy-vps.sh
```

This builds both services, starts them via `docker compose`, and runs health checks.

| Service  | Port  | Health           |
|----------|-------|------------------|
| Frontend | 3000  | `/api/health`    |
| Backend  | 3001  | `/healthz.php`   |

## API Endpoints (Rust Backend)

All return JSON. The frontend calls these via its own `/api/*` proxies.

| Endpoint | Params | Default Scraper |
|----------|--------|-----------------|
| `GET /api/v1/web.php` | `s`, `scraper`, `p`, `npt`, `nsfw`, `safe`, `spellcheck` | ddg |
| `GET /api/v1/images.php` | `s`, `scraper`, `p`, `npt`, `nsfw` | pixabay |
| `GET /api/v1/videos.php` | `s`, `scraper`, `p`, `npt`, `nsfw` | yt |
| `GET /api/v1/news.php` | `s`, `scraper`, `p`, `npt`, `nsfw` | ddg |
| `GET /api/v1/music.php` | `s`, `scraper`, `p`, `npt` | sc |
| `GET /api/v1/ac.php` | `s`, `scraper` | brave |
| `GET /proxy.php` | `i` (URL), `s` (size) | — |
| `GET /favicon.php` | `s` (site URL) | — |
| `GET /healthz.php` | — | — |

## Supported websites (35 scrapers)

| web          | images       | videos       | news         | music      | autocomplete |
|--------------|--------------|--------------|--------------|------------|--------------|
| DuckDuckGo   | DuckDuckGo   | YouTube      | DuckDuckGo   | SoundCloud | Brave        |
| Brave        | Yandex       | Vimeo        | Brave        | Swisscows  | DuckDuckGo   |
| Yandex       | Brave        | Sepia Search | Google       |            | Yandex       |
| Google       | Google       | DuckDuckGo   | Yahoo! JAPAN |            | Google       |
| Google API   | Google API   | Brave        | Startpage    |            | Startpage    |
| Google CSE   | Google CSE   | Yandex       | Qwant        |            | Kagi         |
| Yahoo! JAPAN | Yahoo! JAPAN | Google       | Mojeek       |            | Qwant        |
| Startpage    | Startpage    | Yahoo! JAPAN | Baidu        |            | Ghostery     |
| Qwant        | Qwant        | Startpage    |              |            | Yep          |
| Ghostery     | Baidu        | Qwant        |              |            | Marginalia   |
| Yep          | Solofield    | Baidu        |              |            | YouTube      |
| Mwmbl        | Pinterest    | Coc Coc      |              |            | SoundCloud   |
| Mojeek       | Cara         | Solofield    |              |            |              |
| Baidu        | Flickr       |              |              |            |              |
| Coc Coc      | Pexels       |              |              |            |              |
| Solofield    | Pixabay      |              |              |            |              |
| Marginalia   | Unsplash     |              |              |            |              |
| wiby         | 500px        |              |              |            |              |
|              | VSCO         |              |              |            |              |
|              | Imgur        |              |              |            |              |
|              | FindThatMeme |              |              |            |              |

## Features
1. Rust rewrite of original 4get PHP backend (no PHP/Apache dependency)
2. 35 scraper engines with default fallbacks
3. Rotating proxy pools on a per-scraper basis
4. Search filters
5. Sled-embedded disk cache with TTL
6. Favicon fetcher with HTML scraping, image conversion, and disk caching
7. Image proxy with resize (portrait/landscape/square/thumb/cover)
8. Bot protection support (captcha)
9. JSON-only API — frontend renders all UI

## About 4get
https://4get.ca/about

## Official instance
https://4get.ca , or visit the official instance list: https://4get.ca/instances

_NOT to be confused with 4get.ch, 4get.lol and friends! I **don't** host these._

## Totally unbiased comparison between alternatives

|                            | 4get                    | searx(ng) | whoogle    | degoog                                    |
|----------------------------|-------------------------|-----------|------------|-------------------------------------------|
| RAM usage                  | 100-400mb~              | 400mb-1GB | 100mb      | 100mb-250mb                               |
| Does it suck               | no (debunked by snopes) | yes       | kind of?   | hit and miss with search filters          |
| Does it work               | ye                      | lmao      | shits dead | works $rightNow, it's actually kinda cool |

## Contact
Shit breaks all the time but I repair it all the time too. Email me here: <b>will (at) lolcat.ca</b> or create an issue.

## License
AGPL
