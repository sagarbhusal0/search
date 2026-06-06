use axum::body::Body;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, header};
use axum::response::{IntoResponse, Response};
use serde::Deserialize;
use std::io::Cursor;

use crate::errors::AppError;
use crate::routes::SharedState;

#[derive(Deserialize)]
pub struct ProxyParams {
    pub i: Option<String>,
    pub s: Option<String>,
}

fn is_private_ip(host: &str) -> bool {
    if host.starts_with("10.") {
        return true;
    }
    if let Some(rest) = host.strip_prefix("172.") {
        if let Some(doctet) = rest.split('.').next() {
            if let Ok(n) = doctet.parse::<u8>() {
                return (16..=31).contains(&n);
            }
        }
    }
    if host.starts_with("192.168.") {
        return true;
    }
    false
}

fn is_safe_url(url: &str) -> bool {
    let Ok(parsed) = url::Url::parse(url) else {
        return false;
    };
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return false;
    }
    let host = parsed.host_str().unwrap_or("");
    if host == "localhost"
        || host == "127.0.0.1"
        || host == "0.0.0.0"
        || host == "[::1]"
        || host == "169.254.169.254"
        || host == "metadata.google.internal"
        || host == "metadata.std.internal"
        || host == "metadata"
        || host.ends_with(".internal")
        || host.ends_with(".local")
        || is_private_ip(host)
    {
        return false;
    }
    true
}

fn resize_size(s: &str, img_w: u32, img_h: u32) -> (u32, u32) {
    let (max_w, max_h) = match s {
        "portrait" => (50, 90),
        "landscape" => (160, 90),
        "square" => (90, 90),
        "thumb" => (236, 180),
        "cover" => (207, 270),
        _ => return (img_w, img_h),
    };

    let mut w = img_w;
    let mut h = img_h;
    let ratio = w as f64 / h as f64;

    if w > max_w {
        w = max_w;
        h = (w as f64 / ratio).round() as u32;
    }
    if h > max_h {
        h = max_h;
        w = (h as f64 * ratio).round() as u32;
    }

    (w, h)
}

pub async fn image_proxy(
    State(state): State<SharedState>,
    Query(params): Query<ProxyParams>,
) -> Result<Response, AppError> {
    let url = params.i.as_deref().ok_or_else(|| AppError::BadRequest("Missing url (i) parameter".into()))?;

    if !is_safe_url(url) {
        return Err(AppError::BadRequest("Invalid or disallowed URL".into()));
    }

    let resp = state
        .http
        .client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::ProxyError(format!("Failed to fetch image: {}", e)))?;

    let status = resp.status();
    if !status.is_success() {
        return Err(AppError::ProxyError(format!("Upstream returned {}", status)));
    }

    let content_type = resp
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = resp.bytes().await.map_err(|e| AppError::ProxyError(format!("Failed to read body: {}", e)))?;

    let size = params.s.as_deref().unwrap_or("original");

    if size == "original" {
        let mut headers = HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, content_type.parse().unwrap());
        headers.insert(header::CACHE_CONTROL, "public, max-age=86400, immutable".parse().unwrap());
        return Ok((headers, Body::from(bytes)).into_response());
    }

    match image::load_from_memory(&bytes) {
        Ok(img) => {
            let (w, h) = resize_size(size, img.width(), img.height());
            let resized = img.resize_exact(w, h, image::imageops::FilterType::Lanczos3);
            let mut buf = Cursor::new(Vec::new());
            resized.write_to(&mut buf, image::ImageFormat::Jpeg)
                .map_err(|e| AppError::ImageError(format!("Failed to encode: {}", e)))?;

            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, "image/jpeg".parse().unwrap());
            headers.insert(header::CACHE_CONTROL, "public, max-age=86400, immutable".parse().unwrap());
            Ok((headers, Body::from(buf.into_inner())).into_response())
        }
        Err(_) => {
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, content_type.parse().unwrap());
            headers.insert(header::CACHE_CONTROL, "public, max-age=86400, immutable".parse().unwrap());
            Ok((headers, Body::from(bytes)).into_response())
        }
    }
}
