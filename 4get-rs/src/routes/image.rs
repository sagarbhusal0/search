use crate::errors::AppError;
use crate::routes::SharedState;
use crate::types::*;
use axum::extract::{Query, State};
use axum::Json;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize)]
pub struct ImageSearchParams {
    pub s: Option<String>,
    pub scraper: Option<String>,
    pub p: Option<u32>,
    pub npt: Option<String>,
    pub nsfw: Option<String>,
    pub safe: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, String>,
}

pub async fn image_search(
    State(state): State<SharedState>,
    Query(params): Query<ImageSearchParams>,
) -> Result<Json<ImageResponse>, AppError> {
    let query = params.s.as_deref().unwrap_or("");
    if query.is_empty() {
        return Ok(Json(ImageResponse::empty()));
    }

    let scraper_name = params.scraper.as_deref().unwrap_or("pixabay");
    let scraper = state
        .scraper_registry
        .get(scraper_name)
        .ok_or_else(|| AppError::ScraperNotSupported(format!("Scraper '{}' not found", scraper_name)))?;

    let nsfw = match params.nsfw.as_deref() {
        Some("yes") => NsfwLevel::Yes,
        Some("maybe") => NsfwLevel::Maybe,
        _ => NsfwLevel::No,
    };

    let search_query = SearchQuery {
        q: query.to_string(),
        page: params.p.unwrap_or(1).saturating_sub(1),
        nsfw,
        safe: params.safe.as_deref() == Some("1"),
        spellcheck: true,
        filters: HashMap::new(),
        npt: params.npt,
        extended_search: false,
    };

    let response = scraper.image(&search_query).await?;
    Ok(Json(response))
}
