use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Mojeek {
    http: HttpClient,
}

impl Mojeek {
    pub fn new(http: HttpClient) -> Self {
        Mojeek { http }
    }
}

#[async_trait]
impl Scraper for Mojeek {
    fn name(&self) -> &str {
        "mojeek"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!("https://www.mojeek.com/search?q={}", urlencoding(&query.q));

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

        let result_sel = Selector::parse("div.results-standard li, div.result").unwrap();
        let title_sel = Selector::parse("h2 a").unwrap();
        let desc_sel = Selector::parse("p").unwrap();

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
                    source: Some("mojeek".into()),
                });
            }
        }

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        let url = format!("https://www.mojeek.com/news?q={}", urlencoding(&query.q));

        let html = self.http.client.get(&url).send().await?.text().await?;
        let document = Html::parse_document(&html);
        let mut response = NewsResponse::empty();

        let news_sel = Selector::parse("div.results-standard li, div.result").unwrap();
        let title_sel = Selector::parse("h2 a").unwrap();
        let desc_sel = Selector::parse("p").unwrap();

        for card in document.select(&news_sel) {
            let title: String = card.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();
            let url = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();
            let description: String = card.select(&desc_sel).next().map(|e| e.text().collect()).unwrap_or_default();

            if !title.is_empty() {
                response.news.push(NewsResult {
                    title,
                    url,
                    description,
                    date: None,
                    source: None,
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
