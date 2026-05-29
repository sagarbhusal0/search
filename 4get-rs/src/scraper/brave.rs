use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
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

        let snippet_sel = Selector::parse("div.snippet[data-type=web]").unwrap();
        let title_sel = Selector::parse(".search-snippet-title").unwrap();
        let desc_sel = Selector::parse(".generic-snippet").unwrap();
        let url_sel = Selector::parse("a.l1").unwrap();

        for snippet in document.select(&snippet_sel) {
            let title = snippet
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default()
                .trim()
                .to_string();

            let url_text = snippet
                .select(&url_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or_default()
                .to_string();

            let description = snippet
                .select(&desc_sel)
                .next()
                .map(|e| e.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            if !title.is_empty() {
                response.web.push(WebResult {
                    title,
                    url: url_text.trim().to_string(),
                    description,
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

        let img_sel = Selector::parse("button.image-result").unwrap();
        let title_sel = Selector::parse(".image-metadata-title").unwrap();
        let src_sel = Selector::parse(".image-wrapper img").unwrap();

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

            if !final_url.is_empty() && !title.trim().is_empty() {
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

        let vid_sel = Selector::parse("div.snippet[data-type=videos]").unwrap();
        let title_sel = Selector::parse("div.title").unwrap();
        let dur_sel = Selector::parse("div.duration").unwrap();
        let url_sel = Selector::parse("a.l1").unwrap();

        for card in document.select(&vid_sel) {
            let title = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default();

            let url = card
                .select(&url_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();

            let duration = card
                .select(&dur_sel)
                .next()
                .map(|e| e.text().collect::<String>())
                .and_then(|d| {
                    let parts: Vec<&str> = d.split(':').collect();
                    let mut secs: i64 = 0;
                    if parts.len() == 3 {
                        secs += parts[0].parse::<i64>().unwrap_or(0) * 3600;
                        secs += parts[1].parse::<i64>().unwrap_or(0) * 60;
                        secs += parts[2].parse::<i64>().unwrap_or(0);
                    } else if parts.len() == 2 {
                        secs += parts[0].parse::<i64>().unwrap_or(0) * 60;
                        secs += parts[1].parse::<i64>().unwrap_or(0);
                    } else {
                        secs = d.parse::<i64>().unwrap_or(0);
                    }
                    (secs > 0).then_some(secs)
                });

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

        let news_sel = Selector::parse("div[data-type=\"news\"]").unwrap();
        let title_sel = Selector::parse("div.title").unwrap();
        let url_sel = Selector::parse("a.l1").unwrap();
        let desc_sel = Selector::parse("div.description").unwrap();
        let src_sel = Selector::parse("span.desktop-small-semibold").unwrap();
        let _date_sel = Selector::parse("span.desktop-small-regular.t-tertiary").unwrap();

        for card in document.select(&news_sel) {
            let title = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default();

            let url = card
                .select(&url_sel)
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
