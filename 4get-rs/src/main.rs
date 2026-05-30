mod cache;
mod config;
mod errors;
mod routes;
mod scraper;
mod types;

use axum::Router;
use axum::extract::{State, Request};
use axum::http::{HeaderValue, StatusCode, header};
use axum::middleware;
use axum::response::Response;
use cache::CacheStore;
use clap::Parser;
use config::Config;
use routes::{AppState, SharedState};
use scraper::build_registry;
use scraper::client::HttpClient;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer, AllowOrigin};
use tower_http::compression::CompressionLayer;
use tracing_subscriber::EnvFilter;

async fn security_headers_mw(
    request: axum::extract::Request,
    next: middleware::Next,
) -> Response {
    let mut response: Response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(header::CONTENT_SECURITY_POLICY, HeaderValue::from_static("default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'"));
    headers.insert(header::STRICT_TRANSPORT_SECURITY, HeaderValue::from_static("max-age=31536000; includeSubDomains"));
    headers.insert(header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    headers.insert(header::REFERRER_POLICY, HeaderValue::from_static("strict-origin-when-cross-origin"));
    response
}

async fn auth_mw(
    State(state): State<SharedState>,
    request: axum::extract::Request,
    next: middleware::Next,
) -> Result<Response, (StatusCode, &'static str)> {
    let api_key = &state.config.auth.api_key;
    if let Some(key) = api_key {
        if !key.is_empty() {
            let provided = request
                .headers()
                .get("X-API-Key")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("");
            if provided != key {
                return Err((StatusCode::UNAUTHORIZED, "Invalid or missing API key"));
            }
        }
    }
    Ok(next.run(request).await)
}

#[derive(Parser)]
struct Args {
    #[arg(short, long, default_value = "config.toml")]
    config: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let args = Args::parse();
    let config = Config::load(&args.config).expect("Failed to load config");

    let mut http = HttpClient::new(&config).expect("Failed to create HTTP client");

    for (scraper_name, proxy_path) in &config.proxies {
        if let Some(path) = proxy_path {
            match http.load_proxy_pool(scraper_name, path) {
                Ok(()) => {
                    let count = http.get_proxy_pool(scraper_name).map_or(0, |p| p.proxies.len());
                    if count > 0 {
                        tracing::info!("Loaded {} proxies for {}", count, scraper_name);
                    } else {
                        tracing::info!("No proxies configured for {} (direct connections)", scraper_name);
                    }
                }
                Err(e) => tracing::warn!("Failed to load proxies for {}: {}", scraper_name, e),
            }
        }
    }

    let cache = CacheStore::open(&config.data_path("cache"))
        .expect("Failed to open cache");

    let registry = build_registry(http.clone(), &config);

    let state = Arc::new(AppState {
        config,
        http,
        cache,
        scraper_registry: registry,
    });

    let allowed_origins = if state.config.cors.allowed_origins.is_empty() {
        vec!["http://localhost:3000".to_string(), "http://localhost:3001".to_string()]
    } else {
        state.config.cors.allowed_origins.clone()
    };

    let origins: Vec<HeaderValue> = allowed_origins
        .iter()
        .filter_map(|o| o.parse().ok())
        .collect();

    let cors = if origins.is_empty() {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    } else {
        CorsLayer::new()
            .allow_origin(AllowOrigin::list(origins))
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let compression = CompressionLayer::new()
        .gzip(true)
        .br(true);

    let app = Router::new()
        .nest("/api/v1", routes::api_routes())
        .merge(routes::static_routes())
        .layer(middleware::from_fn(security_headers_mw))
        .layer(cors)
        .layer(compression)
        .with_state(state.clone());

    let app = if state.config.auth.api_key.as_deref().map_or(true, |k| k.is_empty()) {
        app
    } else {
        app.layer(middleware::from_fn_with_state(state.clone(), auth_mw))
    };

    let addr = format!("{}:{}", &state.config.server.host, state.config.server.port);
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
