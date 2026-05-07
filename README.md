# <a href="https://4get.ca/donate">Donate to the project here!</a>

# 4get Search 🔍
**4get** is a proxy search engine that aggregates results from various sources without tracking you. It's designed to be lightweight, fast, and functional even without JavaScript.

## 🌟 Features
- **Privacy First:** No tracking, no logs, no user profiling.
- **Aggregated Results:** Combines the best of multiple search engines.
- **JavaScript Optional:** Works perfectly with JS disabled.
- **Rotating Proxies:** Per-scraper proxy rotation to prevent blocks.
- **Search Filters:** Fine-grained control over your search results.
- **Oracles:** Instant answers for calculations, time, and more.
- **Multimedia Proxies:** Stream music (SoundCloud, Spotify) and view images via proxy.
- **Theming:** Customizable CSS-based themes.
- **Bot Protection:** Effective captcha-based filtering (when enabled).

## 🛠 Tech Stack
- **Backend:** PHP 8.x (Vanilla, high-performance minimal dependencies).
- **Caching:** APCu for proxy rotation and temporary state.
- **Frontend (Classic):** PHP Templates + Vanilla CSS.
- **Frontend (Modern):** Next.js (React/TypeScript) located in `/frontend`.
- **Scraping:** Custom cURL-based scrapers with a proprietary HTML parser (`lib/fuckhtml.php`).
- **Containerization:** Docker & Docker Compose support.

## 📂 Project Structure
```text
├── audio/          # Audio streaming proxies
├── banner/         # Custom banners for the home page
├── data/           # Config, API keys, proxies, and fonts
├── docs/           # Detailed setup and configuration guides
├── frontend/       # Modern Next.js frontend
├── icons/          # Website icons
├── lib/            # Core logic, backend, and HTML parser
├── oracles/        # Instant answer modules (calc, time, etc.)
├── resolve/        # Stream resolvers (e.g., SoundCloud)
├── scraper/        # Search engine scraper implementations
├── static/         # CSS, JS, icons, and themes
└── template/       # PHP HTML templates
```

## 🌐 Supported Engines

| Web | Images | Videos | News | Music |
| :--- | :--- | :--- | :--- | :--- |
| DuckDuckGo | DuckDuckGo | YouTube | DuckDuckGo | SoundCloud |
| Brave | Yandex | Vimeo | Brave | Swisscows |
| Google | Brave | DuckDuckGo | Google | |
| Startpage | Google | Brave | Startpage | |
| Qwant | Pinterest | Yandex | Mojeek | |
| Baidu | Flickr | Qwant | Baidu | |
| Mojeek | Unsplash | ... | ... | |

*...and many more! See the full list in the scrapers directory.*

## 🚀 Getting Started

### Using Docker (Recommended)
The fastest way to get 4get running is via Docker.

```bash
docker run -d -p 80:80 \
  -e FOURGET_SERVER_NAME="yourdomain.com" \
  -e FOURGET_PROTO="http" \
  luuul/4get:latest
```

For SSL and advanced configurations, see the [Docker Documentation](docs/docker.md).

### Manual Installation
1. Ensure you have **PHP 8.x** with `curl`, `gd`, and `apcu` extensions installed.
2. Clone the repository.
3. Configure your web server (Apache, Nginx, or Caddy).
4. See the specific guides in `/docs`:
   - [Apache2 Setup](docs/apache2.md)
   - [Nginx Setup](docs/nginx.md)
   - [Caddy Setup](docs/caddy.md)

## ⚙️ Configuration
The main configuration file is located at `data/config.php`.

### Environment Variables (Docker)
| Variable | Description |
| :--- | :--- |
| `FOURGET_SERVER_NAME` | Your instance domain (e.g., 4get.ca) |
| `FOURGET_PROTO` | `http` or `https` |
| `FOURGET_BOT_PROTECTION` | Set to `1` to enable captchas |

### Proxies
Add your proxies to `data/proxies/yourproxy.txt` in the format:
`<protocol>:<address>:<port>:<username>:<password>`

Then update `data/config.php` to use them for specific scrapers.

## 🛡 Cloudflare Bypass
Some engines (like **Yep**) and images require bypassing Cloudflare TLS checks. 4get supports `curl-impersonate` for this. Refer to [Configuration Guide](docs/configure.md) for setup instructions.

## 🤝 Contributing
4get is an open-source project. We welcome contributions of all kinds!
1. Fork the repo.
2. Create your feature branch.
3. Follow the coding standards in `GEMINI.md`.
4. Submit a PR!

## 📜 License
4get is licensed under the **AGPL-3.0 License**.

---
*4get is the best way to browse for shit. Period.*
