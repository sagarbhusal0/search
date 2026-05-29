use crate::config::Config;
use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use std::collections::HashMap;

pub struct Pixabay {
    http: HttpClient,
    api_key: String,
}

impl Pixabay {
    pub fn new(http: HttpClient, config: &Config) -> Self {
        let api_key = config
            .scrapers
            .pixabay_api_key
            .clone()
            .unwrap_or_default();
        Pixabay { http, api_key }
    }
}

#[async_trait]
impl Scraper for Pixabay {
    fn name(&self) -> &str {
        "pixabay"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let mut params: HashMap<String, String> = if let Some(npt) = &query.npt {
            serde_json::from_str(npt).unwrap_or_default()
        } else {
            let api_key = if self.api_key.is_empty() {
                "44065810-135ef171765e71adba780c5a6".to_string()
            } else {
                self.api_key.clone()
            };
            let mut p = HashMap::new();
            p.insert("key".to_string(), api_key);
            p.insert("q".to_string(), query.q.clone());
            p.insert("per_page".to_string(), "20".to_string());
            p.insert(
                "safesearch".to_string(),
                if matches!(query.nsfw, NsfwLevel::Yes) {
                    "false".to_string()
                } else {
                    "true".to_string()
                },
            );
            p.insert("page".to_string(), "1".to_string());

            if let Some(cat) = query.filters.get("f_category") {
                if cat != "images" {
                    p.insert("category".to_string(), cat.clone());
                }
            }
            if let Some(order) = query.filters.get("f_order") {
                if order != "relevance" {
                    let sort = match order.as_str() {
                        "latest" => "latest",
                        "ec" => "popular",
                        "trending" => "popular",
                        _ => "popular",
                    };
                    p.insert("order".to_string(), sort.to_string());
                }
            }
            if let Some(orientation) = query.filters.get("f_orientation") {
                if orientation != "any" {
                    let ot = match orientation.as_str() {
                        "vertical" => "vertical",
                        "horizontal" => "horizontal",
                        _ => "",
                    };
                    if !ot.is_empty() {
                        p.insert("orientation".to_string(), ot.to_string());
                    }
                }
            }
            if let Some(color) = query.filters.get("f_color") {
                if color != "any" {
                    p.insert("colors".to_string(), color.clone());
                }
            }
            if let Some(time) = query.filters.get("f_time") {
                if time != "any" {
                    p.insert("min_date".to_string(), time.clone());
                }
            }

            p
        };

        let resp = self
            .http
            .client
            .get("https://pixabay.com/api/")
            .query(&params)
            .header("Accept", "application/json")
            .header("User-Agent", format!("{} Pixabay", self.http.user_agent_friendly))
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = ImageResponse::empty();

        let hits = match resp.get("hits").and_then(|v| v.as_array()) {
            Some(h) => h,
            None => return Ok(response),
        };

        for hit in hits {
            let title = hit
                .get("tags")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let large_url = hit
                .get("largeImageURL")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let web_url = hit
                .get("webformatURL")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let preview = hit
                .get("previewURL")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let width = hit.get("imageWidth").and_then(|v| v.as_u64());
            let height = hit.get("imageHeight").and_then(|v| v.as_u64());
            let web_width = hit.get("webformatWidth").and_then(|v| v.as_u64());
            let web_height = hit.get("webformatHeight").and_then(|v| v.as_u64());

            let primary = if !large_url.is_empty() {
                large_url
            } else if !web_url.is_empty() {
                web_url.clone()
            } else {
                continue;
            };

            let mut sources = vec![ImageSource {
                url: primary.clone(),
                width: width.map(|w| w as u32),
                height: height.map(|h| h as u32),
            }];

            if !web_url.is_empty() && web_url != primary {
                sources.push(ImageSource {
                    url: web_url,
                    width: web_width.map(|w| w as u32),
                    height: web_height.map(|h| h as u32),
                });
            }

            if !preview.is_empty() {
                sources.push(ImageSource {
                    url: preview,
                    width: None,
                    height: None,
                });
            }

            let page_url = hit
                .get("pageURL")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            response.image.push(ImageResult {
                title,
                url: page_url,
                source: sources,
            });
        }

        let total_hits = resp
            .get("totalHits")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let per_page: u64 = params
            .get("per_page")
            .and_then(|v| v.parse().ok())
            .unwrap_or(20);
        let total_pages = (total_hits + per_page - 1) / per_page;

        let current_page: u64 = params
            .get("page")
            .and_then(|v| v.parse().ok())
            .unwrap_or(1);

        if current_page < total_pages {
            params.insert("page".to_string(), (current_page + 1).to_string());
            response.npt = Some(serde_json::to_string(&params).unwrap_or_default());
        }

        Ok(response)
    }
}
