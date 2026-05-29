use crate::errors::AppError;
use crate::routes::SharedState;
use crate::types::AutocompleteResponse;
use axum::extract::{Query, State};
use axum::Json;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct AutocompleteParams {
    pub s: Option<String>,
    pub scraper: Option<String>,
    #[allow(dead_code)]
    pub nsfw: Option<String>,
}

pub async fn autocomplete(
    State(state): State<SharedState>,
    Query(params): Query<AutocompleteParams>,
) -> Result<Json<AutocompleteResponse>, AppError> {
    let query = params.s.as_deref().unwrap_or("");
    if query.is_empty() {
        return Ok(Json(AutocompleteResponse {
            status: "ok".to_string(),
            suggestions: vec![],
        }));
    }

    let scraper_name = params.scraper.as_deref().unwrap_or("brave");
    let scraper = state
        .scraper_registry
        .get(scraper_name)
        .ok_or_else(|| AppError::ScraperNotSupported(format!("Scraper '{}' not found", scraper_name)))?;

    let suggestions = scraper.autocomplete(query).await?;

    Ok(Json(AutocompleteResponse {
        status: "ok".to_string(),
        suggestions,
    }))
}
