use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use std::fmt;

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    BadRequest(String),
    ScraperError(String),
    ScraperNotSupported(String),
    CacheError(String),
    ProxyError(String),
    ImageError(String),
    IoError(std::io::Error),
    ReqwestError(reqwest::Error),
    SerdeError(serde_json::Error),
    Internal(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::BadRequest(msg) => write!(f, "Bad request: {}", msg),
            AppError::ScraperError(msg) => write!(f, "Scraper error: {}", msg),
            AppError::ScraperNotSupported(msg) => write!(f, "Scraper not supported: {}", msg),
            AppError::CacheError(msg) => write!(f, "Cache error: {}", msg),
            AppError::ProxyError(msg) => write!(f, "Proxy error: {}", msg),
            AppError::ImageError(msg) => write!(f, "Image error: {}", msg),
            AppError::IoError(e) => write!(f, "IO error: {}", e),
            AppError::ReqwestError(e) => write!(f, "HTTP error: {}", e),
            AppError::SerdeError(e) => write!(f, "Serialization error: {}", e),
            AppError::Internal(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::IoError(e)
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::ReqwestError(e)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::SerdeError(e)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::ScraperNotSupported(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        let body = json!({
            "status": message,
        });

        (status, Json(body)).into_response()
    }
}
