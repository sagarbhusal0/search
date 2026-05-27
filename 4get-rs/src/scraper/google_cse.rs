use crate::config::Config;
use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct GoogleCse {
    http: HttpClient,
    cx: String,
}

impl GoogleCse {
    pub fn new(http: HttpClient, config: &Config) -> Self {
        let cx = config
            .scrapers
            .google_cx_endpoint
            .clone()
            .unwrap_or_default();
        GoogleCse { http, cx }
    }
}

#[async_trait]
impl Scraper for GoogleCse {
    fn name(&self) -> &str {
        "google_cse"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://www.googleapis.com/customsearch/v1")
            .query(&[
                ("key", &self.cx),
                ("cx", "017466674625512407126:d4e68b99b876541f0"),
                ("q", &query.q),
                ("hl", "en"),
            ])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = WebResponse::empty();

        if let Some(items) = resp.get("items").and_then(|v| v.as_array()) {
            for item in items {
                let title = item
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let url = item
                    .get("link")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let description = item
                    .get("snippet")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if !title.is_empty() {
                    response.web.push(WebResult {
                        title,
                        url,
                        description,
                        date: None,
                        source: Some("google_cse".into()),
                    });
                }
            }
        }

        Ok(response)
    }
}
