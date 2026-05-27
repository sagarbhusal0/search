mod cache;
mod config;
mod errors;
mod routes;
mod scraper;
mod types;

use axum::Router;
use cache::CacheStore;
use clap::Parser;
use config::Config;
use routes::AppState;
use scraper::build_registry;
use scraper::client::HttpClient;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::compression::CompressionLayer;
use tracing_subscriber::EnvFilter;

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

    let http = HttpClient::new(&config).expect("Failed to create HTTP client");

    let cache = CacheStore::open(&config.data_path("cache"))
        .expect("Failed to open cache");

    let registry = build_registry(http.clone(), &config);

    let state = Arc::new(AppState {
        config,
        http,
        cache,
        scraper_registry: registry,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let compression = CompressionLayer::new()
        .gzip(true)
        .br(true);

    let app = Router::new()
        .nest("/api/v1", routes::api_routes())
        .nest("/", routes::static_routes())
        .layer(cors)
        .layer(compression)
        .with_state(state);

    let addr = format!("{}:{}", &state.config.server.host, state.config.server.port);
    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
