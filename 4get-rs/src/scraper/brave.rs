use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use regex::Regex;
use scraper::{Html, Selector};

pub struct Brave {
    http: HttpClient,
}

impl Brave {
    pub fn new(http: HttpClient) -> Self {
        Brave { http }
    }
}

#[async_trait]
impl Scraper for Brave {
    fn name(&self) -> &str {
        "brave"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!(
            "https://search.brave.com/search?q={}&source=web",
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

        let document = Html::parse_document(&html);
        let mut response = WebResponse::empty();

        let snippet_sel = Selector::parse("div.snippet").unwrap();
        let title_sel = Selector::parse("a.snippet-title").unwrap();
        let desc_sel = Selector::parse("div.snippet-description").unwrap();
        let url_sel = Selector::parse("span.snippet-url").unwrap();

        for snippet in document.select(&snippet_sel) {
            let title = snippet
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default();

            let description = snippet
                .select(&desc_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default();

            let url_text = snippet
                .select(&url_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default();

            if !title.is_empty() {
                response.web.push(WebResult {
                    title: title.trim().to_string(),
                    url: url_text.trim().to_string(),
                    description: description.trim().to_string(),
                    date: None,
                    source: Some("brave".into()),
                });
            }
        }

        // Next page
        if let Some(npt_input) = document
            .select(&Selector::parse("input[name=npt]").unwrap())
            .next()
        {
            if let Some(npt) = npt_input.value().attr("value") {
                if !npt.is_empty() {
                    response.npt = Some(npt.to_string());
                }
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!(
            "https://search.brave.com/images?q={}",
            urlencoding(&query.q)
        );

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
        let mut response = ImageResponse::empty();

        let img_sel = Selector::parse("div.image-card").unwrap();
        let title_sel = Selector::parse("span.image-title").unwrap();
        let src_sel = Selector::parse("img.image-img").unwrap();

        for card in document.select(&img_sel) {
            let title = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default();

            let img_url = card
                .select(&src_sel)
                .next()
                .and_then(|e| e.value().attr("src"))
                .unwrap_or("")
                .to_string();

            let data_src = card
                .select(&src_sel)
                .next()
                .and_then(|e| e.value().attr("data-src"))
                .unwrap_or("")
                .to_string();

            let final_url = if !data_src.is_empty() { data_src } else { img_url };

            if !final_url.is_empty() {
                response.image.push(ImageResult {
                    title,
                    url: final_url.clone(),
                    source: vec![ImageSource {
                        url: final_url,
                        width: None,
                        height: None,
                    }],
                });
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!(
            "https://search.brave.com/videos?q={}",
            urlencoding(&query.q)
        );

        let html = self
            .http
            .client
            .get(&url)
            .send()
            .await?
            .text()
            .await?;

        let document = Html::parse_document(&html);
        let mut response = VideoResponse::empty();

        let vid_sel = Selector::parse("div.video-card").unwrap();
        let title_sel = Selector::parse("a.video-title").unwrap();
        let dur_sel = Selector::parse("span.video-duration").unwrap();
        let views_sel = Selector::parse("span.video-views").unwrap();

        for card in document.select(&vid_sel) {
            let title = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default();

            let url = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();

            let duration = card
                .select(&dur_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into());

            if !title.is_empty() {
                response.video.push(VideoResult {
                    title,
                    url,
                    views: None,
                    duration,
                    date: None,
                    description: None,
                    source: Some("brave".into()),
                    author: None,
                    thumb: None,
                });
            }
        }

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        let url = format!(
            "https://search.brave.com/news?q={}",
            urlencoding(&query.q)
        );

        let html = self
            .http
            .client
            .get(&url)
            .send()
            .await?
            .text()
            .await?;

        let document = Html::parse_document(&html);
        let mut response = NewsResponse::empty();

        let news_sel = Selector::parse("div.news-card").unwrap();
        let title_sel = Selector::parse("a.news-title").unwrap();
        let desc_sel = Selector::parse("div.news-description").unwrap();
        let src_sel = Selector::parse("span.news-source").unwrap();
        let date_sel = Selector::parse("time.news-date").unwrap();

        for card in document.select(&news_sel) {
            let title = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default();

            let url = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();

            let description = card
                .select(&desc_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default();

            let source = card
                .select(&src_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into());

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

        Ok(response)
    }

    async fn autocomplete(&self, query: &str) -> Result<Vec<String>, AppError> {
        let resp = self
            .http
            .client
            .get("https://search.brave.com/api/suggest")
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

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
