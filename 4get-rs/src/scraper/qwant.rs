use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use std::collections::HashMap;

pub struct Qwant {
    http: HttpClient,
}

impl Qwant {
    pub fn new(http: HttpClient) -> Self {
        Qwant { http }
    }

    fn nsfw_level(nsfw: &NsfwLevel) -> u8 {
        match nsfw {
            NsfwLevel::Yes => 0,
            NsfwLevel::Maybe => 1,
            NsfwLevel::No => 2,
        }
    }

    fn get_country(query: &SearchQuery) -> String {
        query
            .filters
            .get("f_country")
            .cloned()
            .unwrap_or_else(|| "en_US".to_string())
    }

    fn get_freshness(query: &SearchQuery) -> Option<String> {
        query.filters.get("f_time").cloned().filter(|s| s != "any")
    }

    fn trimdots(text: &str) -> String {
        text.trim_matches(|c| c == '.' || c == ' ').to_string()
    }

    fn limit_strlen(text: &str, max: usize) -> String {
        if text.len() <= max {
            return text.to_string();
        }
        text.chars().take(max).collect()
    }

    async fn get_json(
        &self,
        url: &str,
        params: &HashMap<String, String>,
    ) -> Result<serde_json::Value, AppError> {
        let resp = self
            .http
            .client
            .get(url)
            .query(params)
            .header("Accept", "application/json, text/plain, */*")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("DNT", "1")
            .header("Connection", "keep-alive")
            .header("Origin", "https://www.qwant.com")
            .header("Referer", "https://www.qwant.com/")
            .header("Sec-Fetch-Dest", "empty")
            .header("Sec-Fetch-Mode", "cors")
            .header("Sec-Fetch-Site", "same-site")
            .header("TE", "trailers")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        if resp.get("status").and_then(|v| v.as_str()) == Some("error") {
            if let Some(data) = resp.get("data") {
                if data.get("error_data").and_then(|e| e.get("captchaUrl")).is_some() {
                    return Err(AppError::ScraperError("Qwant returned a captcha".into()));
                }
                if let Some(code) = data.get("error_data").and_then(|e| e.get("error_code")) {
                    return Err(AppError::ScraperError(format!(
                        "Qwant API error: {}",
                        code
                    )));
                }
            }
            return Err(AppError::ScraperError(
                "Qwant returned an API error".into(),
            ));
        }

        if let Some(url) = resp.get("url").and_then(|v| v.as_str()) {
            if url.contains("captcha") {
                return Err(AppError::ScraperError(
                    "Qwant returned a captcha redirect".into(),
                ));
            }
        }

        if let Some(msg) = resp
            .get("data")
            .and_then(|d| d.get("message"))
            .and_then(|m| m.get(0))
        {
            return Err(AppError::ScraperError(format!(
                "Qwant server error: {}",
                msg.as_str().unwrap_or("unknown")
            )));
        }

        Ok(resp)
    }
}

#[async_trait]
impl Scraper for Qwant {
    fn name(&self) -> &str {
        "qwant"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let mut params: HashMap<String, String> = if let Some(npt) = &query.npt {
            let stored: HashMap<String, String> = serde_json::from_str(npt)
                .map_err(|_| AppError::ScraperError("Invalid NPT data".into()))?;
            stored
        } else {
            if query.q.is_empty() {
                return Err(AppError::BadRequest("Search term is empty".into()));
            }
            let mut p = HashMap::new();
            p.insert("q".to_string(), query.q.clone());
            p.insert("count".to_string(), "10".to_string());
            p.insert("locale".to_string(), Self::get_country(query));
            p.insert("offset".to_string(), "0".to_string());
            p.insert("device".to_string(), "desktop".to_string());
            p.insert("tgp".to_string(), "3".to_string());
            p.insert("displayed".to_string(), "true".to_string());
            p.insert(
                "safesearch".to_string(),
                Self::nsfw_level(&query.nsfw).to_string(),
            );

            if let Some(freshness) = Self::get_freshness(query) {
                p.insert("freshness".to_string(), freshness);
            }

            if query.extended_search {
                p.insert("extendedsearch".to_string(), "yes".to_string());
            }

            p
        };

        let json = self
            .get_json("https://fdn.qwant.com/v3/search/web", &params)
            .await?;

        let mut response = WebResponse::empty();

        let error_code = json
            .get("data")
            .and_then(|d| d.get("error_code"))
            .and_then(|v| v.as_i64());
        if json.get("status").and_then(|v| v.as_str()) != Some("success")
            && error_code == Some(5)
        {
            return Ok(response);
        }

        let mainline = json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|i| i.get("mainline"))
            .and_then(|m| m.as_array())
            .ok_or_else(|| AppError::ScraperError("Server did not return results".into()))?;

        if let Some(altered) = json
            .get("data")
            .and_then(|d| d.get("query"))
            .and_then(|q| q.get("queryContext"))
            .and_then(|c| c.get("alteredQuery"))
            .and_then(|v| v.as_str())
        {
            let correction = json["data"]["query"]["queryContext"]["alterationOverrideQuery"]
                .as_str()
                .unwrap_or("");
            response.spelling = SpellCorrection {
                correction_type: "including".to_string(),
                using: altered.to_string(),
                correction: correction.to_string(),
            };
        }

        for section in mainline {
            let section_type = section.get("type").and_then(|v| v.as_str()).unwrap_or("");
            let items = match section.get("items").and_then(|i| i.as_array()) {
                Some(a) => a,
                None => continue,
            };

            match section_type {
                "web" => {
                    let mut first = true;
                    for item in items {
                        let url = item
                            .get("url")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        if first && !item.get("urlPingSuffix").is_some() {
                            return Err(AppError::ScraperError(
                                "Qwant returned gibberish results".into(),
                            ));
                        }
                        first = false;

                        let title = Self::trimdots(
                            item.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                        );
                        let description = Self::trimdots(
                            item.get("desc").and_then(|v| v.as_str()).unwrap_or(""),
                        );

                        let _thumb = item
                            .get("thumbnailUrl")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(String::from);

                        let mut sublinks = Vec::new();
                        if let Some(links) = item.get("links").and_then(|l| l.as_array()) {
                            for link in links {
                                let link_title = Self::trimdots(
                                    link.get("title")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or(""),
                                );
                                let _link_desc = link
                                    .get("desc")
                                    .and_then(|v| v.as_str())
                                    .map(|d| Self::trimdots(d));
                                let link_url = link
                                    .get("url")
                                    .and_then(|v| v.as_str())
                                    .map(String::from);

                                sublinks.push(DescNode {
                                    node_type: "text".to_string(),
                                    value: Some(format!("{}: {}", link_title, link_url.as_deref().unwrap_or(""))),
                                    url: link_url,
                                });
                            }
                        }

                        response.web.push(WebResult {
                            title,
                            url,
                            description,
                            date: None,
                            source: Some("qwant".into()),
                        });
                    }
                }
                "images" => {
                    for item in items {
                        let title = item
                            .get("title")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let media = item
                            .get("media")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let thumb = item
                            .get("thumbnail")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let width = item.get("width").and_then(|v| v.as_u64());
                        let height = item.get("height").and_then(|v| v.as_u64());
                        let thumb_width = item.get("thumb_width").and_then(|v| v.as_u64());
                        let thumb_height = item.get("thumb_height").and_then(|v| v.as_u64());
                        let page_url = item
                            .get("url")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        if !media.is_empty() {
                            let mut sources = vec![ImageSource {
                                url: media,
                                width: width.map(|w| w as u32),
                                height: height.map(|h| h as u32),
                            }];
                            if !thumb.is_empty() {
                                sources.push(ImageSource {
                                    url: thumb,
                                    width: thumb_width.map(|w| w as u32),
                                    height: thumb_height.map(|h| h as u32),
                                });
                            }
                            response.image.push(ImageResult {
                                title,
                                url: page_url,
                                source: sources,
                            });
                        }
                    }
                }
                "videos" => {
                    for item in items {
                        let title = item
                            .get("title")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let url = item
                            .get("url")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let date = item.get("date").and_then(|v| v.as_i64());
                        let duration = item
                            .get("duration")
                            .and_then(|v| v.as_i64())
                            .map(|d| d / 1000);
                        let thumb = item
                            .get("thumbnail")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(String::from);

                        response.video.push(VideoResult {
                            title,
                            url,
                            views: None,
                            duration: duration.filter(|&d| d != 0),
                            date,
                            description: None,
                            source: Some("qwant".into()),
                            author: None,
                            thumb,
                        });
                    }
                }
                "related_searches" => {
                    for item in items {
                        if let Some(text) = item.get("text").and_then(|v| v.as_str()) {
                            response.related.push(text.to_string());
                        }
                    }
                }
                _ => {}
            }
        }

        let last_page = json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("lastPage"))
            .and_then(|v| v.as_bool())
            .unwrap_or(true);

        if !last_page {
            let offset: u64 = params
                .get("offset")
                .and_then(|o| o.parse().ok())
                .unwrap_or(0);
            params.insert("offset".to_string(), (offset + 10).to_string());
            response.npt = Some(serde_json::to_string(&params).unwrap_or_default());
        }

        if let Some(sidebar) = json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|i| i.get("sidebar"))
            .and_then(|s| s.get(0))
        {
            if let Some(endpoint) = sidebar.get("endpoint").and_then(|v| v.as_str()) {
                if query.extended_search {
                    let answer_url = format!("https://api.qwant.com/v3{}", endpoint);
                    if let Ok(answer) = self.get_json(&answer_url, &HashMap::new()).await {
                        if answer.get("status").and_then(|v| v.as_str()) == Some("success") {
                            if let Some(result) = answer
                                .get("data")
                                .and_then(|d| d.get("result"))
                                .filter(|r| !r.is_null())
                            {
                                let title = result
                                    .get("title")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                let description = result
                                    .get("description")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                let url = result
                                    .get("url")
                                    .and_then(|v| v.as_str())
                                    .map(String::from);
                                let thumb = result
                                    .get("thumbnail")
                                    .and_then(|t| t.get("landscape"))
                                    .and_then(|l| l.as_str())
                                    .filter(|s| !s.is_empty())
                                    .map(String::from);

                                response.answer.push(AnswerResult {
                                    title: Some(title),
                                    url,
                                    thumb,
                                    description: vec![DescNode {
                                        node_type: "text".to_string(),
                                        value: Some(Self::trimdots(&description)),
                                        url: None,
                                    }],
                                    table: HashMap::new(),
                                    sublink: HashMap::new(),
                                });
                            }
                        }
                    }
                }
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let mut params: HashMap<String, String> = if let Some(npt) = &query.npt {
            serde_json::from_str(npt)
                .map_err(|_| AppError::ScraperError("Invalid NPT data".into()))?
        } else {
            if query.q.is_empty() {
                return Err(AppError::BadRequest("Search term is empty".into()));
            }
            let mut p = HashMap::new();
            p.insert("t".to_string(), "images".to_string());
            p.insert("q".to_string(), query.q.clone());
            p.insert("count".to_string(), "125".to_string());
            p.insert("locale".to_string(), Self::get_country(query));
            p.insert("offset".to_string(), "0".to_string());
            p.insert("device".to_string(), "desktop".to_string());
            p.insert("tgp".to_string(), "3".to_string());
            p.insert(
                "safesearch".to_string(),
                Self::nsfw_level(&query.nsfw).to_string(),
            );

            if let Some(freshness) = Self::get_freshness(query) {
                p.insert("freshness".to_string(), freshness);
            }

            for key in &["size", "color", "imagetype", "license"] {
                if let Some(val) = query.filters.get(&format!("f_{}", key)) {
                    if val != "any" {
                        p.insert(key.to_string(), val.clone());
                    }
                }
            }

            p
        };

        let json = self
            .get_json("https://api.qwant.com/v3/search/images", &params)
            .await?;

        let mut response = ImageResponse::empty();

        if json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|i| i.get("mainline"))
            .is_some()
        {
            return Err(AppError::ScraperError(
                "Qwant returned gibberish results".into(),
            ));
        }

        let items = json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|i| i.as_array());

        if let Some(images) = items {
            for image in images {
                let title = Self::trimdots(
                    image.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                );
                let media = image
                    .get("media")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let thumb = image
                    .get("thumbnail")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let width = image.get("width").and_then(|v| v.as_u64());
                let height = image.get("height").and_then(|v| v.as_u64());
                let thumb_width = image.get("thumb_width").and_then(|v| v.as_u64());
                let thumb_height = image.get("thumb_height").and_then(|v| v.as_u64());
                let page_url = image
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                if !media.is_empty() {
                    let mut sources = vec![ImageSource {
                        url: media,
                        width: width.map(|w| w as u32),
                        height: height.map(|h| h as u32),
                    }];
                    if !thumb.is_empty() {
                        sources.push(ImageSource {
                            url: thumb,
                            width: thumb_width.map(|w| w as u32),
                            height: thumb_height.map(|h| h as u32),
                        });
                    }
                    response.image.push(ImageResult {
                        title,
                        url: page_url,
                        source: sources,
                    });
                }
            }
        }

        let last_page = json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("lastPage"))
            .and_then(|v| v.as_bool())
            .unwrap_or(true);

        if !last_page {
            let offset: u64 = params
                .get("offset")
                .and_then(|o| o.parse().ok())
                .unwrap_or(0);
            params.insert("offset".to_string(), (offset + 125).to_string());
            response.npt = Some(serde_json::to_string(&params).unwrap_or_default());
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        if query.q.is_empty() {
            return Err(AppError::BadRequest("Search term is empty".into()));
        }

        let mut params = HashMap::new();
        params.insert("t".to_string(), "videos".to_string());
        params.insert("q".to_string(), query.q.clone());
        params.insert("count".to_string(), "50".to_string());
        params.insert("locale".to_string(), Self::get_country(query));
        params.insert("offset".to_string(), "0".to_string());
        params.insert("device".to_string(), "desktop".to_string());
        params.insert("tgp".to_string(), "3".to_string());
        params.insert(
            "safesearch".to_string(),
            Self::nsfw_level(&query.nsfw).to_string(),
        );

        let json = self
            .get_json("https://api.qwant.com/v3/search/videos", &params)
            .await?;

        let mut response = VideoResponse::empty();

        if json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|i| i.get("mainline"))
            .is_some()
        {
            return Err(AppError::ScraperError(
                "Qwant returned gibberish results".into(),
            ));
        }

        let items = json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|i| i.as_array());

        if let Some(videos) = items {
            for video in videos {
                let title = video
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let mut raw_url = video
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if let Some(idx) = raw_url.find("?syndication=") {
                    raw_url.truncate(idx);
                }

                let desc = video
                    .get("desc")
                    .and_then(|v| v.as_str())
                    .map(|s| Self::limit_strlen(s, 300))
                    .filter(|s| !s.is_empty());
                let date = video.get("date").and_then(|v| v.as_i64());
                let duration = video.get("duration").and_then(|v| v.as_i64());
                let channel = video
                    .get("channel")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(String::from);
                let thumb = video
                    .get("thumbnail")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(String::from);

                response.video.push(VideoResult {
                    title,
                    url: raw_url,
                    views: None,
                    duration: duration.filter(|&d| d != 0),
                    date,
                    description: desc,
                    source: Some("qwant".into()),
                    author: channel,
                    thumb,
                });
            }
        }

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        if query.q.is_empty() {
            return Err(AppError::BadRequest("Search term is empty".into()));
        }

        let mut params = HashMap::new();
        params.insert("t".to_string(), "news".to_string());
        params.insert("q".to_string(), query.q.clone());
        params.insert("count".to_string(), "50".to_string());
        params.insert("locale".to_string(), Self::get_country(query));
        params.insert("offset".to_string(), "0".to_string());
        params.insert("device".to_string(), "desktop".to_string());
        params.insert("tgp".to_string(), "3".to_string());
        params.insert(
            "safesearch".to_string(),
            Self::nsfw_level(&query.nsfw).to_string(),
        );

        let json = self
            .get_json("https://api.qwant.com/v3/search/news", &params)
            .await?;

        let mut response = NewsResponse::empty();

        if json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|i| i.get("mainline"))
            .is_some()
        {
            return Err(AppError::ScraperError(
                "Qwant returned gibberish results".into(),
            ));
        }

        let items = json
            .get("data")
            .and_then(|d| d.get("result"))
            .and_then(|r| r.get("items"))
            .and_then(|i| i.as_array());

        if let Some(news_items) = items {
            for news in news_items {
                let title = news
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let author = news
                    .get("press_name")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(String::from);
                let description = Self::trimdots(
                    news.get("desc").and_then(|v| v.as_str()).unwrap_or(""),
                );
                let date = news.get("date").and_then(|v| v.as_i64());
                let url = news
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();

                let thumb = news
                    .get("media")
                    .and_then(|m| m.get(0))
                    .and_then(|m| m.get("pict_big"))
                    .and_then(|p| p.get("url"))
                    .and_then(|u| u.as_str())
                    .filter(|s| !s.is_empty())
                    .map(String::from);

                response.news.push(NewsResult {
                    title,
                    url,
                    description,
                    date,
                    source: author,
                    thumb,
                });
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
            .header("Accept", "application/json, text/plain, */*")
            .header("Origin", "https://www.qwant.com")
            .header("Referer", "https://www.qwant.com/")
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
