use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct Ghostery {
    http: HttpClient,
}

impl Ghostery {
    pub fn new(http: HttpClient) -> Self {
        Ghostery { http }
    }
}

#[async_trait]
impl Scraper for Ghostery {
    fn name(&self) -> &str {
        "ghostery"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.ghostery.com/api/v2/search")
            .query(&[("q", query.q.as_str()), ("limit", "10")])
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
                        source: Some("ghostery".into()),
                    });
                }
            }
        }

        Ok(response)
    }

    async fn autocomplete(&self, query: &str) -> Result<Vec<String>, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.ghostery.com/api/v2/search/suggest")
            .query(&[("q", query)])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let suggestions = resp
            .as_array()
            .into_iter()
            .flat_map(|arr| arr.iter())
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect();

        Ok(suggestions)
    }
}
