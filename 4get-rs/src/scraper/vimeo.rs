use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Vimeo {
    http: HttpClient,
}

impl Vimeo {
    pub fn new(http: HttpClient) -> Self {
        Vimeo { http }
    }
}

#[async_trait]
impl Scraper for Vimeo {
    fn name(&self) -> &str {
        "vimeo"
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!("https://vimeo.com/search?q={}", urlencoding(&query.q));

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
        let mut response = VideoResponse::empty();

        let vid_sel = Selector::parse("li.video, div.video-card, div[class*='video']").unwrap();
        let title_sel = Selector::parse("a[href*='/']").unwrap();
        let dur_sel = Selector::parse("span.duration, span.badge").unwrap();

        for card in document.select(&vid_sel) {
            let title: String = card.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();
            let url = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .map(|h| {
                    if h.starts_with('/') {
                        format!("https://vimeo.com{}", h)
                    } else {
                        h.to_string()
                    }
                })
                .unwrap_or_default();
            let duration: String = card.select(&dur_sel).next().map(|e| e.text().collect()).unwrap_or_default();

            if !title.is_empty() {
                response.video.push(VideoResult {
                    title,
                    url,
                    views: None,
                    duration: if duration.is_empty() { None } else { Some(duration.trim().to_string()) },
                    date: None,
                    description: None,
                    source: Some("vimeo".into()),
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
