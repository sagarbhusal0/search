use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode, header};
use axum::response::{IntoResponse, Response};
use scraper::{Html, Selector};
use serde::Deserialize;
use std::io::Cursor;
use std::path::Path;

use crate::errors::AppError;
use crate::routes::SharedState;

#[derive(Deserialize)]
pub struct FaviconParams {
    pub s: Option<String>,
}

fn default_favicon() -> Vec<u8> {
    let mut img = image::ImageBuffer::new(16, 16);
    for pixel in img.pixels_mut() {
        *pixel = image::Rgba([200u8, 200u8, 200u8, 255u8]);
    }
    let mut buf = Cursor::new(Vec::new());
    let _ = img.write_to(&mut buf, image::ImageFormat::Png);
    buf.into_inner()
}

pub async fn favicon_proxy(
    State(state): State<SharedState>,
    Query(params): Query<FaviconParams>,
) -> Result<Response, AppError> {
    let site_url = params.s.as_deref().ok_or_else(|| AppError::BadRequest("Missing site (s) parameter".into()))?;

    if !site_url.starts_with("http://") && !site_url.starts_with("https://") {
        return Err(AppError::BadRequest("Only provide the protocol and domain".into()));
    }

    let domain = site_url
        .strip_prefix("https://")
        .or_else(|| site_url.strip_prefix("http://"))
        .unwrap_or(site_url);

    let icons_dir = state.config.data_path("icons");

    let cached_path = Path::new(&icons_dir).join(format!("{}.png", domain));
    if cached_path.exists() {
        let data = tokio::fs::read(&cached_path).await.unwrap_or_else(|_| default_favicon());
        let mut headers = HeaderMap::new();
        headers.insert(header::CONTENT_TYPE, "image/png".parse().unwrap());
        headers.insert(header::CACHE_CONTROL, "public, max-age=86400".parse().unwrap());
        headers.insert(
            header::CONTENT_DISPOSITION,
            format!("inline; filename=\"{}.png\"", domain).parse().unwrap(),
        );
        return Ok((headers, data).into_response());
    }

    let html = match state.http.client.get(site_url).send().await {
        Ok(r) => r.text().await.unwrap_or_default(),
        Err(_) => {
            return fallback_google_favicon(&state, domain, &icons_dir).await;
        }
    };

    let href = extract_favicon_href(&html, site_url);

    let favicon_url = match href {
        Some(url) => resolve_url(&url, site_url),
        None => format!("{}/favicon.ico", site_url.trim_end_matches('/')),
    };

    match fetch_and_process_favicon(&state, &favicon_url, domain, &icons_dir).await {
        Ok(data) => {
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, "image/png".parse().unwrap());
            headers.insert(header::CACHE_CONTROL, "public, max-age=86400".parse().unwrap());
            headers.insert(
                header::CONTENT_DISPOSITION,
                format!("inline; filename=\"{}.png\"", domain).parse().unwrap(),
            );
            Ok((headers, data).into_response())
        }
        Err(_) => fallback_google_favicon(&state, domain, &icons_dir).await,
    }
}

fn extract_favicon_href(html: &str, base_url: &str) -> Option<String> {
    let document = Html::parse_document(html);
    let link_sel = Selector::parse("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon'], link[rel='mask-icon']").ok()?;

    let mut candidates: Vec<(i32, String)> = Vec::new();

    for element in document.select(&link_sel) {
        let rel = element.value().attr("rel")?;
        let href = element.value().attr("href")?;
        let priority = match rel.to_lowercase().as_str() {
            "icon" => 0,
            "shortcut icon" => 1,
            "apple-touch-icon" => 2,
            "mask-icon" => 3,
            _ => continue,
        };
        let href_resolved = resolve_url(href, base_url);
        candidates.push((priority, href_resolved));
    }

    candidates.sort_by_key(|(p, _)| *p);
    candidates.into_iter().next().map(|(_, url)| url)
}

fn resolve_url(href: &str, base: &str) -> String {
    if href.starts_with("http://") || href.starts_with("https://") || href.starts_with("//") {
        if href.starts_with("//") {
            format!("https:{}", href)
        } else {
            href.to_string()
        }
    } else if href.starts_with('/') {
        let parsed = url::Url::parse(base).ok();
        match parsed {
            Some(u) => format!("{}://{}{}", u.scheme(), u.host_str().unwrap_or(""), href),
            None => format!("{}{}", base.trim_end_matches('/'), href),
        }
    } else {
        format!("{}/{}", base.trim_end_matches('/'), href.trim_start_matches('/'))
    }
}

async fn fetch_and_process_favicon(
    state: &SharedState,
    url: &str,
    domain: &str,
    icons_dir: &str,
) -> Result<Vec<u8>, AppError> {
    let resp = state
        .http
        .client
        .get(url)
        .send()
        .await
        .map_err(|_| AppError::ProxyError("Failed to fetch favicon".into()))?;

    let bytes = resp.bytes().await.map_err(|_| AppError::ProxyError("Failed to read favicon".into()))?;

    let img = match image::load_from_memory(&bytes) {
        Ok(img) => img,
        Err(_) => return Err(AppError::ImageError("Failed to decode favicon".into())),
    };

    let resized = img.resize_exact(16, 16, image::imageops::FilterType::Lanczos3);

    let mut buf = Cursor::new(Vec::new());
    resized
        .write_to(&mut buf, image::ImageFormat::Png)
        .map_err(|_| AppError::ImageError("Failed to encode favicon as PNG".into()))?;

    let png_data = buf.into_inner();

    if let Err(e) = tokio::fs::create_dir_all(icons_dir).await {
        tracing::warn!("Failed to create icons dir: {}", e);
    }
    if let Err(e) = tokio::fs::write(Path::new(icons_dir).join(format!("{}.png", domain)), &png_data).await {
        tracing::warn!("Failed to cache favicon: {}", e);
    }

    Ok(png_data)
}

async fn fallback_google_favicon(
    state: &SharedState,
    domain: &str,
    icons_dir: &str,
) -> Result<Response, AppError> {
    let url = format!(
        "https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://{}&size=16",
        domain
    );

    match state.http.client.get(&url).send().await {
        Ok(resp) => {
            let bytes = resp.bytes().await.unwrap_or_default();
            if !bytes.is_empty() {
                if let Err(e) = tokio::fs::create_dir_all(icons_dir).await {
                    tracing::warn!("Failed to create icons dir: {}", e);
                }
                if let Err(e) = tokio::fs::write(Path::new(icons_dir).join(format!("{}.png", domain)), &bytes).await {
                    tracing::warn!("Failed to cache favicon: {}", e);
                }
                let mut headers = HeaderMap::new();
                headers.insert(header::CONTENT_TYPE, "image/png".parse().unwrap());
                headers.insert(header::CACHE_CONTROL, "public, max-age=86400".parse().unwrap());
                return Ok((headers, bytes).into_response());
            }
        }
        Err(_) => {}
    }

    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "image/png".parse().unwrap());
    headers.insert(header::CACHE_CONTROL, "public, max-age=86400".parse().unwrap());
    Ok((StatusCode::NOT_FOUND, headers, default_favicon()).into_response())
}
