use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use regex::Regex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::OnceLock;

static CACHED_CLIENT_ID: OnceLock<String> = OnceLock::new();
static EXTRACT_FAILED: AtomicBool = AtomicBool::new(false);

pub struct SoundCloud {
    http: HttpClient,
}

impl SoundCloud {
    pub fn new(http: HttpClient) -> Self {
        SoundCloud { http }
    }

    fn hardcoded_client_id() -> &'static str {
        "IRnK0myxxLJdwXXjybXQo71mXyDGpaM6"
    }

    async fn get_client_id(&self) -> Result<String, AppError> {
        if let Some(id) = CACHED_CLIENT_ID.get() {
            return Ok(id.clone());
        }

        if EXTRACT_FAILED.load(Ordering::Relaxed) {
            return Ok(Self::hardcoded_client_id().to_string());
        }

        match self.extract_client_id().await {
            Ok(id) => {
                let _ = CACHED_CLIENT_ID.set(id.clone());
                Ok(id)
            }
            Err(e) => {
                tracing::warn!("SoundCloud client_id extraction failed: {}, using hardcoded", e);
                EXTRACT_FAILED.store(true, Ordering::Relaxed);
                Ok(Self::hardcoded_client_id().to_string())
            }
        }
    }

    async fn extract_client_id(&self) -> Result<String, AppError> {
        let client = reqwest::Client::builder()
            .user_agent(&self.http.user_agent)
            .connect_timeout(std::time::Duration::from_secs(10))
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(AppError::ReqwestError)?;

        let html = client
            .get("https://soundcloud.com/")
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .send()
            .await
            .map_err(AppError::ReqwestError)?
            .text()
            .await
            .map_err(AppError::ReqwestError)?;

        let re = Regex::new(r#"client_id[:=\s]+['"]([a-zA-Z0-9_-]{30,40})['"]"#).unwrap();
        if let Some(c) = re.captures(&html).and_then(|c| c.get(1)) {
            return Ok(c.as_str().to_string());
        }

        let re_script = Regex::new(r#"src="(https?://[^"]*sndcdn[^"]*\.js)""#).unwrap();
        for cap in re_script.captures_iter(&html) {
            let js_url = cap.get(1).unwrap().as_str();

            if let Ok(js_text) = client
                .get(js_url)
                .header("Accept", "*/*")
                .header("Referer", "https://soundcloud.com/")
                .send()
                .await
                .and_then(|r| Ok(r.text()))
            {
                if let Ok(js) = js_text.await {
                    if let Some(c) = re.captures(&js).and_then(|c| c.get(1)) {
                        return Ok(c.as_str().to_string());
                    }
                }
            }
        }

        Err(AppError::ScraperError(
            "Failed to extract SoundCloud client_id".into(),
        ))
    }
}

#[async_trait]
impl Scraper for SoundCloud {
    fn name(&self) -> &str {
        "sc"
    }

    async fn music(&self, query: &SearchQuery) -> Result<MusicResponse, AppError> {
        let client_id = self.get_client_id().await?;

        let offset = query.page * 10;

        let client = reqwest::Client::builder()
            .user_agent(&self.http.user_agent)
            .connect_timeout(std::time::Duration::from_secs(10))
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(AppError::ReqwestError)?;

        let text = client
            .get("https://api-v2.soundcloud.com/search/tracks")
            .query(&[
                ("q", query.q.as_str()),
                ("client_id", &client_id),
                ("limit", "10"),
                ("offset", &offset.to_string()),
            ])
            .header("Accept", "application/json")
            .header("Referer", "https://soundcloud.com/")
            .send()
            .await
            .map_err(AppError::ReqwestError)?
            .text()
            .await
            .map_err(AppError::ReqwestError)?;

        let resp: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| AppError::ScraperError(format!("SoundCloud API parse error: {}", e)))?;

        let mut response = MusicResponse::empty();

        if let Some(collection) = resp.get("collection").and_then(|v| v.as_array()) {
            for item in collection {
                let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let author = item
                    .get("user")
                    .and_then(|u| u.get("username"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let duration = item.get("duration").and_then(|v| v.as_i64()).map(|d| d / 1000);
                let permalink = item.get("permalink_url").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let artwork = item.get("artwork_url").and_then(|v| v.as_str()).map(|s| {
                    s.replace("-large", "-t300x300")
                });
                let stream_url = item.get("stream_url").and_then(|v| v.as_str()).unwrap_or("").to_string();

                if !title.is_empty() {
                    response.song.push(SongResult {
                        title,
                        author,
                        duration,
                        stream: SongStream {
                            endpoint: "sc".to_string(),
                            url: if !stream_url.is_empty() {
                                format!("{}?client_id={}", stream_url, client_id)
                            } else {
                                String::new()
                            },
                        },
                        url: Some(permalink),
                        thumb: artwork,
                    });
                }
            }
        }

        Ok(response)
    }

    async fn autocomplete(&self, query: &str) -> Result<Vec<String>, AppError> {
        let client_id = self.get_client_id().await?;

        let client = reqwest::Client::builder()
            .user_agent(&self.http.user_agent)
            .connect_timeout(std::time::Duration::from_secs(10))
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(AppError::ReqwestError)?;

        let text = client
            .get("https://api-v2.soundcloud.com/search/queries")
            .query(&[("q", query), ("client_id", &client_id), ("limit", "10")])
            .header("Accept", "application/json")
            .header("Referer", "https://soundcloud.com/")
            .send()
            .await
            .map_err(AppError::ReqwestError)?
            .text()
            .await
            .map_err(AppError::ReqwestError)?;

        let resp: serde_json::Value = serde_json::from_str(&text)
            .map_err(|e| AppError::ScraperError(format!("SoundCloud API parse error: {}", e)))?;

        let suggestions = resp
            .get("collection")
            .and_then(|v| v.as_array())
            .into_iter()
            .flat_map(|arr| arr.iter())
            .filter_map(|v| v.get("query").and_then(|q| q.as_str()).map(|s| s.to_string()))
            .collect();

        Ok(suggestions)
    }
}
