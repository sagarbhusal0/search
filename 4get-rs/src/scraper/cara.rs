use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct Cara {
    http: HttpClient,
}

impl Cara {
    pub fn new(http: HttpClient) -> Self {
        Cara { http }
    }
}

#[async_trait]
impl Scraper for Cara {
    fn name(&self) -> &str {
        "cara"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!("https://cara.app/api/search?q={}&type=posts", urlencoding(&query.q));

        let resp = self
            .http
            .client
            .get(&url)
            .header("Accept", "application/json")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = ImageResponse::empty();

        if let Some(posts) = resp.as_array() {
            for post in posts {
                let title = post.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let images = post
                    .get("images")
                    .and_then(|v| v.as_array())
                    .cloned()
                    .unwrap_or_default();

                for img in &images {
                    let img_url = img.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let width = img.get("width").and_then(|v| v.as_u64());
                    let height = img.get("height").and_then(|v| v.as_u64());

                    if !img_url.is_empty() {
                        response.image.push(ImageResult {
                            title: title.clone(),
                            url: img_url.clone(),
                            source: vec![ImageSource {
                                url: img_url,
                                width: width.map(|w| w as u32),
                                height: height.map(|h| h as u32),
                            }],
                        });
                    }
                }
            }
        }

        Ok(response)
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
