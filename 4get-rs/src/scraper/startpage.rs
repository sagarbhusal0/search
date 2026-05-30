use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use regex::Regex;
use std::collections::HashMap;

pub struct Startpage {
    http: HttpClient,
}

impl Startpage {
    pub fn new(http: HttpClient) -> Self {
        Startpage { http }
    }

    const PREFERENCES_COOKIE: &'static str = "preferences=date_timeEEEworldN1Ndisable_family_filterEEE1N1Ndisable_open_in_new_windowEEE0N1Nenable_post_methodEEE1N1Nenable_proxy_safety_suggestEEE0N1Nenable_stay_controlEEE0N1Ninstant_answersEEE1N1Nlang_homepageEEEs%2Fdevice%2FenN1NlanguageEEEenglishN1Nlanguage_uiEEEenglishN1Nnum_of_resultsEEE20N1Nsearch_results_regionEEEallN1NsuggestionsEEE1N1Nwt_unitEEEcelsius";

    const BASE_URL: &'static str = "https://www.startpage.com/sp/search";

    fn get_country(query: &SearchQuery) -> String {
        query
            .filters
            .get("f_country")
            .cloned()
            .unwrap_or_else(|| "any".to_string())
    }

    fn get_time(query: &SearchQuery) -> String {
        query
            .filters
            .get("f_time")
            .cloned()
            .unwrap_or_else(|| "any".to_string())
    }

    fn strip_html(s: &str) -> String {
        let re = Regex::new(r"<[^>]+>").unwrap();
        re.replace_all(s, "").trim().to_string()
    }

    fn titledots(s: &str) -> String {
        s.trim_matches(|c: char| {
            c == '.'
                || c == ' '
                || c == '\t'
                || c == '\n'
                || c == '\r'
                || c == '\x0B'
                || c == '\x0C'
                || c == '\u{2026}'
        })
        .trim()
        .to_string()
    }

    fn remove_penguins(s: &str) -> String {
        s.replace('\u{e000}', "")
            .replace('\u{e001}', "")
    }

    fn limit_strlen(text: &str) -> String {
        let cleaned = text
            .replace("\r\n", " ")
            .replace("\n\r", " ")
            .replace('\n', " ")
            .replace('\r', " ");
        let wrapped = wordwrap(&cleaned, 300);
        if let Some(first_line) = wrapped.split('\n').next() {
            first_line.to_string()
        } else {
            cleaned
        }
    }

    fn hms2int(time: &str) -> Option<i64> {
        let parts: Vec<&str> = time.split(':').collect();
        let mut secs: i64 = 0;

        if parts.len() == 3 {
            secs += parts[0].parse::<i64>().unwrap_or(0) * 3600;
            secs += parts[1].parse::<i64>().unwrap_or(0) * 60;
            secs += parts[2].parse::<i64>().unwrap_or(0);
        } else if parts.len() == 2 {
            secs += parts[0].parse::<i64>().unwrap_or(0) * 60;
            secs += parts[1].parse::<i64>().unwrap_or(0);
        } else if parts.len() == 1 {
            secs = parts[0].parse::<i64>().unwrap_or(0);
        }

        Some(secs)
    }

    fn extract_react_json(html: &str, component_name: &str) -> Result<serde_json::Value, AppError> {
        let pattern = format!(
            r"React\.createElement\(UIStartpage\.{}, ?(.+)\),?$",
            component_name
        );
        let re = Regex::new(&pattern)
            .map_err(|e| AppError::ScraperError(format!("Regex error: {}", e)))?;

        let caps = re
            .captures(html)
            .ok_or_else(|| AppError::ScraperError("Failed to grep React JSON".into()))?;

        let json_str = caps
            .get(1)
            .ok_or_else(|| AppError::ScraperError("Failed to extract JSON".into()))?
            .as_str();

        serde_json::from_str(json_str)
            .map_err(|e| AppError::ScraperError(format!("Failed to decode JSON: {}", e)))
    }

    fn detect_captcha(html: &str) -> Result<(), AppError> {
        let doc = scraper::Html::parse_document(html);
        let sel = scraper::Selector::parse("title")
            .map_err(|e| AppError::ScraperError(format!("Selector error: {}", e)))?;
        if let Some(title_el) = doc.select(&sel).next() {
            let title_text: String = title_el.text().collect();
            if title_text == "Redirecting..." {
                let a_sel = scraper::Selector::parse("a")
                    .map_err(|e| AppError::ScraperError(format!("Selector error: {}", e)))?;
                for a in doc.select(&a_sel) {
                    let text: String = a.text().collect();
                    if text.contains("https://www.startpage.com/sp/captcha") {
                        return Err(AppError::ScraperError(
                            "Startpage returned a captcha".into(),
                        ));
                    }
                }
                return Err(AppError::ScraperError(
                    "Startpage redirected to an unhandled page".into(),
                ));
            }
        }
        Ok(())
    }

    fn parse_npt(json: &serde_json::Value, page_type: &str) -> Option<HashMap<String, String>> {
        let pages = json
            .get("render")?
            .get("presenter")?
            .get("pagination")?
            .get("pages")?
            .as_array()?;

        for page in pages {
            if page.get("name").and_then(|v| v.as_str()) == Some("Next") {
                let url = page.get("url").and_then(|v| v.as_str())?;
                let query_str = url.splitn(2, '?').nth(1)?;
                let params: HashMap<String, String> =
                    url::form_urlencoded::parse(query_str.as_bytes())
                        .map(|(k, v)| (k.to_string(), v.to_string()))
                        .collect();

                let mut post_params = HashMap::new();
                post_params.insert("lui".to_string(), "english".to_string());
                post_params.insert("language".to_string(), "english".to_string());
                post_params.insert(
                    "sc".to_string(),
                    params.get("sc").cloned().unwrap_or_default(),
                );
                post_params.insert("t".to_string(), "device".to_string());
                post_params.insert("cat".to_string(), page_type.to_string());
                post_params.insert("segment".to_string(), "startpage.udog".to_string());
                post_params.insert("abd".to_string(), "0".to_string());
                post_params.insert("abe".to_string(), "0".to_string());
                post_params.insert(
                    "query".to_string(),
                    params.get("q").cloned().unwrap_or_default(),
                );
                post_params.insert(
                    "page".to_string(),
                    params.get("page").cloned().unwrap_or_default(),
                );
                post_params.insert("qsr".to_string(), "all".to_string());
                post_params.insert("qadf".to_string(), "none".to_string());

                return Some(post_params);
            }
        }

        None
    }

    fn unshitimage(url: &str) -> String {
        if let Ok(parsed) = url::Url::parse(url) {
            let piurl: Option<String> = parsed
                .query_pairs()
                .find(|(k, _)| k == "piurl")
                .map(|(_, v)| v.to_string());

            if let Some(piurl) = piurl {
                if piurl.contains("gstatic.com/") || piurl.contains("bing.net/") || piurl.contains("bing.com/") {
                    return piurl.split('&').next().unwrap_or(&piurl).to_string();
                }
                return piurl;
            }
        }
        url.to_string()
    }

    fn parse_date_from_description(desc: &str) -> (String, Option<i64>) {
        let parts: Vec<&str> = desc.splitn(2, "...").collect();
        if parts.len() == 2 {
            let date_part = parts[0].trim();
            if date_part.len() <= 14 {
                let parsed = chrono::NaiveDateTime::parse_from_str(date_part, "%b %d, %Y %H:%M")
                    .or_else(|_| {
                        chrono::NaiveDate::parse_from_str(date_part, "%b %d, %Y")
                            .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
                    });
                match parsed {
                    Ok(dt) => return (parts[1].trim().to_string(), Some(dt.and_utc().timestamp())),
                    Err(_) => {}
                }
            }
        }
        (desc.to_string(), None)
    }

    async fn fetch_get(
        &self,
        url: &str,
        params: &HashMap<String, String>,
    ) -> Result<String, AppError> {
        let (client, _label) = self.http.get_or_raw_client(Some("startpage"));
        let resp = client
            .get(url)
            .query(params)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("User-Agent", self.http.random_ua())
            .header("Cookie", Self::PREFERENCES_COOKIE)
            .header("Sec-Fetch-Dest", "document")
            .header("Sec-Fetch-Mode", "navigate")
            .header("Sec-Fetch-Site", "none")
            .header("Sec-Fetch-User", "?1")
            .header("Priority", "u=0, i")
            .header("TE", "trailers")
            .send()
            .await?
            .text()
            .await?;
        Ok(resp)
    }

    async fn fetch_post(
        &self,
        url: &str,
        form: &HashMap<String, String>,
    ) -> Result<String, AppError> {
        let (client, _label) = self.http.get_or_raw_client(Some("startpage"));
        let resp = client
            .post(url)
            .form(form)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("User-Agent", self.http.random_ua())
            .header("Cookie", Self::PREFERENCES_COOKIE)
            .header("Referer", "https://www.startpage.com/")
            .header("Origin", "https://www.startpage.com/")
            .header("Upgrade-Insecure-Requests", "1")
            .header("Sec-Fetch-Dest", "document")
            .header("Sec-Fetch-Mode", "navigate")
            .header("Sec-Fetch-Site", "none")
            .header("Sec-Fetch-User", "?1")
            .header("Priority", "u=0, i")
            .header("TE", "trailers")
            .send()
            .await?
            .text()
            .await?;
        Ok(resp)
    }

    fn get_mainline(json: &serde_json::Value) -> Option<&Vec<serde_json::Value>> {
        json.get("render")
            .and_then(|r| r.get("presenter"))
            .and_then(|p| p.get("regions"))
            .and_then(|r| r.get("mainline"))
            .and_then(|m| m.as_array())
    }
}

#[async_trait]
impl Scraper for Startpage {
    fn name(&self) -> &str {
        "startpage"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let html = if let Some(npt) = &query.npt {
            let post_params: HashMap<String, String> = serde_json::from_str(npt)
                .map_err(|_| AppError::ScraperError("Invalid NPT data".into()))?;
            self.fetch_post(Self::BASE_URL, &post_params).await?
        } else {
            let mut params = HashMap::new();
            params.insert("query".to_string(), query.q.clone());
            params.insert("cat".to_string(), "web".to_string());
            params.insert("pl".to_string(), "opensearch".to_string());

            if matches!(query.nsfw, NsfwLevel::No) {
                params.insert("qadf".to_string(), "heavy".to_string());
            }

            let country = Self::get_country(query);
            if country != "any" {
                params.insert("qsr".to_string(), country);
            }

            let time = Self::get_time(query);
            if time != "any" {
                params.insert("with_date".to_string(), time);
            }

            self.fetch_get(Self::BASE_URL, &params).await?
        };

        Self::detect_captcha(&html)?;

        if html.contains("captcha-block") || html.contains("Redirecting...") {
            return Err(AppError::ScraperError(
                "Startpage blocked this request (captcha). Add proxies to data/proxies/startpage.txt".into(),
            ));
        }

        if html.contains("theme--device") && !html.contains("AppSerpWeb") && !html.contains("React.createElement") {
            return Err(AppError::ScraperError(
                "Startpage returned a client-side only page (no search results in HTML). Add proxies to data/proxies/startpage.txt".into(),
            ));
        }

        let json = match Self::extract_react_json(&html, "AppSerpWeb") {
            Ok(j) => j,
            Err(_) => {
                return Err(AppError::ScraperError(
                    "Failed to extract Startpage results. The page may have changed or blocked this request. Add proxies to data/proxies/startpage.txt".into(),
                ));
            }
        };

        let mut response = WebResponse::empty();

        response.npt = Self::parse_npt(&json, "web")
            .and_then(|p| serde_json::to_string(&p).ok());

        if let Some(categories) = Self::get_mainline(&json) {
            for category in categories {
                let display_type = category
                    .get("display_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                match display_type {
                    "web-google" => {
                        if let Some(results) =
                            category.get("results").and_then(|r| r.as_array())
                        {
                            for result in results {
                                let title = Self::titledots(&Self::strip_html(
                                    result
                                        .get("title")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or(""),
                                ));
                                let url = result
                                    .get("clickUrl")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();

                                let desc_raw = Self::strip_html(
                                    result
                                        .get("description")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or(""),
                                );
                                let desc_cleaned = Self::titledots(&desc_raw);
                                let (description, date) =
                                    Self::parse_date_from_description(&desc_cleaned);

                                let mut sublinks = Vec::new();
                                if let Some(sitelinks) =
                                    result.get("siteLinks").and_then(|s| s.as_array())
                                {
                                    for link in sitelinks {
                                        sublinks.push(DescNode {
                                            node_type: "text".to_string(),
                                            value: Some(format!(
                                                "{}: {}",
                                                link.get("title")
                                                    .and_then(|v| v.as_str())
                                                    .unwrap_or(""),
                                                link.get("clickUrl")
                                                    .and_then(|v| v.as_str())
                                                    .unwrap_or("")
                                            )),
                                            url: link
                                                .get("clickUrl")
                                                .and_then(|v| v.as_str())
                                                .map(String::from),
                                        });
                                    }
                                }

                                response.web.push(WebResult {
                                    title,
                                    url,
                                    description,
                                    date,
                                    source: Some("startpage".into()),
                                });
                            }
                        }
                    }
                    "spellsuggest-google" => {
                        if let Some(results) =
                            category.get("results").and_then(|r| r.as_array())
                        {
                            if let Some(first) = results.first() {
                                if let Some(suggestion) =
                                    first.get("query").and_then(|v| v.as_str())
                                {
                                    response.spelling = SpellCorrection {
                                        correction_type: "including".to_string(),
                                        using: json
                                            .get("render")
                                            .and_then(|r| r.get("query"))
                                            .and_then(|q| q.as_str())
                                            .unwrap_or("")
                                            .to_string(),
                                        correction: urlencoding(suggestion),
                                    };
                                }
                            }
                        }
                    }
                    "dictionary-qi" => {
                        if let Some(results) =
                            category.get("results").and_then(|r| r.as_array())
                        {
                            for result in results {
                                let word = result
                                    .get("word")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();

                                let mut desc_nodes: Vec<DescNode> = Vec::new();

                                if let Some(lexical_categories) =
                                    result.get("lexical_categories")
                                {
                                    if let Some(obj) = lexical_categories.as_object() {
                                        for (lexic_type, definitions) in obj {
                                            desc_nodes.push(DescNode {
                                                node_type: "title".to_string(),
                                                value: Some(lexic_type.clone()),
                                                url: None,
                                            });

                                            let mut i = 0;
                                            if let Some(defs) = definitions.as_array() {
                                                for def in defs {
                                                    let text_definition = def
                                                        .get("definition")
                                                        .and_then(|v| v.as_str())
                                                        .unwrap_or("")
                                                        .trim();
                                                    let text_example = def
                                                        .get("example")
                                                        .and_then(|v| v.as_str())
                                                        .unwrap_or("")
                                                        .trim();
                                                    let text_synonyms: Vec<&str> = def
                                                        .get("synonyms")
                                                        .and_then(|v| v.as_array())
                                                        .and_then(|arr| {
                                                            arr.iter()
                                                                .map(|v| v.as_str().unwrap_or(""))
                                                                .collect::<Vec<&str>>()
                                                                .into()
                                                        })
                                                        .unwrap_or_default();
                                                    let synonyms_str = text_synonyms.join(", ");

                                                    if !text_definition.is_empty() {
                                                        i += 1;
                                                        let entry =
                                                            format!("{}. {}", i, text_definition);

                                                        if let Some(last) = desc_nodes.last_mut() {
                                                            if last.node_type == "text" {
                                                                if let Some(ref mut val) = last.value {
                                                                    val.push_str("\n\n");
                                                                    val.push_str(&entry);
                                                                }
                                                            } else {
                                                                desc_nodes.push(DescNode {
                                                                    node_type: "text".to_string(),
                                                                    value: Some(entry),
                                                                    url: None,
                                                                });
                                                            }
                                                        } else {
                                                            desc_nodes.push(DescNode {
                                                                node_type: "text".to_string(),
                                                                value: Some(entry),
                                                                url: None,
                                                            });
                                                        }
                                                    }

                                                    if !text_example.is_empty() {
                                                        desc_nodes.push(DescNode {
                                                            node_type: "quote".to_string(),
                                                            value: Some(text_example.to_string()),
                                                            url: None,
                                                        });
                                                    }

                                                    if !synonyms_str.is_empty() {
                                                        desc_nodes.push(DescNode {
                                                            node_type: "text".to_string(),
                                                            value: Some(format!(
                                                                "Synonyms: {}",
                                                                synonyms_str
                                                            )),
                                                            url: None,
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                response.answer.push(AnswerResult {
                                    title: Some(word),
                                    url: None,
                                    thumb: None,
                                    description: desc_nodes,
                                    table: HashMap::new(),
                                    sublink: HashMap::new(),
                                });
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        Ok(response)
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let html = if let Some(npt) = &query.npt {
            let post_params: HashMap<String, String> = serde_json::from_str(npt)
                .map_err(|_| AppError::ScraperError("Invalid NPT data".into()))?;
            self.fetch_post(Self::BASE_URL, &post_params).await?
        } else {
            let mut params = HashMap::new();
            params.insert("query".to_string(), query.q.clone());
            params.insert("cat".to_string(), "images".to_string());
            params.insert("pl".to_string(), "opensearch".to_string());

            if matches!(query.nsfw, NsfwLevel::No) {
                params.insert("qadf".to_string(), "heavy".to_string());
            }

            if let Some(size) = query.filters.get("f_size") {
                if size != "any" {
                    if matches!(
                        size.as_str(),
                        "Small" | "Medium" | "Large" | "Wallpaper"
                    ) {
                        params.insert("flimgsize".to_string(), size.clone());
                    } else {
                        params.insert(
                            "image-size-select".to_string(),
                            format!("isz:lt,islt:{}", size),
                        );
                    }
                }
            }

            if let Some(color) = query.filters.get("f_color") {
                if color != "any" {
                    let val = if color == "color" {
                        "ic:color".to_string()
                    } else if color == "bnw" {
                        "ic:gray".to_string()
                    } else {
                        format!("ic:specific,isc:{}", color)
                    };
                    params.insert("flimgcolor".to_string(), val);
                }
            }

            if let Some(img_type) = query.filters.get("f_type") {
                if img_type != "any" {
                    params.insert("flimgtype".to_string(), img_type.clone());
                }
            }

            if let Some(license) = query.filters.get("f_license") {
                if license != "any" {
                    params.insert("flimglicense".to_string(), license.clone());
                }
            }

            self.fetch_get(Self::BASE_URL, &params).await?
        };

        Self::detect_captcha(&html)?;

        let json = Self::extract_react_json(&html, "AppSerpImages")?;

        let mut response = ImageResponse::empty();

        response.npt = Self::parse_npt(&json, "images")
            .and_then(|p| serde_json::to_string(&p).ok());

        if let Some(categories) = Self::get_mainline(&json) {
            for category in categories {
                let display_type = category
                    .get("display_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                if display_type != "images-bing" {
                    continue;
                }

                if let Some(results) = category.get("results").and_then(|r| r.as_array()) {
                    for image in results {
                        let title = Self::titledots(
                            image
                                .get("title")
                                .and_then(|v| v.as_str())
                                .unwrap_or(""),
                        );

                        let full_url = Self::unshitimage(
                            image
                                .get("clickUrl")
                                .and_then(|v| v.as_str())
                                .unwrap_or(""),
                        );
                        let width = image
                            .get("width")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse::<u32>().ok());
                        let height = image
                            .get("height")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse::<u32>().ok());

                        let thumb_url = Self::unshitimage(
                            image
                                .get("thumbnailUrl")
                                .and_then(|v| v.as_str())
                                .unwrap_or(""),
                        );
                        let thumb_width = image
                            .get("thumbnailWidth")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse::<u32>().ok());
                        let thumb_height = image
                            .get("thumbnailHeight")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse::<u32>().ok());

                        let alt_url = image
                            .get("altClickUrl")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        let mut sources = vec![ImageSource {
                            url: full_url,
                            width,
                            height,
                        }];
                        if !thumb_url.is_empty() {
                            sources.push(ImageSource {
                                url: thumb_url,
                                width: thumb_width,
                                height: thumb_height,
                            });
                        }

                        response.image.push(ImageResult {
                            title,
                            url: alt_url,
                            source: sources,
                        });
                    }
                }
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let html = if let Some(npt) = &query.npt {
            let post_params: HashMap<String, String> = serde_json::from_str(npt)
                .map_err(|_| AppError::ScraperError("Invalid NPT data".into()))?;
            self.fetch_post(Self::BASE_URL, &post_params).await?
        } else {
            let mut params = HashMap::new();
            params.insert("query".to_string(), query.q.clone());
            params.insert("cat".to_string(), "video".to_string());
            params.insert("pl".to_string(), "opensearch".to_string());

            if matches!(query.nsfw, NsfwLevel::No) {
                params.insert("qadf".to_string(), "heavy".to_string());
            }

            if let Some(sort) = query.filters.get("f_sort") {
                if sort != "relevance" {
                    params.insert("sort_by".to_string(), sort.clone());
                }
            }

            if let Some(duration) = query.filters.get("f_duration") {
                if duration != "any" {
                    params.insert("with_duration".to_string(), duration.clone());
                }
            }

            self.fetch_get(Self::BASE_URL, &params).await?
        };

        Self::detect_captcha(&html)?;

        let json = Self::extract_react_json(&html, "AppSerpVideos")?;

        let mut response = VideoResponse::empty();

        response.npt = Self::parse_npt(&json, "video")
            .and_then(|p| serde_json::to_string(&p).ok());

        if let Some(categories) = Self::get_mainline(&json) {
            for category in categories {
                let display_type = category
                    .get("display_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                if !display_type.starts_with("video-") {
                    continue;
                }

                let is_youtube = display_type == "video-youtube";

                if let Some(results) = category.get("results").and_then(|r| r.as_array()) {
                    for video in results {
                        let title = Self::remove_penguins(
                            video
                                .get("title")
                                .and_then(|v| v.as_str())
                                .unwrap_or(""),
                        );
                        let url = video
                            .get("clickUrl")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let description = video
                            .get("description")
                            .and_then(|v| v.as_str())
                            .map(|s| Self::limit_strlen(s))
                            .filter(|s| !s.is_empty());
                        let channel = video
                            .get("channelTitle")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(String::from);
                        let date = video
                            .get("publishDate")
                            .and_then(|v| v.as_str())
                            .and_then(|d| {
                                chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d")
                                    .ok()
                                    .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc().timestamp())
                            });
                        let views = video
                            .get("viewCount")
                            .and_then(|v| v.as_str())
                            .and_then(|s| s.parse::<i64>().ok());

                        let thumb_url = video
                            .get("thumbnailUrl")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(|s| Self::unshitimage(s));

                        let duration_secs = video.get("duration").and_then(|v| v.as_str()).map(
                            |d| {
                                if is_youtube {
                                    Self::hms2int(d)
                                        .unwrap_or(0)
                                } else {
                                    let ms: i64 = d.parse().unwrap_or(0);
                                    ms / 1000
                                }
                            },
                        );

                        response.video.push(VideoResult {
                            title,
                            url,
                            views,
                            duration: duration_secs,
                            date,
                            description,
                            source: Some("startpage".into()),
                            author: channel,
                            thumb: thumb_url,
                        });
                    }
                }
            }
        }

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        let html = if let Some(npt) = &query.npt {
            let post_params: HashMap<String, String> = serde_json::from_str(npt)
                .map_err(|_| AppError::ScraperError("Invalid NPT data".into()))?;
            self.fetch_post(Self::BASE_URL, &post_params).await?
        } else {
            let mut params = HashMap::new();
            params.insert("query".to_string(), query.q.clone());
            params.insert("cat".to_string(), "news".to_string());
            params.insert("pl".to_string(), "opensearch".to_string());

            if matches!(query.nsfw, NsfwLevel::No) {
                params.insert("qadf".to_string(), "heavy".to_string());
            }

            let time = Self::get_time(query);
            if time != "any" {
                params.insert("with_date".to_string(), time);
            }

            self.fetch_get(Self::BASE_URL, &params).await?
        };

        Self::detect_captcha(&html)?;

        let json = Self::extract_react_json(&html, "AppSerpNews")?;

        let mut response = NewsResponse::empty();

        response.npt = Self::parse_npt(&json, "news")
            .and_then(|p| serde_json::to_string(&p).ok());

        if let Some(categories) = Self::get_mainline(&json) {
            for category in categories {
                let display_type = category
                    .get("display_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                if display_type != "news-bing" {
                    continue;
                }

                if let Some(results) = category.get("results").and_then(|r| r.as_array()) {
                    for news in results {
                        let title = Self::titledots(
                            &Self::remove_penguins(
                                news.get("title")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or(""),
                            ),
                        );
                        let url = news
                            .get("clickUrl")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let description = Self::titledots(
                            &Self::remove_penguins(
                                news
                                    .get("description")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or(""),
                            ),
                        );
                        let source = news
                            .get("source")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(String::from);

                        let date = news.get("date").and_then(|v| {
                            if let Some(s) = v.as_str() {
                                s.parse::<i64>().ok().map(|d| d / 1000)
                            } else {
                                v.as_i64().map(|d| d / 1000)
                            }
                        });

                        let thumb_url = news
                            .get("thumbnailUrl")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(|s| Self::unshitimage(s));

                        response.news.push(NewsResult {
                            title,
                            url,
                            description,
                            date,
                            source,
                            thumb: thumb_url,
                        });
                    }
                }
            }
        }

        Ok(response)
    }
}

fn urlencoding(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}

fn wordwrap(s: &str, width: usize) -> String {
    let mut result = String::new();
    let mut current_line_len = 0;

    for word in s.split_whitespace() {
        if current_line_len + word.len() + 1 > width && current_line_len > 0 {
            result.push('\n');
            current_line_len = 0;
        }
        if current_line_len > 0 {
            result.push(' ');
            current_line_len += 1;
        }
        result.push_str(word);
        current_line_len += word.len();
    }

    result
}
