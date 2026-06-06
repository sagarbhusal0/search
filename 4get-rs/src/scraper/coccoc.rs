use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct CocCoc {
    http: HttpClient,
}

impl CocCoc {
    pub fn new(http: HttpClient) -> Self {
        CocCoc { http }
    }
}

#[async_trait]
impl Scraper for CocCoc {
    fn name(&self) -> &str {
        "coccoc"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!("https://coccoc.com/search?query={}", urlencoding(&query.q));

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

        let result_sel = Selector::parse("div.search-result, div.result").unwrap();
        let title_sel = Selector::parse("h3 a, a[href]").unwrap();
        let desc_sel = Selector::parse("p, div.summary, span.description").unwrap();

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
                    source: Some("coccoc".into()),
                });
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!("https://coccoc.com/video/search?query={}", urlencoding(&query.q));

        let html = self.http.client.get(&url).send().await?.text().await?;
        let document = Html::parse_document(&html);
        let mut response = VideoResponse::empty();

        let vid_sel = Selector::parse("div.video-item, div.result").unwrap();
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
                    source: Some("coccoc".into()),
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
