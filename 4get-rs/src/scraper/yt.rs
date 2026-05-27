use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use regex::Regex;
use scraper::{Html, Selector};

pub struct YouTube {
    http: HttpClient,
}

impl YouTube {
    pub fn new(http: HttpClient) -> Self {
        YouTube { http }
    }
}

#[async_trait]
impl Scraper for YouTube {
    fn name(&self) -> &str {
        "yt"
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!(
            "https://www.youtube.com/results?search_query={}&hl=en",
            urlencoding(&query.q)
        );

        let html = self
            .http
            .client
            .get(&url)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .send()
            .await?
            .text()
            .await?;

        let mut response = VideoResponse::empty();

        // Try parsing the initial data from yt InitialData
        if let Some(initial_data) = extract_initial_data(&html) {
            if let Some(contents) = initial_data
                .pointer("/contents/twoColumnSearchResultsRenderer/primaryContents/sectionListRenderer/contents")
                .and_then(|v| v.as_array())
            {
                for section in contents {
                    if let Some(items) = section
                        .pointer("/itemSectionRenderer/contents")
                        .and_then(|v| v.as_array())
                    {
                        for item in items {
                            if let Some(video) = item.get("videoRenderer") {
                                let title = video
                                    .pointer("/title/runs/0/text")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                let video_id = video
                                    .get("videoId")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("");
                                let url = if !video_id.is_empty() {
                                    format!("https://www.youtube.com/watch?v={}", video_id)
                                } else {
                                    String::new()
                                };
                                let views_text = video
                                    .pointer("/viewCount/simpleText")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                let duration = video
                                    .pointer("/lengthText/simpleText")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string());

                                if !title.is_empty() {
                                    response.video.push(VideoResult {
                                        title,
                                        url,
                                        views: parse_views(&views_text),
                                        duration,
                                        date: None,
                                        description: None,
                                        source: Some("yt".into()),
                                        thumb: None,
                                    });
                                }
                            }
                        }
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
            .get("https://suggestqueries.google.com/complete/search")
            .query(&[
                ("client", "youtube"),
                ("q", query),
                ("hl", "en"),
                ("gl", "us"),
                ("ds", "yt"),
            ])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let suggestions = resp
            .get(1)
            .and_then(|v| v.as_array())
            .into_iter()
            .flat_map(|arr| arr.iter())
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect();

        Ok(suggestions)
    }
}

fn extract_initial_data(html: &str) -> Option<serde_json::Value> {
    let re = Regex::new(r"var ytInitialData = ({.*?});").ok()?;
    let caps = re.captures(html)?;
    serde_json::from_str(caps.get(1)?.as_str()).ok()
}

fn parse_views(text: &str) -> Option<i64> {
    let re = Regex::new(r"([\d,.]+)").ok()?;
    let caps = re.captures(text)?;
    let num_str = caps.get(1)?.as_str().replace(',', "").replace('.', "");
    num_str.parse::<i64>().ok()
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
