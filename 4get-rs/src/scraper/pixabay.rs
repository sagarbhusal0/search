use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct Pixabay {
    http: HttpClient,
}

impl Pixabay {
    pub fn new(http: HttpClient) -> Self {
        Pixabay { http }
    }
}

#[async_trait]
impl Scraper for Pixabay {
    fn name(&self) -> &str {
        "pixabay"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://pixabay.com/api/")
            .query(&[
                ("key", "44065810-135ef171765e71adba780c5a6"),
                ("q", query.q.as_str()),
                ("per_page", "20"),
                ("safesearch", if matches!(query.nsfw, crate::types::NsfwLevel::Yes) { "false" } else { "true" }),
            ])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = ImageResponse::empty();

        if let Some(hits) = resp.get("hits").and_then(|v| v.as_array()) {
            for hit in hits {
                let title = hit.get("tags").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let web_url = hit.get("webformatURL").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let preview = hit.get("previewURL").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let width = hit.get("webformatWidth").and_then(|v| v.as_u64());
                let height = hit.get("webformatHeight").and_then(|v| v.as_u64());

                if !web_url.is_empty() {
                    let mut sources = vec![ImageSource {
                        url: web_url,
                        width: width.map(|w| w as u32),
                        height: height.map(|h| h as u32),
                    }];
                    if !preview.is_empty() {
                        sources.push(ImageSource {
                            url: preview,
                            width: None,
                            height: None,
                        });
                    }
                    response.image.push(ImageResult { title, source: sources });
                }
            }
        }

        Ok(response)
    }
}
