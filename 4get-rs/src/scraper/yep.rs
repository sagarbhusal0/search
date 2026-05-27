use crate::config::Config;
use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Yep {
    http: HttpClient,
    use_api: bool,
}

impl Yep {
    pub fn new(http: HttpClient, config: &Config) -> Self {
        Yep {
            http,
            use_api: config.scrapers.yep_use_api,
        }
    }
}

#[async_trait]
impl Scraper for Yep {
    fn name(&self) -> &str {
        "yep"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        if self.use_api {
            let resp = self
                .http
                .client
                .get("https://api.yep.com/v1/search")
                .query(&[("q", query.q.as_str()), ("limit", "10"), ("country", "us")])
                .send()
                .await?
                .json::<serde_json::Value>()
                .await?;

            let mut response = WebResponse::empty();

            if let Some(results) = resp.get("results").and_then(|v| v.as_array()) {
                for item in results {
                    let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let url = item.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let description = item.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();

                    if !title.is_empty() {
                        response.web.push(WebResult {
                            title,
                            url,
                            description,
                            date: None,
                            source: Some("yep".into()),
                        });
                    }
                }
            }

            Ok(response)
        } else {
            let url = format!("https://yep.com/web?q={}", urlencoding(&query.q));

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

            let result_sel = Selector::parse("div.result, li.search-result").unwrap();
            let title_sel = Selector::parse("a[href*='yep'], h2 a, h3 a").unwrap();
            let desc_sel = Selector::parse("p.text, div.description").unwrap();

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
                        source: Some("yep".into()),
                    });
                }
            }

            Ok(response)
        }
    }

    async fn autocomplete(&self, query: &str) -> Result<Vec<String>, AppError> {
        let resp = self
            .http
            .client
            .get("https://yep.com/suggest")
            .query(&[("q", query)])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let suggestions = resp
            .get("suggestions")
            .and_then(|v| v.as_array())
            .into_iter()
            .flat_map(|arr| arr.iter())
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect();

        Ok(suggestions)
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
