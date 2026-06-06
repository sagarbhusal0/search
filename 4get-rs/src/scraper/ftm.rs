use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct FindThatMeme {
    http: HttpClient,
}

impl FindThatMeme {
    pub fn new(http: HttpClient) -> Self {
        FindThatMeme { http }
    }
}

#[async_trait]
impl Scraper for FindThatMeme {
    fn name(&self) -> &str {
        "ftm"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!("https://findthatmeme.com/search?q={}", urlencoding(&query.q));

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

        let img_sel = Selector::parse("img[src], img.meme-image").unwrap();
        let parent_sel = Selector::parse("div.meme, div.result, a[href*='/meme']").unwrap();

        for parent in document.select(&parent_sel) {
            let img = parent.select(&img_sel).next();
            let img_url = img.and_then(|e| e.value().attr("src")).unwrap_or("").to_string();
            let title = img.and_then(|e| e.value().attr("alt")).unwrap_or("").to_string();

            if !img_url.is_empty() && !img_url.starts_with("data:") {
                response.image.push(ImageResult {
                    title,
                    url: img_url.clone(),
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
