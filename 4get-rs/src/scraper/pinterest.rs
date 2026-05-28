use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Pinterest {
    http: HttpClient,
}

impl Pinterest {
    pub fn new(http: HttpClient) -> Self {
        Pinterest { http }
    }
}

#[async_trait]
impl Scraper for Pinterest {
    fn name(&self) -> &str {
        "pinterest"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!("https://www.pinterest.com/search/pins/?q={}", urlencoding(&query.q));

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

        let img_sel = Selector::parse("img[src*='pinimg'], img[loading='auto']").unwrap();
        let parent_sel = Selector::parse("div[data-test-id='pin'], div.pin").unwrap();

        for parent in document.select(&parent_sel) {
            let img = parent.select(&img_sel).next();
            let img_url = img.and_then(|e| e.value().attr("src")).unwrap_or("").to_string();
            let title = img.and_then(|e| e.value().attr("alt")).unwrap_or("").to_string();

            if !img_url.is_empty() && !img_url.starts_with("data:") {
                let sources = vec![
                    ImageSource { url: img_url.clone(), width: None, height: None },
                ];
                response.image.push(ImageResult { title, url: sources[0].url.clone(), source: sources });
            }
        }

        Ok(response)
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
