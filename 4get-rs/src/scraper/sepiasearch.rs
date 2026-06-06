use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct SepiaSearch {
    http: HttpClient,
}

impl SepiaSearch {
    pub fn new(http: HttpClient) -> Self {
        SepiaSearch { http }
    }
}

#[async_trait]
impl Scraper for SepiaSearch {
    fn name(&self) -> &str {
        "sepiasearch"
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!("https://sepiasearch.org/search?q={}", urlencoding(&query.q));

        let html = self
            .http
            .client
            .get(&url)
            .send()
            .await?
            .text()
            .await?;

        let document = Html::parse_document(&html);
        let mut response = VideoResponse::empty();

        let vid_sel = Selector::parse("div.video, div[class*='video']").unwrap();
        let title_sel = Selector::parse("div.title, a[href*='watch']").unwrap();
        let dur_sel = Selector::parse("span.duration, div.length").unwrap();
        let link_sel = Selector::parse("a[href*='watch']").unwrap();

        for card in document.select(&vid_sel) {
            let title: String = card.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();
            let url = card
                .select(&link_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .map(|h| {
                    if h.starts_with('/') {
                        format!("https://sepiasearch.org{}", h)
                    } else {
                        h.to_string()
                    }
                })
                .unwrap_or_default();
            let duration: String = card.select(&dur_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let duration_secs = if duration.is_empty() {
                None
            } else {
                let d = duration.trim();
                let parts: Vec<&str> = d.split(':').collect();
                let mut secs: i64 = 0;
                if parts.len() == 3 {
                    secs += parts[0].parse::<i64>().unwrap_or(0) * 3600;
                    secs += parts[1].parse::<i64>().unwrap_or(0) * 60;
                    secs += parts[2].parse::<i64>().unwrap_or(0);
                } else if parts.len() == 2 {
                    secs += parts[0].parse::<i64>().unwrap_or(0) * 60;
                    secs += parts[1].parse::<i64>().unwrap_or(0);
                } else {
                    secs = d.parse::<i64>().unwrap_or(0);
                }
                (secs > 0).then_some(secs)
            };

            if !title.is_empty() {
                response.video.push(VideoResult {
                    title,
                    url,
                    views: None,
                    duration: duration_secs,
                    date: None,
                    description: None,
                    source: Some("sepiasearch".into()),
                    author: None,
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
