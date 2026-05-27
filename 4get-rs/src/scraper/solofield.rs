use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Solofield {
    http: HttpClient,
}

impl Solofield {
    pub fn new(http: HttpClient) -> Self {
        Solofield { http }
    }
}

#[async_trait]
impl Scraper for Solofield {
    fn name(&self) -> &str {
        "solofield"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!("https://solofield.net/search?q={}", urlencoding(&query.q));

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
        let mut response = WebResponse::empty();

        let result_sel = Selector::parse("div.result, div.search-item").unwrap();
        let title_sel = Selector::parse("h2 a, a[href]").unwrap();
        let desc_sel = Selector::parse("p, div.description").unwrap();

        for result in document.select(&result_sel) {
            let title: String = result.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();
            let url = result
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();
            let description: String = result.select(&desc_sel).next().map(|e| e.text().collect()).unwrap_or_default();

            if !title.is_empty() {
                response.web.push(WebResult {
                    title,
                    url,
                    description,
                    date: None,
                    source: Some("solofield".into()),
                });
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!("https://solofield.net/images?q={}", urlencoding(&query.q));

        let html = self.http.client.get(&url).send().await?.text().await?;
        let document = Html::parse_document(&html);
        let mut response = ImageResponse::empty();

        let img_sel = Selector::parse("img[src]").unwrap();
        let parent_sel = Selector::parse("div.image-item, div.image-container").unwrap();

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

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!("https://solofield.net/videos?q={}", urlencoding(&query.q));

        let html = self.http.client.get(&url).send().await?.text().await?;
        let document = Html::parse_document(&html);
        let mut response = VideoResponse::empty();

        let vid_sel = Selector::parse("div.video-item, div.video-container").unwrap();
        let title_sel = Selector::parse("h3 a, a[href]").unwrap();

        for card in document.select(&vid_sel) {
            let title: String = card.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();
            let url = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();

            if !title.is_empty() {
                response.video.push(VideoResult {
                    title,
                    url,
                    views: None,
                    duration: None,
                    date: None,
                    description: None,
                    source: Some("solofield".into()),
                    thumb: None,
                });
            }
        }

        Ok(response)
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
