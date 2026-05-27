pub mod ac;
pub mod favicon;
pub mod healthz;
pub mod image;
pub mod music;
pub mod news;
pub mod proxy;
pub mod video;
pub mod web;

use crate::cache::CacheStore;
use crate::config::Config;
use crate::scraper::client::HttpClient;
use crate::scraper::ScraperRegistry;
use axum::routing::{get, Router};
use axum::Router as AxumRouter;
use std::sync::Arc;

pub struct AppState {
    pub config: Config,
    pub http: HttpClient,
    pub cache: CacheStore,
    pub scraper_registry: ScraperRegistry,
}

pub type SharedState = Arc<AppState>;

pub fn api_routes() -> AxumRouter<SharedState> {
    AxumRouter::new()
        .route("/web.php", get(web::web_search))
        .route("/images.php", get(image::image_search))
        .route("/videos.php", get(video::video_search))
        .route("/news.php", get(news::news_search))
        .route("/music.php", get(music::music_search))
        .route("/ac.php", get(ac::autocomplete))
}

pub fn static_routes() -> AxumRouter<SharedState> {
    AxumRouter::new()
        .route("/healthz.php", get(healthz::healthz))
        .route("/proxy.php", get(proxy::image_proxy))
        .route("/favicon.php", get(favicon::favicon_proxy))
}
