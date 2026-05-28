use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct Qwant {
    http: HttpClient,
}

impl Qwant {
    pub fn new(http: HttpClient) -> Self {
        Qwant { http }
    }
}

#[async_trait]
impl Scraper for Qwant {
    fn name(&self) -> &str {
        "qwant"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.qwant.com/v3/search/web")
            .query(&[
                ("q", query.q.as_str()),
                ("count", "10"),
                ("locale", "en_us"),
                ("offset", "0"),
            ])
            .header("User-Agent", &self.http.user_agent)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = WebResponse::empty();

        if let Some(items) = resp
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|v| v.as_array())
        {
            for item in items {
                let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let url = item.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let description = item.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string();

                if !title.is_empty() {
                    response.web.push(WebResult {
                        title,
                        url,
                        description,
                        date: None,
                        source: Some("qwant".into()),
                    });
                }
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.qwant.com/v3/search/images")
            .query(&[("q", query.q.as_str()), ("count", "10"), ("locale", "en_us")])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = ImageResponse::empty();

        if let Some(items) = resp
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|v| v.as_array())
        {
            for item in items {
                let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let media = item.get("media").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let thumb = item.get("thumbnail").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let width = item.get("width").and_then(|v| v.as_u64());
                let height = item.get("height").and_then(|v| v.as_u64());

                if !media.is_empty() {
                    let mut sources = vec![ImageSource {
                        url: media,
                        width: width.map(|w| w as u32),
                        height: height.map(|h| h as u32),
                    }];
                    if !thumb.is_empty() {
                        sources.push(ImageSource {
                            url: thumb,
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

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.qwant.com/v3/search/news")
            .query(&[("q", query.q.as_str()), ("count", "10"), ("locale", "en_us")])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = NewsResponse::empty();

        if let Some(items) = resp
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|v| v.as_array())
        {
            for item in items {
                let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let url = item.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let description = item.get("desc").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let source = item.get("source").and_then(|v| v.as_str()).map(|s| s.to_string());

                if !title.is_empty() {
                    response.news.push(NewsResult {
                        title,
                        url,
                        description,
                        date: None,
                        source,
                        thumb: None,
                    });
                }
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.qwant.com/v3/search/videos")
            .query(&[("q", query.q.as_str()), ("count", "10"), ("locale", "en_us")])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = VideoResponse::empty();

        if let Some(items) = resp
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|v| v.as_array())
        {
            for item in items {
                let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let url = item.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let views = item.get("views").and_then(|v| v.as_i64());
                let duration = item.get("duration").and_then(|v| v.as_i64());

                if !title.is_empty() {
                    response.video.push(VideoResult {
                        title,
                        url,
                        views,
                        duration: duration.map(|d| d.to_string()),
                        date: None,
                        description: None,
                    source: Some("qwant".into()),
                    author: None,
                    thumb: None,
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
            .get("https://api.qwant.com/v3/suggest")
            .query(&[("q", query)])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let suggestions = resp
            .get("data")
            .and_then(|d| d.get("items"))
            .and_then(|v| v.as_array())
            .into_iter()
            .flat_map(|arr| arr.iter())
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect();

        Ok(suggestions)
    }
}
