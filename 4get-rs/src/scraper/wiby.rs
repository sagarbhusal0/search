use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Wiby {
    http: HttpClient,
}

impl Wiby {
    pub fn new(http: HttpClient) -> Self {
        Wiby { http }
    }
}

#[async_trait]
impl Scraper for Wiby {
    fn name(&self) -> &str {
        "wiby"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!("https://wiby.me/?q={}", urlencoding(&query.q));

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

        let result_sel = Selector::parse("div.result, li").unwrap();
        let title_sel = Selector::parse("a[href^='http']").unwrap();
        let desc_sel = Selector::parse("span, p, div.description").unwrap();

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

            if !title.is_empty() && !url.is_empty() {
                response.web.push(WebResult {
                    title,
                    url,
                    description,
                    date: None,
                    source: Some("wiby".into()),
                });
            }
        }

        Ok(response)
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
