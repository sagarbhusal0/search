use crate::config::Config;
use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct GoogleApi {
    http: HttpClient,
    cx: String,
}

impl GoogleApi {
    pub fn new(http: HttpClient, config: &Config) -> Self {
        let cx = config
            .scrapers
            .google_cx_endpoint
            .clone()
            .unwrap_or_default();
        GoogleApi { http, cx }
    }
}

#[async_trait]
impl Scraper for GoogleApi {
    fn name(&self) -> &str {
        "google_api"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://www.googleapis.com/customsearch/v1")
            .query(&[
                ("key", &self.cx),
                ("cx", &self.cx),
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
                        source: Some("google_api".into()),
                    });
                }
            }
        }

        if let Some(queries) = resp.get("queries").and_then(|v| v.as_object()) {
            if queries.contains_key("nextPage") {
                if let Some(start) = resp.get("queries").and_then(|q| {
                    q.get("nextPage")
                        .and_then(|a| a.as_array())
                        .and_then(|a| a.first())
                        .and_then(|o| o.get("startIndex"))
                        .and_then(|v| v.as_u64())
                }) {
                    response.npt = Some(format!("google_api_{}", start));
                }
            }
        }

        Ok(response)
    }
}
