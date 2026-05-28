use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use regex::Regex;
use scraper::{Html, Selector};

pub struct Google {
    http: HttpClient,
}

impl Google {
    pub fn new(http: HttpClient) -> Self {
        Google { http }
    }
}

#[async_trait]
impl Scraper for Google {
    fn name(&self) -> &str {
        "google"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let url = format!(
            "https://www.google.com/search?q={}&hl=en",
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

        // Web results
        let result_sel = Selector::parse("div.g").unwrap();
        let title_sel = Selector::parse("h3").unwrap();
        let link_sel = Selector::parse("a").unwrap();
        let desc_sel = Selector::parse("div.VwiC3b, span.st, div[data-sncf]").unwrap();

        for result in document.select(&result_sel) {
            let title = result
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default()
                .trim()
                .to_string();

            let url = result
                .select(&link_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .map(|h| h.to_string())
                .unwrap_or_default();

            // Clean Google redirect URLs
            let clean_url = clean_google_url(&url);

            let description = result
                .select(&desc_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default()
                .trim()
                .to_string();

            if !title.is_empty() {
                response.web.push(WebResult {
                    title,
                    url: clean_url,
                    description,
                    date: None,
                    source: Some("google".into()),
                });
            }
        }

        // Related searches
        let related_sel = Selector::parse("a[href*='/search?q=']").unwrap();
        for link in document.select(&related_sel) {
            let text: String = link.text().collect();
            let text = text.trim().to_string();
            if !text.is_empty() && text.len() > 2 && !response.related.contains(&text) {
                response.related.push(text);
            }
        }
        response.related.truncate(10);

        // Next page
        let nav_sel = Selector::parse("a#pnnext, a[aria-label='Next page']").unwrap();
        if let Some(next) = document.select(&nav_sel).next() {
            if let Some(href) = next.value().attr("href") {
                if let Some(npt) = extract_npt_from_url(href) {
                    response.npt = Some(npt);
                }
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let url = format!(
            "https://www.google.com/search?q={}&tbm=isch&hl=en",
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
        let mut response = ImageResponse::empty();

        let img_sel = Selector::parse("div[data-ow], div.isv-r, div.rg_bx").unwrap();
        let title_sel = Selector::parse("a[href*='/imgres']").unwrap();
        let src_sel = Selector::parse("img.rg_i, img.sFlh5c").unwrap();
        let meta_sel = Selector::parse("div[data-ow]").unwrap();

        for container in document.select(&img_sel) {
            let title = container
                .select(&title_sel)
                .next()
                .and_then(|e| e.value().attr("aria-label"))
                .or_else(|| {
                    container
                        .select(&Selector::parse("div:not([class])").unwrap())
                        .next()
                        .and_then(|e| e.text().collect::<String>().into())
                })
                .unwrap_or_default();

            let img_url = container
                .select(&src_sel)
                .next()
                .and_then(|e| {
                    e.value()
                        .attr("src")
                        .or_else(|| e.value().attr("data-src"))
                })
                .unwrap_or("")
                .to_string();

            let width = container
                .value()
                .attr("data-ow")
                .and_then(|v| v.parse::<u32>().ok());
            let height = container
                .value()
                .attr("data-oh")
                .and_then(|v| v.parse::<u32>().ok());

            if !img_url.is_empty() && !img_url.starts_with("data:") {
                response.image.push(ImageResult {
                    title,
                    url: img_url.clone(),
                    source: vec![ImageSource {
                        url: img_url,
                        width,
                        height,
                    }],
                });
            }
        }

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        let url = format!(
            "https://www.google.com/search?q={}&tbm=nws&hl=en",
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
        let mut response = NewsResponse::empty();

        let news_sel = Selector::parse("div.SoaBEf, g-card, div.WlydOe").unwrap();
        let title_sel = Selector::parse("div.n0jPhd, h3").unwrap();
        let desc_sel = Selector::parse("div.GI74Re, div.YSL3");
        let src_sel = Selector::parse("span.CEMjEf, span.wH6SXe").unwrap();

        for card in document.select(&news_sel) {
            let title = card
                .select(&title_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into())
                .unwrap_or_default()
                .trim()
                .to_string();

            let link = card
                .select(&Selector::parse("a").unwrap())
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();

            let description: String = card
                .select(&Selector::parse("div.GI74Re, div.YSL3").unwrap())
                .next()
                .map(|e| e.text().collect())
                .unwrap_or_default();

            let source = card
                .select(&src_sel)
                .next()
                .and_then(|e| e.text().collect::<String>().into());

            if !title.is_empty() {
                response.news.push(NewsResult {
                    title,
                    url: clean_google_url(&link),
                    description,
                    date: None,
                    source,
                    thumb: None,
                });
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let url = format!(
            "https://www.google.com/search?q={}&tbm=vid&hl=en",
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

        let vid_sel = Selector::parse("div.obcontainer, div[lang] > div > div").unwrap();
        let title_sel = Selector::parse("h3").unwrap();
        let link_sel = Selector::parse("a").unwrap();

        for card in document.select(&vid_sel) {
            let title: String = card.select(&title_sel).next().map(|e| e.text().collect()).unwrap_or_default();
            let title = title.trim().to_string();

            let link = card
                .select(&link_sel)
                .next()
                .and_then(|e| e.value().attr("href"))
                .unwrap_or("")
                .to_string();

            if !title.is_empty() && title.len() > 3 {
                response.video.push(VideoResult {
                    title,
                    url: clean_google_url(&link),
                    views: None,
                    duration: None,
                    date: None,
                    description: None,
                    source: Some("google".into()),
                    author: None,
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
            .get("https://suggestqueries.google.com/complete/search")
            .query(&[
                ("client", "firefox"),
                ("q", query),
                ("hl", "en"),
                ("gl", "us"),
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

fn clean_google_url(url: &str) -> String {
    if url.starts_with("/url?q=") {
        let re = Regex::new(r"/url\?q=([^&]+)").unwrap();
        if let Some(caps) = re.captures(url) {
            if let Some(decoded) = caps.get(1) {
                return urlencoding_decode(decoded.as_str()).unwrap_or_default();
            }
        }
    }
    url.to_string()
}

fn extract_npt_from_url(href: &str) -> Option<String> {
    let re = Regex::new(r"[?&]ei=([^&]+)").ok()?;
    re.captures(href)
        .and_then(|c| c.get(1))
        .map(|m| format!("google_{}", m.as_str()))
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}

fn urlencoding_decode(s: &str) -> Option<String> {
    url::form_urlencoded::parse(s.as_bytes())
        .map(|(k, v)| {
            if k.is_empty() {
                v.to_string()
            } else {
                format!("{}={}", k, v)
            }
        })
        .collect::<Vec<_>>()
        .first()
        .cloned()
}
