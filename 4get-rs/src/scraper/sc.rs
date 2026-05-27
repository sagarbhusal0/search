use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct SoundCloud {
    http: HttpClient,
}

impl SoundCloud {
    pub fn new(http: HttpClient) -> Self {
        SoundCloud { http }
    }

    fn client_id() -> &'static str {
        "a3e059563d7fd3372b49b37f00a00bcf"
    }

    async fn get_client_id(&self) -> Result<String, AppError> {
        Ok(Self::client_id().to_string())
    }
}

#[async_trait]
impl Scraper for SoundCloud {
    fn name(&self) -> &str {
        "sc"
    }

    async fn music(&self, query: &SearchQuery) -> Result<MusicResponse, AppError> {
        let client_id = self.get_client_id().await?;

        let resp = self
            .http
            .client
            .get("https://api-v2.soundcloud.com/search/tracks")
            .query(&[
                ("q", query.q.as_str()),
                ("client_id", &client_id),
                ("limit", "10"),
                ("offset", "0"),
            ])
            .header("Accept", "application/json, text/javascript, */*; q=0.01")
            .header("Referer", "https://soundcloud.com/")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

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
                let artwork = item.get("artwork_url").and_then(|v| v.as_str()).map(|s| s.to_string());
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

        let resp = self
            .http
            .client
            .get("https://api-v2.soundcloud.com/search/queries")
            .query(&[("q", query), ("client_id", &client_id), ("limit", "10")])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

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
