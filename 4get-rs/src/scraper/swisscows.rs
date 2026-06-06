use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct Swisscows {
    http: HttpClient,
}

impl Swisscows {
    pub fn new(http: HttpClient) -> Self {
        Swisscows { http }
    }
}

#[async_trait]
impl Scraper for Swisscows {
    fn name(&self) -> &str {
        "swisscows"
    }

    async fn music(&self, query: &SearchQuery) -> Result<MusicResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://swisscows.com/api/music/search")
            .query(&[("query", query.q.as_str()), ("itemsCount", "10")])
            .header("Accept", "application/json")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = MusicResponse::empty();

        if let Some(items) = resp.as_array() {
            for item in items {
                let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let author = item.get("author").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let duration = item.get("duration").and_then(|v| v.as_i64());
                let url = item.get("url").and_then(|v| v.as_str()).map(|s| s.to_string());

                if !title.is_empty() {
                    response.song.push(SongResult {
                        title,
                        author,
                        duration,
                        stream: SongStream {
                            endpoint: "linear".to_string(),
                            url: url.clone().unwrap_or_default(),
                        },
                        url,
                        thumb: None,
                    });
                }
            }
        }

        Ok(response)
    }
}
