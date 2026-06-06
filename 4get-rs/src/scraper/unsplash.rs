use crate::config::Config;
use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use std::collections::HashMap;

pub struct Unsplash {
    http: HttpClient,
    api_key: String,
}

impl Unsplash {
    pub fn new(http: HttpClient, config: &Config) -> Self {
        let api_key = config
            .scrapers
            .unsplash_api_key
            .clone()
            .unwrap_or_default();
        Unsplash { http, api_key }
    }
}

#[async_trait]
impl Scraper for Unsplash {
    fn name(&self) -> &str {
        "unsplash"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let mut filter: HashMap<String, String> = if let Some(npt) = &query.npt {
            serde_json::from_str(npt).unwrap_or_default()
        } else {
            let mut f = HashMap::new();
            f.insert("page".to_string(), "1".to_string());
            f.insert("per_page".to_string(), "20".to_string());
            f.insert("query".to_string(), query.q.clone());

            if let Some(order_by) = query.filters.get("f_order_by") {
                if order_by != "relevance" {
                    f.insert("order_by".to_string(), order_by.clone());
                }
            }
            if let Some(orientation) = query.filters.get("f_orientation") {
                if orientation != "any" {
                    f.insert("orientation".to_string(), orientation.clone());
                }
            }
            if let Some(license) = query.filters.get("f_license") {
                if license != "any" {
                    f.insert("plus".to_string(), license.clone());
                }
            }

            f
        };

        let search_term = filter.get("query").cloned().unwrap_or_default();
        let referer = format!(
            "https://unsplash.com/s/photos/{}",
            search_term.replace(' ', "-")
        );

        let mut req = self
            .http
            .client
            .get("https://unsplash.com/napi/search/photos")
            .query(&filter)
            .header("Accept", "*/*")
            .header("Accept-Language", "en-US")
            .header("Referer", &referer)
            .header("client-geo-region", "global")
            .header("x-client-version", "8999df28be3f138bf2c646df5d656e4dc6970ba0")
            .header("DNT", "1")
            .header("Sec-GPC", "1")
            .header("Connection", "keep-alive")
            .header("Sec-Fetch-Dest", "empty")
            .header("Sec-Fetch-Mode", "cors")
            .header("Sec-Fetch-Site", "same-origin");

        if !self.api_key.is_empty() {
            req = req.header("Authorization", format!("Client-ID {}", self.api_key));
        }

        let json = req
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = ImageResponse::empty();

        let results = match json.get("results").and_then(|v| v.as_array()) {
            Some(r) => r,
            None => return Ok(response),
        };

        for image in results {
            let raw_url = image
                .get("urls")
                .and_then(|u| u.get("raw"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            if raw_url.is_empty() {
                continue;
            }

            let base = raw_url.split('?').next().unwrap_or(raw_url);

            let is_premium = image.get("premium").and_then(|v| v.as_bool()).unwrap_or(false);
            let is_plus = image.get("plus").and_then(|v| v.as_bool()).unwrap_or(false);

            let width = image.get("width").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
            let height = image.get("height").and_then(|v| v.as_u64()).unwrap_or(0) as u32;

            let mut sources = Vec::new();

            if is_premium || is_plus {
                let x900_w = 900u32;
                let x900_h = ((height as f64) * (900.0 / (width as f64))) as u32;
                let x500_w = 500u32;
                let x500_h = ((height as f64) * (500.0 / (width as f64))) as u32;

                sources.push(ImageSource {
                    url: base.to_string(),
                    width: Some(width),
                    height: Some(height),
                });
                sources.push(ImageSource {
                    url: format!("{}?w=900", base),
                    width: Some(x900_w),
                    height: Some(x900_h),
                });
                sources.push(ImageSource {
                    url: format!("{}?w=500", base),
                    width: Some(x500_w),
                    height: Some(x500_h),
                });
            } else {
                let x500_w = 500u32;
                let x500_h = ((height as f64) * (500.0 / (width as f64))) as u32;

                sources.push(ImageSource {
                    url: base.to_string(),
                    width: Some(width),
                    height: Some(height),
                });
                sources.push(ImageSource {
                    url: format!("{}?w=500", base),
                    width: Some(x500_w),
                    height: Some(x500_h),
                });
            }

            let desc = image
                .get("description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();
            let alt_desc = image
                .get("alt_description")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim();

            let title = match (desc, alt_desc) {
                ("", "") => String::new(),
                ("", b) => b.to_string(),
                (a, "") => a.to_string(),
                (a, b) => format!("{}: {}", a, b),
            };

            let slug = image.get("slug").and_then(|v| v.as_str()).unwrap_or("");
            let page_url = format!("https://unsplash.com/photos/{}", slug);

            response.image.push(ImageResult {
                title,
                url: page_url,
                source: sources,
            });
        }

        let total_pages = json
            .get("total_pages")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        let current_page = filter
            .get("page")
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(1);

        if current_page < total_pages {
            filter.insert("page".to_string(), (current_page + 1).to_string());
            response.npt = Some(serde_json::to_string(&filter).unwrap_or_default());
        }

        Ok(response)
    }
}
