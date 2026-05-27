use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct VSCO {
    http: HttpClient,
}

impl VSCO {
    pub fn new(http: HttpClient) -> Self {
        VSCO { http }
    }
}

#[async_trait]
impl Scraper for VSCO {
    fn name(&self) -> &str {
        "vsco"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!("https://vsco.co/search?query={}&type=photo", urlencoding(&query.q));

        let html = self
            .http
            .client
            .get(&url)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .send()
            .await?
            .text()
            .await?;

        let document = Html::parse_document(&html);
        let mut response = ImageResponse::empty();

        let img_sel = Selector::parse("img[src*='vsco'], img.media").unwrap();
        let parent_sel = Selector::parse("div.media-grid-item, a[href*='/media/']").unwrap();

        for parent in document.select(&parent_sel) {
            let img = parent.select(&img_sel).next();
            let img_url = img.and_then(|e| e.value().attr("src")).unwrap_or("").to_string();
            let title = img.and_then(|e| e.value().attr("alt")).unwrap_or("").to_string();

            if !img_url.is_empty() && !img_url.starts_with("data:") {
                response.image.push(ImageResult {
                    title,
                    source: vec![ImageSource { url: img_url, width: None, height: None }],
                });
            }
        }

        Ok(response)
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
