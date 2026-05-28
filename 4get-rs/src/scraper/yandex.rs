use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use regex::Regex;
use scraper::{Html, Selector};

pub struct Yandex {
    http: HttpClient,
}

impl Yandex {
    pub fn new(http: HttpClient) -> Self {
        Yandex { http }
    }
}

#[async_trait]
impl Scraper for Yandex {
    fn name(&self) -> &str {
        "yandex"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!(
            "https://yandex.com/search/?text={}&lr=87",
            urlencoding(&query.q)
        );

        let html = self
            .http
            .client
            .get(&url)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .send()
            .await?
            .text()
            .await?;

        let document = Html::parse_document(&html);
        let mut response = WebResponse::empty();

        let result_sel = Selector::parse("li.serp-item, div.organic").unwrap();
        let title_sel = Selector::parse("h2 a, a.link_theme_normal").unwrap();
        let desc_sel = Selector::parse("div.text-container, div[class*='text']").unwrap();

        for result in document.select(&result_sel) {
            let title = result
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default()
                .trim()
                .to_string();

            let link = result
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();

            let description: String = result
                .select(&desc_sel)
                .next()
                .map(|e| e.text().collect::<String>())
                .unwrap_or_default()
                .trim()
                .to_string();

            if !title.is_empty() {
                response.web.push(WebResult {
                    title,
                    url: link,
                    description,
                    date: None,
                    source: Some("yandex".into()),
                });
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!(
            "https://yandex.com/images/search?text={}&isize=large",
            urlencoding(&query.q)
        );

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

        let img_sel = Selector::parse("img.serp-item__thumb, img[class*='thumb']").unwrap();
        let parent_sel = Selector::parse("div.serp-item, a.serp-item__link").unwrap();

        for parent in document.select(&parent_sel) {
            let img = parent.select(&img_sel).next();
            let img_url = img
                .and_then(|e| e.value().attr("src"))
                .or_else(|| img.and_then(|e| e.value().attr("data-src")))
                .unwrap_or("")
                .to_string();

            let title = img
                .and_then(|e| e.value().attr("alt"))
                .unwrap_or("")
                .to_string();

            if !img_url.is_empty() && !img_url.starts_with("data:") {
                response.image.push(ImageResult {
                    title,
                    url: img_url.clone(),
                    source: vec![ImageSource {
                        url: img_url,
                        width: None,
                        height: None,
                    }],
                });
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!(
            "https://yandex.com/video/search?text={}",
            urlencoding(&query.q)
        );

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

        let vid_sel = Selector::parse("div.video-card, div.thumb-wrap").unwrap();
        let title_sel = Selector::parse("a.video-card__title, h3").unwrap();
        let dur_sel = Selector::parse("span.video-card__duration, span.duration").unwrap();
        let views_sel = Selector::parse("span.video-card__views, span.views").unwrap();

        for card in document.select(&vid_sel) {
            let title: String = card.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();
            let url = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();
            let duration: String = card.select(&dur_sel).next().map(|e| e.text().collect()).unwrap_or_default();

            if !title.is_empty() {
                response.video.push(VideoResult {
                    title,
                    url,
                    views: None,
                    duration: if duration.is_empty() { None } else { Some(duration.trim().to_string()) },
                    date: None,
                    description: None,
                    source: Some("yandex".into()),
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
