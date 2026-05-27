use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Startpage {
    http: HttpClient,
}

impl Startpage {
    pub fn new(http: HttpClient) -> Self {
        Startpage { http }
    }
}

#[async_trait]
impl Scraper for Startpage {
    fn name(&self) -> &str {
        "startpage"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!(
            "https://www.startpage.com/sp/search?query={}&language=en",
            urlencoding(&query.q)
        );

        let html = self
            .http
            .client
            .get(&url)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("User-Agent", &self.http.user_agent)
            .send()
            .await?
            .text()
            .await?;

        let document = Html::parse_document(&html);
        let mut response = WebResponse::empty();

        let result_sel = Selector::parse("div.search-item, div.result").unwrap();
        let title_sel = Selector::parse("h3 a, a.result-title").unwrap();
        let desc_sel = Selector::parse("p.description, div.description").unwrap();

        for result in document.select(&result_sel) {
            let title = result
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default()
                .trim()
                .to_string();

            let url = result
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();

            let description: String = result
                .select(&desc_sel)
                .next()
                .map(|e| e.text().collect())
                .unwrap_or_default()
                .trim()
                .to_string();

            if !title.is_empty() {
                response.web.push(WebResult {
                    title,
                    url,
                    description,
                    date: None,
                    source: Some("startpage".into()),
                });
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!(
            "https://www.startpage.com/sp/search?query={}&tbm=isch&language=en",
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
        let mut response = ImageResponse::empty();

        let img_sel = Selector::parse("img.image-result, img[src*='image']").unwrap();
        let parent_sel = Selector::parse("div.image-item, div.search-item").unwrap();

        for parent in document.select(&parent_sel) {
            let img = parent.select(&img_sel).next();
            let img_url = img
                .and_then(|e| e.value().attr("src"))
                .or_else(|| img.and_then(|e| e.value().attr("data-src")))
                .unwrap_or("")
                .to_string();
            let title = img.and_then(|e| e.value().attr("alt")).unwrap_or("").to_string();

            if !img_url.is_empty() && !img_url.starts_with("data:") {
                response.image.push(ImageResult {
                    title,
                    source: vec![ImageSource {
                        url: img_url,
                        width: None,
                        height: None,
                    }],
                });
            }
        }

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        let url = format!(
            "https://www.startpage.com/sp/search?query={}&tbm=nws&language=en",
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

        let news_sel = Selector::parse("div.search-item, div.news-result").unwrap();
        let title_sel = Selector::parse("h3 a, a.result-title").unwrap();
        let desc_sel = Selector::parse("p.description, div.description").unwrap();

        for card in document.select(&news_sel) {
            let title: String = card.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();
            let url = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();
            let description: String = card.select(&desc_sel).next().map(|e| e.text().collect()).unwrap_or_default();

            if !title.is_empty() {
                response.news.push(NewsResult {
                    title,
                    url,
                    description,
                    date: None,
                    source: None,
                });
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!(
            "https://www.startpage.com/sp/search?query={}&tbm=vid&language=en",
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

        let vid_sel = Selector::parse("div.search-item, div.video-result").unwrap();
        let title_sel = Selector::parse("h3 a, a.result-title").unwrap();
        let dur_sel = Selector::parse("span.duration, span.video-duration").unwrap();

        for card in document.select(&vid_sel) {
            let title: String = card.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();
            let url = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();
            let duration: String = card.select(&dur_sel).next().map(|e| e.text().collect()).unwrap_or_default();

            if !title.is_empty() {
                response.video.push(VideoResult {
                    title,
                    url,
                    views: None,
                    duration: if duration.is_empty() { None } else { Some(duration.trim().to_string()) },
                    date: None,
                    description: None,
                    source: Some("startpage".into()),
                    thumb: None,
                });
            }
        }

        Ok(response)
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
