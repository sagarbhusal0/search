use crate::config::Config;
use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Marginalia {
    http: HttpClient,
    api_key: Option<String>,
}

impl Marginalia {
    pub fn new(http: HttpClient, config: &Config) -> Self {
        Marginalia {
            http,
            api_key: config.scrapers.marginalia_api_key.clone(),
        }
    }
}

#[async_trait]
impl Scraper for Marginalia {
    fn name(&self) -> &str {
        "marginalia"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        if let Some(api_key) = &self.api_key {
            let resp = self
                .http
                .client
                .get("https://api.marginalia.nu/search")
                .query(&[("q", query.q.as_str()), ("key", api_key.as_str())])
                .header("User-Agent", &self.http.user_agent_friendly)
                .send()
                .await?
                .json::<serde_json::Value>()
                .await?;

            let mut response = WebResponse::empty();

            if let Some(results) = resp.as_array() {
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
                            source: Some("marginalia".into()),
                        });
                    }
                }
            }

            Ok(response)
        } else {
            let url = format!("https://search.marginalia.nu/search?q={}", urlencoding(&query.q));

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

            let result_sel = Selector::parse("div.search-result, li.result").unwrap();
            let title_sel = Selector::parse("h3 a, a[href]").unwrap();
            let desc_sel = Selector::parse("p, div.description, span.description").unwrap();

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
                        source: Some("marginalia".into()),
                    });
                }
            }

            Ok(response)
        }
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
