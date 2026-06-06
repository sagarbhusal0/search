use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct Spotify {
    http: HttpClient,
}

impl Spotify {
    pub fn new(http: HttpClient) -> Self {
        Spotify { http }
    }
}

#[async_trait]
impl Scraper for Spotify {
    fn name(&self) -> &str {
        "spotify"
    }

    async fn music(&self, query: &SearchQuery) -> Result<MusicResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.spotify.com/v1/search")
            .query(&[
                ("q", query.q.as_str()),
                ("type", "track"),
                ("limit", "10"),
            ])
            .header("Accept", "application/json")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = MusicResponse::empty();

        if let Some(items) = resp
            .get("tracks")
            .and_then(|t| t.get("items"))
            .and_then(|v| v.as_array())
        {
            for item in items {
                let title = item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let author = item
                    .get("artists")
                    .and_then(|a| a.as_array())
                    .and_then(|a| a.first())
                    .and_then(|a| a.get("name"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let duration = item.get("duration_ms").and_then(|v| v.as_i64()).map(|d| d / 1000);
                let preview = item.get("preview_url").and_then(|v| v.as_str()).map(|s| s.to_string());
                let track_url = item
                    .get("external_urls")
                    .and_then(|e| e.get("spotify"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                let album_img = item
                    .get("album")
                    .and_then(|a| a.get("images"))
                    .and_then(|i| i.as_array())
                    .and_then(|a| a.first())
                    .and_then(|i| i.get("url"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                if !title.is_empty() {
                    response.song.push(SongResult {
                        title,
                        author,
                        duration,
                        stream: SongStream {
                            endpoint: "spotify".to_string(),
                            url: preview.unwrap_or_default(),
                        },
                        url: track_url,
                        thumb: album_img,
                    });
                }
            }
        }

        Ok(response)
    }
}
