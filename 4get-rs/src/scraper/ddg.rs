use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use regex::Regex;
use scraper::{Html, Selector};

pub struct DDG {
    http: HttpClient,
}

impl DDG {
    pub fn new(http: HttpClient) -> Self {
        DDG { http }
    }

    fn vqd(&self, html: &str) -> Option<String> {
        let re = Regex::new(r#"vqd=['"](\d+(?:-\d+)*)['"]"#).ok()?;
        re.captures(html).and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
    }

    async fn fetch_vqd(&self) -> Result<String, AppError> {
        let resp = self
            .http
            .client
            .get("https://duckduckgo.com/")
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .send()
            .await?
            .text()
            .await?;
        self.vqd(&resp).ok_or_else(|| AppError::ScraperError("Failed to get vqd token".into()))
    }
}

#[async_trait]
impl Scraper for DDG {
    fn name(&self) -> &str {
        "ddg"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let vqd = self.fetch_vqd().await?;

        let mut params = vec![
            ("q", query.q.as_str()),
            ("vqd", &vqd),
            ("kl", "wt-wt"),
            ("sp", if matches!(query.nsfw, crate::types::NsfwLevel::Yes) { "1" } else { "0" }),
            ("ex", if query.extended_search { "-1" } else { "1" }),
        ];

        let resp = self
            .http
            .client
            .get("https://links.duckduckgo.com/d.js")
            .query(&params)
            .header("Accept", "application/json, text/javascript, */*; q=0.01")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("Referer", "https://duckduckgo.com/")
            .header("X-Requested-With", "XMLHttpRequest")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = WebResponse::empty();

        if let Some(results) = resp.as_array() {
            for item in results {
                if let Some(obj) = item.as_object() {
                    let title = obj.get("t").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let url = obj.get("u").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let desc = obj.get("a").and_then(|v| v.as_str()).unwrap_or("").to_string();

                    if !title.is_empty() || !url.is_empty() {
                        response.web.push(WebResult {
                            title,
                            url,
                            description: desc,
                            date: None,
                            source: Some("ddg".into()),
                        });
                    }
                }
            }
        }

        if let Some(npt_data) = resp.get("npt").and_then(|v| v.as_str()) {
            if !npt_data.is_empty() {
                response.npt = Some(npt_data.to_string());
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let vqd = self.fetch_vqd().await?;

        let resp = self
            .http
            .client
            .get("https://links.duckduckgo.com/d.js")
            .query(&[
                ("q", query.q.as_str()),
                ("vqd", &vqd),
                ("kl", "wt-wt"),
                ("iax", "images"),
                ("ia", "images"),
            ])
            .header("Accept", "application/json, text/javascript, */*; q=0.01")
            .header("Referer", "https://duckduckgo.com/")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = ImageResponse::empty();

        if let Some(results) = resp.as_array() {
            for item in results {
                if let Some(obj) = item.as_object() {
                    let title = obj.get("t").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let image_url = obj.get("u").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let thumb_url = obj.get("tu").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let width = obj.get("w").and_then(|v| v.as_u64());
                    let height = obj.get("h").and_then(|v| v.as_u64());

                    if !image_url.is_empty() {
                        let mut sources = Vec::new();
                        sources.push(ImageSource {
                            url: image_url.clone(),
                            width: width.map(|w| w as u32),
                            height: height.map(|h| h as u32),
                        });
                        if !thumb_url.is_empty() {
                            sources.push(ImageSource {
                                url: thumb_url,
                                width: None,
                                height: None,
                            });
                        }

                        response.image.push(ImageResult {
                            title,
                            url: sources[0].url.clone(),
                            source: sources,
                        });
                    }
                }
            }
        }

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        let vqd = self.fetch_vqd().await?;

        let resp = self
            .http
            .client
            .get("https://links.duckduckgo.com/d.js")
            .query(&[
                ("q", query.q.as_str()),
                ("vqd", &vqd),
                ("kl", "wt-wt"),
                ("ia", "news"),
            ])
            .header("Accept", "application/json, text/javascript, */*; q=0.01")
            .header("Referer", "https://duckduckgo.com/")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = NewsResponse::empty();

        if let Some(results) = resp.as_array() {
            for item in results {
                if let Some(obj) = item.as_object() {
                    let title = obj.get("t").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let url = obj.get("u").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let desc = obj.get("a").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let date = obj.get("d").and_then(|v| v.as_str()).and_then(|s| s.parse::<i64>().ok());
                    let source = obj.get("s").and_then(|v| v.as_str()).map(|s| s.to_string());

                    if !title.is_empty() || !url.is_empty() {
                        response.news.push(NewsResult {
                            title,
                            url,
                            description: desc,
                            date,
                            source,
                            thumb: None,
                        });
                    }
                }
            }
        }

        Ok(response)
    }

    async fn autocomplete(&self, query: &str) -> Result<Vec<String>, AppError> {
        let resp = self
            .http
            .client
            .get("https://duckduckgo.com/ac/")
            .query(&[("q", query), ("type", "list")])
            .send()
            .await?
            .json::<Vec<serde_json::Value>>()
            .await?;

        let suggestions: Vec<String> = resp
            .into_iter()
            .filter_map(|item| {
                item.get("phrase")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
            })
            .collect();

        Ok(suggestions)
    }
}
