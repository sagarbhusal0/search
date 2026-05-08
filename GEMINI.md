# 4get Search - Project Guidance

This document provides foundational guidance, architectural patterns, and coding standards for the 4get search engine project.

## Project Overview
4get is a proxy search engine that aggregates results from various sources without tracking users. It is designed to be lightweight, fast, and functional even without JavaScript.

## Core Tech Stack
- **Backend:** PHP 8.x (Vanilla, minimal dependencies)
- **Frontend (Legacy/Default):** PHP Templates (`template/*.html`) + Vanilla CSS.
- **Frontend (Modern):** Next.js (TypeScript/React) located in the `frontend/` directory.
- **Scraping:** Custom cURL-based scrapers with a proprietary HTML parser (`lib/fuckhtml.php`).
- **Caching/State:** APCu is used for rotating proxies and storing temporary data.

## Architectural Patterns

### 1. Scraper Structure
All scrapers reside in the `scraper/` directory. Each scraper is a class named after the service (e.g., `google.php` contains `class google`).
- **Methods:** Typically implement `web()`, `images()`, `videos()`, `news()`.
- **Initialization:** Scrapers should initialize `fuckhtml` and `backend` in their constructor.
- **Error Handling:** Throw `Exception` for failures.
- **Interface:** Scrapers return structured arrays (e.g., with `status`, `web`, `npt` keys).

### 2. Template System
The PHP frontend uses a simple replacement system in `lib/frontend.php`.
- Templates are located in `template/`.
- Placeholders use the format `{%variable_name%}`.
- Logic should be kept out of templates; they should only contain HTML and placeholders.

### 3. Configuration
Central configuration is managed in `data/config.php` via the `config` class constants. Use `config::CONSTANT_NAME` to access these throughout the application.

### 4. Proxy Management
`lib/backend.php` handles proxy rotation. Proxy lists are stored in `data/proxies/*.txt`.

### 5. Cookie Management
- **PHP:** Use `$frontend->set_cookie($name, $value, $expire)` to ensure consistent cookie attributes (`SameSite=Lax`, `Secure`, `Path=/`).
- **Frontend:** Search preferences (like scrapers) are stored in cookies (`scraper_web`, `scraper_images`, etc.) and should be read as defaults if not present in the URL.

### 6. Oracles
Oracles in the `oracles/` directory provide specialized "instant answer" functionality (e.g., calculator, time, unit conversion).

### 6. Audio Proxies
The `audio/` directory contains proxies for streaming audio from services like SoundCloud and Spotify without direct client-to-service communication.

## Coding Standards & Conventions

### PHP Style
- **Indentation:** Use tabs for indentation.
- **Control Structures:** 
  - `if(condition){` (No space after `if`, no space between `)` and `{`).
  - `foreach($items as $item){`
- **Naming:** 
  - Classes: lowercase (e.g., `class google`, `class backend`).
  - Methods: lowercase (e.g., `public function web($get)`).
  - Variables: `$snake_case`.
- **Security:** Always use `htmlspecialchars()` when echoing user-controlled data into HTML. Use `rawurlencode()` for URL parameters.

### HTML/CSS
- **Accessibility:** Ensure the interface remains functional without JavaScript.
- **Themes:** Themes are stored in `static/themes/` as CSS files.

## Workflow & Development
- **New Scraper:** Follow the pattern in `scraper/google.php`. Ensure you handle "Next Page Tokens" (NPT) correctly using `$this->backend->store()`.
- **Testing:** Since there is no formal test suite, manually verify scraper changes against the respective search engine's live HTML structure.
- **Documentation:** Update files in `docs/` for any significant changes to installation or configuration.

## Security Mandates
- **Credential Protection:** Never hardcode API keys. Use `data/api_keys/` or environment variables if applicable (though the project primarily uses text files).
- **Privacy:** 4get is privacy-focused. Ensure no user data (IPs, search queries) is logged or leaked to third-party scrapers beyond what is strictly necessary for the request.
