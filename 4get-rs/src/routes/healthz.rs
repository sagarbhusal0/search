use crate::routes::SharedState;
use axum::extract::State;
use axum::Json;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
pub struct HealthzResponse {
    pub status: String,
    pub service: String,
    pub version: u32,
    pub timestamp: i64,
}

pub async fn healthz(State(state): State<SharedState>) -> Json<HealthzResponse> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    Json(HealthzResponse {
        status: "ok".to_string(),
        service: state.config.server.name.clone(),
        version: 1,
        timestamp,
    })
}
