use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct Pexels {
    http: HttpClient,
}

impl Pexels {
    pub fn new(http: HttpClient) -> Self {
        Pexels { http }
    }
}

#[async_trait]
impl Scraper for Pexels {
    fn name(&self) -> &str {
        "pexels"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.pexels.com/v1/search")
            .query(&[("query", query.q.as_str()), ("per_page", "20")])
            .header("Accept", "application/json")
            .header("User-Agent", &self.http.user_agent_friendly)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = ImageResponse::empty();

        if let Some(photos) = resp.get("photos").and_then(|v| v.as_array()) {
            for photo in photos {
                let alt = photo.get("alt").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let width = photo.get("width").and_then(|v| v.as_u64());
                let height = photo.get("height").and_then(|v| v.as_u64());

                if let Some(src) = photo.get("src") {
                    let original = src.get("original").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let medium = src.get("medium").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let small = src.get("small").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let tiny = src.get("tiny").and_then(|v| v.as_str()).unwrap_or("").to_string();

                    let primary = if !medium.is_empty() { medium } else { original };

                    if !primary.is_empty() {
                        let mut sources = vec![ImageSource {
                            url: primary,
                            width: width.map(|w| w as u32),
                            height: height.map(|h| h as u32),
                        }];
                        let thumb = if !small.is_empty() { small } else { tiny };
                        if !thumb.is_empty() {
                            sources.push(ImageSource {
                                url: thumb,
                                width: None,
                                height: None,
                            });
                        }
                        response.image.push(ImageResult { title: alt, url: sources[0].url.clone(), source: sources });
                    }
                }
            }
        }

        Ok(response)
    }
}
