use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Baidu {
    http: HttpClient,
}

impl Baidu {
    pub fn new(http: HttpClient) -> Self {
        Baidu { http }
    }
}

#[async_trait]
impl Scraper for Baidu {
    fn name(&self) -> &str {
        "baidu"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!("https://www.baidu.com/s?wd={}&ie=utf-8", urlencoding(&query.q));

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

        let result_sel = Selector::parse("div.result, div.c-container").unwrap();
        let title_sel = Selector::parse("h3 a, a[href*='baidu']").unwrap();
        let desc_sel = Selector::parse("span.content-right_8Zs40, div.c-abstract, span.normal-c-abstract").unwrap();

        for result in document.select(&result_sel) {
            let title = result
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default()
                .trim()
                .to_string();

            let link = result
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();

            let description: String = result
                .select(&desc_sel)
                .next()
                .map(|e| e.text().collect::<String>())
                .unwrap_or_default()
                .trim()
                .to_string();

            if !title.is_empty() {
                response.web.push(WebResult {
                    title,
                    url: link,
                    description,
                    date: None,
                    source: Some("baidu".into()),
                });
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!("https://image.baidu.com/search/index?tn=baiduimage&word={}", urlencoding(&query.q));

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

        let img_sel = Selector::parse("img.main_img, img[src*='img']").unwrap();
        let parent_sel = Selector::parse("li.imgitem, div.imgbox").unwrap();

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
                    url: img_url.clone(),
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
        let url = format!("https://news.baidu.com/ns?word={}&tn=news&from=news", urlencoding(&query.q));

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

        let news_sel = Selector::parse("div.news-item, li.result").unwrap();
        let title_sel = Selector::parse("a[href*='baidu']").unwrap();
        let desc_sel = Selector::parse("span.c-summary, div.c-summary").unwrap();
        let src_sel = Selector::parse("span.c-color-gray, p.src").unwrap();

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
            let source: String = card.select(&src_sel).next().map(|e| e.text().collect()).unwrap_or_default();

            if !title.is_empty() {
                response.news.push(NewsResult {
                    title,
                    url,
                    description,
                    date: None,
                    source: Some(source).filter(|s| !s.is_empty()),
                    thumb: None,
                });
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!("https://v.baidu.com/v?word={}&ie=utf-8", urlencoding(&query.q));

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

        let vid_sel = Selector::parse("div.video-result, li.result").unwrap();
        let title_sel = Selector::parse("a.video-title, a[href*='video']").unwrap();
        let dur_sel = Selector::parse("span.video-duration, span.duration").unwrap();

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
                    source: Some("baidu".into()),
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
