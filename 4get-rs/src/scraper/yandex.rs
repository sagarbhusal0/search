use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Yandex {
    http: HttpClient,
}

impl Yandex {
    pub fn new(http: HttpClient) -> Self {
        Yandex { http }
    }

    async fn get_i_cookie(&self, client: &reqwest::Client) -> Option<String> {
        let resp = client
            .get("https://yandex.ru/support2/smart-captcha/ru/")
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("Sec-Fetch-Dest", "document")
            .header("Sec-Fetch-Mode", "navigate")
            .header("Sec-Fetch-Site", "none")
            .header("Sec-Fetch-User", "?1")
            .send()
            .await
            .ok()?;

        let mut i_cookie = None;
        for (key, value) in resp.headers() {
            if key == "set-cookie" {
                let val = value.to_str().unwrap_or("");
                if let Some(start) = val.find("i=") {
                    let rest = &val[start + 2..];
                    if let Some(end) = rest.find(';') {
                        i_cookie = Some(rest[..end].to_string());
                    } else {
                        i_cookie = Some(rest.to_string());
                    }
                }
            }
        }
        i_cookie
    }

    fn yp_cookie(nsfw: &NsfwLevel) -> String {
        let nsfw_val = match nsfw {
            NsfwLevel::Yes => "0",
            NsfwLevel::Maybe => "1",
            NsfwLevel::No => "2",
        };
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        format!(
            "yp={}.szm.1:1920x1080:876x1000#{}.sp.family:{}",
            ts - 4000033,
            ts,
            nsfw_val
        )
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}

#[async_trait]
impl Scraper for Yandex {
    fn name(&self) -> &str {
        "yandex"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let (client, _label) = self.http.get_or_raw_client(Some("yandex"));

        // Step 1: Get clearance cookie
        let i_cookie = self.get_i_cookie(&client).await;

        // Step 2: Make search request using /search/site/ like PHP does
        let url = "https://yandex.com/search/site/";
        let yp = Self::yp_cookie(&query.nsfw);

        let mut cookie_header = yp;
        if let Some(ref i) = i_cookie {
            cookie_header.push_str(&format!("; i={}", i));
        }

        let resp = client
            .get(url)
            .query(&[
                ("text", query.q.as_str()),
                ("web", "1"),
                ("frame", "1"),
                ("searchid", "3131712"),
            ])
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("User-Agent", self.http.random_ua())
            .header("DNT", "1")
            .header("Sec-GPC", "1")
            .header("Cookie", &cookie_header)
            .header("Referer", "https://yandex.com/images/search")
            .header("Connection", "keep-alive")
            .header("Upgrade-Insecure-Requests", "1")
            .header("Sec-Fetch-Dest", "document")
            .header("Sec-Fetch-Mode", "navigate")
            .header("Sec-Fetch-Site", "cross-site")
            .send()
            .await?;

        let final_url = resp.url().clone();
        let html = resp.text().await?;

        let final_url_str = final_url.as_str();
        if final_url_str.contains("showcaptchafast")
            || final_url_str.contains("captcha")
            || html.contains("<title>Verification</title>")
            || html.contains("<title>Are you a robot?")
        {
            return Err(AppError::ScraperError(
                "Yandex blocked this request (captcha). Add proxies to data/proxies/yandex.txt".into(),
            ));
        }

        if html.len() < 500 {
            return Err(AppError::ScraperError(
                "Yandex returned an empty or blocked response.".into(),
            ));
        }

        let document = Html::parse_document(&html);
        let mut response = WebResponse::empty();

        let result_sel = Selector::parse("[data-cid], li.serp-item, div.Organic, div.serp-item").unwrap();
        let title_sel = Selector::parse("h2 a, a.OrganicTitle-Link, a.Link").unwrap();
        let desc_sel = Selector::parse("[class*='OrganicText'], [class*='TextContainer'], div[class*='text']").unwrap();

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

            if !title.is_empty() && !link.is_empty() {
                response.web.push(WebResult {
                    title,
                    url: link,
                    description,
                    date: None,
                    source: Some("yandex".into()),
                });
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let (client, _label) = self.http.get_or_raw_client(Some("yandex"));

        let i_cookie = self.get_i_cookie(&client).await;

        let url = format!(
            "https://yandex.com/images/search?text={}&isize=large",
            urlencoding(&query.q)
        );

        let mut cookie_header = Self::yp_cookie(&query.nsfw);
        if let Some(ref i) = i_cookie {
            cookie_header.push_str(&format!("; i={}", i));
        }

        let html = client
            .get(&url)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("User-Agent", self.http.random_ua())
            .header("Cookie", &cookie_header)
            .header("Sec-Fetch-Dest", "document")
            .header("Sec-Fetch-Mode", "navigate")
            .header("Sec-Fetch-Site", "none")
            .header("Sec-Fetch-User", "?1")
            .send()
            .await?
            .text()
            .await?;

        if html.contains("showcaptchafast") || html.contains("<title>Verification</title>") {
            return Err(AppError::ScraperError(
                "Yandex blocked this request (captcha). Add proxies to data/proxies/yandex.txt".into(),
            ));
        }

        let document = Html::parse_document(&html);
        let mut response = ImageResponse::empty();

        let img_sel = Selector::parse("img.serp-item__thumb, img[class*='thumb'], img.CbirSites-ItemImage").unwrap();
        let parent_sel = Selector::parse("div.serp-item, a.serp-item__link, div.CbirSites-Item").unwrap();

        for parent in document.select(&parent_sel) {
            let img = parent.select(&img_sel).next();
            let img_url = img
                .and_then(|e| e.value().attr("src"))
                .or_else(|| img.and_then(|e| e.value().attr("data-src")))
                .unwrap_or("")
                .to_string();

            let title = img
                .and_then(|e| e.value().attr("alt"))
                .unwrap_or("")
                .to_string();

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

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let (client, _label) = self.http.get_or_raw_client(Some("yandex"));

        let i_cookie = self.get_i_cookie(&client).await;

        let url = format!(
            "https://yandex.com/video/search?text={}",
            urlencoding(&query.q)
        );

        let mut cookie_header = Self::yp_cookie(&query.nsfw);
        if let Some(ref i) = i_cookie {
            cookie_header.push_str(&format!("; i={}", i));
        }

        let html = client
            .get(&url)
            .header("Accept", "text/html")
            .header("User-Agent", self.http.random_ua())
            .header("Cookie", &cookie_header)
            .header("Sec-Fetch-Dest", "document")
            .header("Sec-Fetch-Mode", "navigate")
            .send()
            .await?
            .text()
            .await?;

        if html.contains("showcaptchafast") || html.contains("<title>Verification</title>") {
            return Err(AppError::ScraperError(
                "Yandex blocked this request (captcha). Add proxies to data/proxies/yandex.txt".into(),
            ));
        }

        let document = Html::parse_document(&html);
        let mut response = VideoResponse::empty();

        let vid_sel = Selector::parse("div.video-card, div.thumb-wrap, div.CbirVideo-Item").unwrap();
        let title_sel = Selector::parse("a.video-card__title, h3, a.CbirVideo-ItemLink").unwrap();
        let dur_sel = Selector::parse("span.video-card__duration, span.duration, span.CbirVideo-ItemDuration").unwrap();

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
            let duration_secs = if duration.is_empty() {
                None
            } else {
                let d = duration.trim();
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
            };

            if !title.is_empty() {
                response.video.push(VideoResult {
                    title,
                    url,
                    views: None,
                    duration: duration_secs,
                    date: None,
                    description: None,
                    source: Some("yandex".into()),
                    author: None,
                    thumb: None,
                });
            }
        }

        Ok(response)
    }
}
