use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct Unsplash {
    http: HttpClient,
}

impl Unsplash {
    pub fn new(http: HttpClient) -> Self {
        Unsplash { http }
    }
}

#[async_trait]
impl Scraper for Unsplash {
    fn name(&self) -> &str {
        "unsplash"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.unsplash.com/search/photos")
            .query(&[
                ("query", query.q.as_str()),
                ("per_page", "20"),
            ])
            .header("Accept", "application/json")
            .header("User-Agent", &self.http.user_agent_friendly)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = ImageResponse::empty();

        if let Some(results) = resp.get("results").and_then(|v| v.as_array()) {
            for result in results {
                let title = result.get("alt_description").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let description = result.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let title = if title.is_empty() { description } else { title };

                if let Some(urls) = result.get("urls") {
                    let full = urls.get("full").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let thumb = urls.get("thumb").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let small = urls.get("small").and_then(|v| v.as_str()).unwrap_or("").to_string();

                    let width = result.get("width").and_then(|v| v.as_u64());
                    let height = result.get("height").and_then(|v| v.as_u64());
                    let primary = if !small.is_empty() { small } else { full };

                    if !primary.is_empty() {
                        let mut sources = vec![ImageSource {
                            url: primary,
                            width: width.map(|w| w as u32),
                            height: height.map(|h| h as u32),
                        }];
                        if !thumb.is_empty() {
                            sources.push(ImageSource {
                                url: thumb,
                                width: None,
                                height: None,
                            });
                        }
                        response.image.push(ImageResult { title, url: sources[0].url.clone(), source: sources });
                    }
                }
            }
        }

        Ok(response)
    }
}
