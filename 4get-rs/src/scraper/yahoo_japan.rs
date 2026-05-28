use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct YahooJapan {
    http: HttpClient,
}

impl YahooJapan {
    pub fn new(http: HttpClient) -> Self {
        YahooJapan { http }
    }
}

#[async_trait]
impl Scraper for YahooJapan {
    fn name(&self) -> &str {
        "yahoo_japan"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!("https://search.yahoo.co.jp/search?p={}&ei=UTF-8", urlencoding(&query.q));

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

        let result_sel = Selector::parse("div.Result, div[class*='result']").unwrap();
        let title_sel = Selector::parse("a[class*='title'], h3 a").unwrap();
        let desc_sel = Selector::parse("div[class*='description'], p").unwrap();

        for result in document.select(&result_sel) {
            let title: String = result.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();
            let url = result
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();
            let description: String = result.select(&desc_sel).next().map(|e| e.text().collect()).unwrap_or_default();

            if !title.is_empty() {
                response.web.push(WebResult {
                    title,
                    url,
                    description,
                    date: None,
                    source: Some("yahoo_japan".into()),
                });
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!("https://search.yahoo.co.jp/image/search?p={}&ei=UTF-8", urlencoding(&query.q));

        let html = self.http.client.get(&url).send().await?.text().await?;
        let document = Html::parse_document(&html);
        let mut response = ImageResponse::empty();

        let img_sel = Selector::parse("img[src*='yimg'], img[src*='image']").unwrap();
        let parent_sel = Selector::parse("li, div[class*='item']").unwrap();

        for parent in document.select(&parent_sel) {
            let img = parent.select(&img_sel).next();
            let img_url = img.and_then(|e| e.value().attr("src")).unwrap_or("").to_string();
            let title = img.and_then(|e| e.value().attr("alt")).unwrap_or("").to_string();

            if !img_url.is_empty() && !img_url.starts_with("data:") {
                response.image.push(ImageResult {
                    title,
                    url: img_url.clone(),
                    source: vec![ImageSource { url: img_url, width: None, height: None }],
                });
            }
        }

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        let url = format!("https://search.yahoo.co.jp/search?p={}&n=10&ei=UTF-8&tpa=news", urlencoding(&query.q));

        let html = self.http.client.get(&url).send().await?.text().await?;
        let document = Html::parse_document(&html);
        let mut response = NewsResponse::empty();

        let news_sel = Selector::parse("div.newsFeedItem, div[class*='news']").unwrap();
        let title_sel = Selector::parse("a[class*='title']").unwrap();
        let desc_sel = Selector::parse("div[class*='desc'], p").unwrap();

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
                    thumb: None,
                });
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!("https://search.yahoo.co.jp/video/search?p={}&ei=UTF-8", urlencoding(&query.q));

        let html = self.http.client.get(&url).send().await?.text().await?;
        let document = Html::parse_document(&html);
        let mut response = VideoResponse::empty();

        let vid_sel = Selector::parse("div[class*='video'], div[class*='result']").unwrap();
        let title_sel = Selector::parse("a[class*='title']").unwrap();
        let dur_sel = Selector::parse("span[class*='time'], span[class*='duration']").unwrap();

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
                    source: Some("yahoo_japan".into()),
                    author: None,
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
