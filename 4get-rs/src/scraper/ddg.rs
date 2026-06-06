use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use regex::Regex;
use scraper::{Html, Selector};

pub struct DDG {
    http: HttpClient,
}

impl DDG {
    pub fn new(http: HttpClient) -> Self {
        DDG { http }
    }

    fn unshiturl(url: &str) -> String {
        let normalized = if url.starts_with("//") {
            format!("https:{}", url)
        } else {
            url.to_string()
        };
        if let Ok(parsed) = url::Url::parse(&normalized) {
            if parsed.host_str() == Some("duckduckgo.com") {
                for (key, val) in parsed.query_pairs() {
                    if key == "uddg" {
                        return val.to_string();
                    }
                }
            }
        }
        normalized
    }

    fn strip_html(s: &str) -> String {
        let re = Regex::new(r"<[^>]+>").unwrap();
        let no_tags = re.replace_all(s, "");
        let decoded = no_tags
            .replace("&quot;", "\"")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&#39;", "'")
            .replace("&apos;", "'");
        decoded.trim().to_string()
    }

    fn extract_json(s: &str) -> Option<String> {
        let bytes = s.as_bytes();
        let mut depth: i32 = 0;
        let mut start: Option<usize> = None;
        let mut in_string = false;
        let mut escaped = false;
        for (i, &b) in bytes.iter().enumerate() {
            if in_string {
                if escaped {
                    escaped = false;
                } else if b == b'\\' {
                    escaped = true;
                } else if b == b'"' {
                    in_string = false;
                }
                continue;
            }
            match b {
                b'{' | b'[' => {
                    if start.is_none() {
                        start = Some(i);
                    }
                    depth += 1;
                }
                b'}' | b']' => {
                    depth -= 1;
                    if depth == 0 {
                        if let Some(si) = start {
                            return Some(s[si..=i].to_string());
                        }
                    }
                }
                b'"' => {
                    if start.is_some() {
                        in_string = true;
                    }
                }
                _ => {}
            }
        }
        None
    }

    fn vqd(html: &str) -> Option<String> {
        let re = Regex::new(r#"vqd="([0-9-]+)""#).ok()?;
        re.captures(html)
            .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
    }

    fn solve_jsa_challenge(js: &str) -> i64 {
        let re_jsa = Regex::new(r"let jsa *= *([0-9]+)").unwrap();
        let mut jsa: i64 = re_jsa
            .captures(js)
            .and_then(|c| c.get(1))
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);

        let re_func = Regex::new(r"let ([A-Za-z0-9]+) *= *function\(.*\) *\{(.*)\};").unwrap();
        let mut functions: std::collections::HashMap<String, (String, String)> =
            std::collections::HashMap::new();

        for cap in re_func.captures_iter(js) {
            let name = cap.get(1).unwrap().as_str().to_string();
            let body = cap.get(2).unwrap().as_str().trim().to_string();

            if let Some(mul) = Regex::new(r"return num *\* *([0-9]+)")
                .unwrap()
                .captures(&body)
                .and_then(|c| c.get(1))
                .and_then(|m| m.as_str().parse::<i64>().ok())
            {
                functions.insert(name, ("multiplication".to_string(), mul.to_string()));
                continue;
            }

            if let Some(chal) = Regex::new(r"innerHTML *= *`([^`]+)`")
                .unwrap()
                .captures(&body)
                .and_then(|c| c.get(1))
            {
                let text = chal.as_str().replace("</br>", "<br>");
                functions.insert(name, ("challenge".to_string(), text));
            }
        }

        let re_call = Regex::new(r"jsa *= *([A-Za-z0-9]+)\(jsa\)").unwrap();
        for cap in re_call.captures_iter(js) {
            let fname = cap.get(1).unwrap().as_str();
            if let Some((ftype, fval)) = functions.get(fname) {
                match ftype.as_str() {
                    "multiplication" => {
                        if let Some(num) = fval.parse::<i64>().ok() {
                            jsa = jsa * num;
                        }
                    }
                    "challenge" => {
                        jsa = jsa + fval.len() as i64;
                    }
                    _ => {}
                }
            }
        }

        jsa
    }

    async fn web_html(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let kp = match query.nsfw {
            NsfwLevel::Yes => "-2",
            NsfwLevel::Maybe => "-1",
            NsfwLevel::No => "1",
        };

        let (html, _use_html_post) = if let Some(npt) = &query.npt {
            let parts: Vec<&str> = npt.splitn(2, ',').collect();
            if parts.len() == 2 && parts[0] == "0" {
                let npt_params: std::collections::HashMap<String, String> =
                    serde_json::from_str(parts[1])
                        .map_err(|_| AppError::ScraperError("Invalid NPT params".into()))?;
                let resp = self
                    .http
                    .client
                    .post("https://html.duckduckgo.com/html/")
                    .form(&npt_params)
                    .header(
                        "Accept",
                        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    )
                    .header("Accept-Language", "en-US,en;q=0.5")
                    .send()
                    .await?
                    .text()
                    .await?;
                (resp, false)
            } else {
                return Err(AppError::ScraperError(
                    "NPT is not for HTML mode".into(),
                ));
            }
        } else {
            let resp = self
                .http
                .client
                .get("https://html.duckduckgo.com/html/")
                .query(&[("q", query.q.as_str()), ("kl", "wt-wt"), ("kp", kp)])
                .header(
                    "Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                )
                .header("Accept-Language", "en-US,en;q=0.5")
                .header("User-Agent", self.http.random_ua())
                .header("DNT", "1")
                .header("Sec-GPC", "1")
                .header("Connection", "keep-alive")
                .header("Upgrade-Insecure-Requests", "1")
                .header("Sec-Fetch-Dest", "document")
                .header("Sec-Fetch-Mode", "navigate")
                .header("Sec-Fetch-Site", "same-origin")
                .header("Sec-Fetch-User", "?1")
                .send()
                .await?
                .text()
                .await?;
            (resp, true)
        };

        let mut response = WebResponse::empty();
        let doc = Html::parse_document(&html);

        if html.contains("anomaly-modal") || html.contains("anomaly.js") {
            return Err(AppError::ScraperError(
                "DDG blocked this request (anti-bot captcha). Try a different scraper or add DDG proxies.".into(),
            ));
        }

        let form_sel = Selector::parse("form").unwrap();
        let btn_alt_sel = Selector::parse("input.btn--alt").unwrap();
        let hidden_sel = Selector::parse("input[type=\"hidden\"]").unwrap();

        let forms: Vec<_> = doc.select(&form_sel).collect();
        for form in forms.into_iter().rev() {
            if form.select(&btn_alt_sel).next().is_some() {
                let mut form_data = std::collections::HashMap::new();
                for input in form.select(&hidden_sel) {
                    if let Some(name) = input.value().attr("name") {
                        if let Some(value) = input.value().attr("value") {
                            form_data.insert(name.to_string(), value.to_string());
                        }
                    }
                }
                if let Ok(json) = serde_json::to_string(&form_data) {
                    response.npt = Some(format!("0,{}", json));
                }
                break;
            }
        }

        let result_sel = Selector::parse("div.result").unwrap();
        let a_sel = Selector::parse("a.result__a").unwrap();
        let snippet_sel = Selector::parse("a.result__snippet").unwrap();

        for result in doc.select(&result_sel) {
            if let Some(class) = result.value().attr("class") {
                if class.contains("result--ad") {
                    continue;
                }
            }

            let title = result
                .select(&a_sel)
                .next()
                .map(|el| el.text().collect::<String>())
                .unwrap_or_default();

            if title.trim().is_empty() {
                continue;
            }

            let url = result
                .select(&a_sel)
                .next()
                .and_then(|el| el.value().attr("href"))
                .map(Self::unshiturl)
                .unwrap_or_default();

            let description = result
                .select(&snippet_sel)
                .next()
                .map(|el| Self::strip_html(&el.inner_html()))
                .unwrap_or_default();

            response.web.push(WebResult {
                title: title.trim().to_string(),
                url,
                description,
                date: None,
                source: Some("ddg".into()),
            });
        }

        Ok(response)
    }

    async fn web_full(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let kp = match query.nsfw {
            NsfwLevel::Yes => "-2",
            NsfwLevel::Maybe => "-1",
            NsfwLevel::No => "1",
        };

        let js_url = if let Some(npt) = &query.npt {
            let parts: Vec<&str> = npt.splitn(2, ',').collect();
            if parts.len() == 2 && parts[0] == "1" {
                format!("https://links.duckduckgo.com{}", parts[1])
            } else {
                return Err(AppError::ScraperError(
                    "NPT is not for full mode".into(),
                ));
            }
        } else {
            let html = self
                .http
                .client
                .get("https://duckduckgo.com/")
                .query(&[("q", query.q.as_str()), ("kl", "wt-wt"), ("kp", kp)])
                .header(
                    "Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                )
                .header("Accept-Language", "en-US,en;q=0.5")
                .header("User-Agent", self.http.random_ua())
                .header("DNT", "1")
                .header("Sec-GPC", "1")
                .header("Connection", "keep-alive")
                .header("Upgrade-Insecure-Requests", "1")
                .header("Sec-Fetch-Dest", "document")
                .header("Sec-Fetch-Mode", "navigate")
                .header("Sec-Fetch-Site", "same-origin")
                .header("Sec-Fetch-User", "?1")
                .send()
                .await?
                .text()
                .await?;

            let doc = Html::parse_document(&html);
            let link_sel = Selector::parse("link#deep_preload_link").unwrap();
            let href = doc
                .select(&link_sel)
                .next()
                .and_then(|el| el.value().attr("href"))
                .ok_or_else(|| AppError::ScraperError("Failed to find deep_preload_link".into()))?;

            if href.starts_with("http") {
                href.to_string()
            } else if href.starts_with("//") {
                format!("https:{}", href)
            } else {
                format!("https://links.duckduckgo.com{}", href)
            }
        };

        let mut js = self
            .http
            .client
            .get(&js_url)
            .header("Accept", "*/*")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("Referer", "https://duckduckgo.com/")
            .header("User-Agent", self.http.random_ua())
            .header("DNT", "1")
            .header("Sec-GPC", "1")
            .header("Connection", "keep-alive")
            .header("Sec-Fetch-Dest", "script")
            .header("Sec-Fetch-Mode", "no-cors")
            .header("Sec-Fetch-Site", "same-site")
            .send()
            .await?
            .text()
            .await?;

        let mut response = WebResponse::empty();

        let re_layout = Regex::new(r#"DDG\.pageLayout\.load\(\s*'d'\s*,\s*"#).unwrap();
        let parts: Vec<&str> = re_layout.splitn(&js, 2).collect();
        if parts.len() <= 1 {
            // Detect JS challenge (DDG.deep.initialize)
            let re_challenge = Regex::new(r"DDG\.deep\.initialize\('([^']+)' *\+ *jsa").unwrap();
            if let Some(caps) = re_challenge.captures(&js) {
                let challenge_path = caps.get(1).unwrap().as_str();
                let jsa = Self::solve_jsa_challenge(&js);
                let challenged_url = format!(
                    "https://links.duckduckgo.com{}{}",
                    challenge_path, jsa
                );
                js = self
                    .http
                    .client
                    .get(&challenged_url)
                    .header("Accept", "*/*")
                    .header("Accept-Language", "en-US,en;q=0.5")
                    .header("Referer", "https://duckduckgo.com/")
                    .header("User-Agent", self.http.random_ua())
                    .header("DNT", "1")
                    .header("Sec-GPC", "1")
                    .header("Connection", "keep-alive")
                    .header("Sec-Fetch-Dest", "script")
                    .header("Sec-Fetch-Mode", "no-cors")
                    .header("Sec-Fetch-Site", "same-site")
                    .send()
                    .await?
                    .text()
                    .await?;

                let parts2: Vec<&str> = re_layout.splitn(&js, 2).collect();
                if parts2.len() <= 1 {
                    if js.contains("anomalyDetectionBlock") {
                        return Err(AppError::ScraperError(
                            "DDG blocked this request (anti-bot). Try a different scraper or add DDG proxies.".into(),
                        ));
                    }
                    return Err(AppError::ScraperError(
                        "Failed to parse pageLayout(d) from challenged d.js".into(),
                    ));
                }
                // Use the challenged response
                let json_str = Self::extract_json(parts2[1])
                    .ok_or_else(|| AppError::ScraperError("Failed to extract JSON from challenged d.js".into()))?;
                let json: Vec<serde_json::Value> = serde_json::from_str(&json_str)?;

                for item in &json {
                    if let Some(obj) = item.as_object() {
                        if let Some(n) = obj.get("n").and_then(|v| v.as_str()) {
                            if !n.is_empty() {
                                response.npt = Some(format!("1,{}", n));
                            }
                            continue;
                        }
                        if obj.contains_key("c") {
                            if let Some(t) = obj.get("t").and_then(|v| v.as_str()) {
                                if t == "DEEP_ERROR_NO_RESULTS" || t == "DEEP_SIMPLE_NO_RESULTS" {
                                    if !obj.contains_key("s") { continue; }
                                }
                            }
                            let title = Self::strip_html(obj.get("t").and_then(|v| v.as_str()).unwrap_or(""));
                            let raw_url = obj.get("c").and_then(|v| v.as_str()).unwrap_or("");
                            let url = Self::unshiturl(raw_url);
                            let desc = Self::strip_html(obj.get("a").and_then(|v| v.as_str()).unwrap_or(""));
                            response.web.push(WebResult {
                                title, url, description: desc, date: None, source: Some("ddg".into()),
                            });
                        }
                    }
                }
                return Ok(response);
            }

            if js.contains("anomalyDetectionBlock") {
                return Err(AppError::ScraperError(
                    "DDG blocked this request (anti-bot). Try a different scraper or add DDG proxies.".into(),
                ));
            }
            return Err(AppError::ScraperError(
                "Failed to parse pageLayout(d) from d.js".into(),
            ));
        }

        let json_str = Self::extract_json(parts[1])
            .ok_or_else(|| AppError::ScraperError("Failed to extract JSON from d.js".into()))?;
        let json: Vec<serde_json::Value> = serde_json::from_str(&json_str)?;

        for item in &json {
            if let Some(obj) = item.as_object() {
                if let Some(n) = obj.get("n").and_then(|v| v.as_str()) {
                    if !n.is_empty() {
                        response.npt = Some(format!("1,{}", n));
                    }
                    continue;
                }

                if obj.contains_key("c") {
                    if let Some(t) = obj.get("t").and_then(|v| v.as_str()) {
                        if t == "DEEP_ERROR_NO_RESULTS" || t == "DEEP_SIMPLE_NO_RESULTS" {
                            if !obj.contains_key("s") {
                                continue;
                            }
                        }
                    }

                    let title = Self::strip_html(obj.get("t").and_then(|v| v.as_str()).unwrap_or(""));
                    let raw_url = obj.get("c").and_then(|v| v.as_str()).unwrap_or("");
                    let url = Self::unshiturl(raw_url);
                    let desc = Self::strip_html(obj.get("a").and_then(|v| v.as_str()).unwrap_or(""));

                    response.web.push(WebResult {
                        title,
                        url,
                        description: desc,
                        date: None,
                        source: Some("ddg".into()),
                    });
                }
            }
        }

        let re_spelling = Regex::new(r#"DDG\.page\.showMessage\(\s*'spelling'\s*,\s*"#).unwrap();
        let sparts: Vec<&str> = re_spelling.splitn(&js, 2).collect();
        if sparts.len() > 1 {
            if let Some(sjson) = Self::extract_json(sparts[1]) {
                if let Ok(spell) = serde_json::from_str::<serde_json::Value>(&sjson) {
                    let suggestion = spell
                        .get("suggestion")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let recourse = spell
                        .get("recourseText")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let qc = spell.get("qc").and_then(|v| v.as_i64()).unwrap_or(0);
                    let ctype = if qc == 2 { "including" } else { "not_many" };
                    response.spelling = SpellCorrection {
                        correction_type: ctype.to_string(),
                        using: suggestion.to_string(),
                        correction: recourse.to_string(),
                    };
                }
            }
        }

        Ok(response)
    }
}

#[async_trait]
impl Scraper for DDG {
    fn name(&self) -> &str {
        "ddg"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        if let Some(npt) = &query.npt {
            let parts: Vec<&str> = npt.splitn(2, ',').collect();
            match parts.get(0).copied() {
                Some("0") => self.web_html(query).await,
                Some("1") => self.web_full(query).await,
                _ => self.web_full(query).await,
            }
        } else {
            match self.web_full(query).await {
                Ok(r) if !r.web.is_empty() => Ok(r),
                _ => self.web_html(query).await,
            }
        }
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let mut response = ImageResponse::empty();

        let (js_url, vqd_val, proxy_label) = if let Some(npt) = &query.npt {
            let parts: Vec<&str> = npt.splitn(2, ',').collect();
            if parts.len() == 2 {
                (parts[1].to_string(), None, None)
            } else {
                return Ok(response);
            }
        } else {
            let nsfw = match query.nsfw {
                NsfwLevel::Yes => "-1",
                _ => "1",
            };

            let get_filters = vec![
                ("q".to_string(), query.q.clone()),
                ("iax".to_string(), "images".to_string()),
                ("ia".to_string(), "images".to_string()),
                ("kp".to_string(), nsfw.to_string()),
            ];

            let (client, proxy_label) = self.http.get_or_raw_client(Some("ddg"));

            let html = client
                .get("https://duckduckgo.com/")
                .query(&get_filters)
                .header(
                    "Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                )
                .header("Accept-Language", "en-US,en;q=0.5")
                .header("User-Agent", self.http.random_ua())
                .header("DNT", "1")
                .header("Sec-GPC", "1")
                .header("Connection", "keep-alive")
                .header("Upgrade-Insecure-Requests", "1")
                .header("Sec-Fetch-Dest", "document")
                .header("Sec-Fetch-Mode", "navigate")
                .header("Sec-Fetch-Site", "same-origin")
                .header("Sec-Fetch-User", "?1")
                .send()
                .await?
                .text()
                .await?;

            let vqd =
                Self::vqd(&html).ok_or_else(|| AppError::ScraperError("Failed to get VQD".into()))?;

            let qs = format!(
                "o=json&q={}&vqd={}&f=&p={}",
                url::form_urlencoded::byte_serialize(query.q.as_bytes()).collect::<String>(),
                vqd,
                nsfw
            );

            (format!("https://duckduckgo.com/i.js?{}", qs), Some(vqd), proxy_label)
        };

        let (client, _) = self.http.get_or_raw_client(if proxy_label.is_some() { Some("ddg") } else { None });

        let json_text = client
            .get(&js_url)
            .header("Accept", "*/*")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("Referer", "https://duckduckgo.com/")
            .header("User-Agent", self.http.random_ua())
            .header("DNT", "1")
            .header("Sec-GPC", "1")
            .header("Connection", "keep-alive")
            .header("Sec-Fetch-Dest", "script")
            .header("Sec-Fetch-Mode", "no-cors")
            .header("Sec-Fetch-Site", "same-site")
            .send()
            .await?
            .text()
            .await?;

        let json: serde_json::Value = serde_json::from_str(&json_text)?;

        if let Some(results) = json.get("results").and_then(|v| v.as_array()) {
            for item in results {
                let title = item
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let image_url = item
                    .get("image")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let thumbnail = item
                    .get("thumbnail")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let width = item.get("width").and_then(|v| v.as_u64());
                let height = item.get("height").and_then(|v| v.as_u64());
                let page_url = item
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let page_url = Self::unshiturl(page_url);

                if image_url.is_empty() {
                    continue;
                }

                let mut sources = Vec::new();
                sources.push(ImageSource {
                    url: image_url.to_string(),
                    width: width.map(|w| w as u32),
                    height: height.map(|h| h as u32),
                });
                if !thumbnail.is_empty() {
                    sources.push(ImageSource {
                        url: thumbnail.to_string(),
                        width: None,
                        height: None,
                    });
                }

                response.image.push(ImageResult {
                    title,
                    url: page_url,
                    source: sources,
                });
            }
        }

        if let Some(next) = json.get("next").and_then(|v| v.as_str()) {
            if !next.is_empty() {
                let vqd = vqd_val.unwrap_or_default();
                response.npt = Some(format!("1,{}&vqd={}", next, vqd));
            }
        }

        Ok(response)
    }

    async fn video(&self, query: &SearchQuery) -> Result<VideoResponse, AppError> {
        let mut response = VideoResponse::empty();

        let js_url = if let Some(npt) = &query.npt {
            let parts: Vec<&str> = npt.splitn(2, ',').collect();
            if parts.len() == 2 {
                format!("https://duckduckgo.com/{}", parts[1])
            } else {
                return Ok(response);
            }
        } else {
            let nsfw = match query.nsfw {
                NsfwLevel::Yes => "-2",
                NsfwLevel::Maybe => "-1",
                NsfwLevel::No => "1",
            };

            let get_filters = vec![
                ("q".to_string(), query.q.clone()),
                ("iax".to_string(), "videos".to_string()),
                ("ia".to_string(), "videos".to_string()),
                ("kp".to_string(), nsfw.to_string()),
            ];

            let (client, _) = self.http.get_or_raw_client(Some("ddg"));

            let html = client
                .get("https://duckduckgo.com/")
                .query(&get_filters)
                .header(
                    "Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                )
                .header("Accept-Language", "en-US,en;q=0.5")
                .header("User-Agent", self.http.random_ua())
                .header("DNT", "1")
                .header("Sec-GPC", "1")
                .header("Connection", "keep-alive")
                .header("Upgrade-Insecure-Requests", "1")
                .header("Sec-Fetch-Dest", "document")
                .header("Sec-Fetch-Mode", "navigate")
                .header("Sec-Fetch-Site", "same-origin")
                .header("Sec-Fetch-User", "?1")
                .send()
                .await?
                .text()
                .await?;

            let vqd =
                Self::vqd(&html).ok_or_else(|| AppError::ScraperError("Failed to get VQD".into()))?;

            let qs = format!(
                "l=wt-wt&o=json&sr=1&q={}&vqd={}&f=&p={}",
                url::form_urlencoded::byte_serialize(query.q.as_bytes()).collect::<String>(),
                vqd,
                nsfw
            );

            format!("https://duckduckgo.com/v.js?{}", qs)
        };

        let (client, _) = self.http.get_or_raw_client(Some("ddg"));

        let json_text = client
            .get(&js_url)
            .header("Accept", "*/*")
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("Referer", "https://duckduckgo.com/")
            .header("User-Agent", self.http.random_ua())
            .header("DNT", "1")
            .header("Sec-GPC", "1")
            .header("Connection", "keep-alive")
            .header("Sec-Fetch-Dest", "script")
            .header("Sec-Fetch-Mode", "no-cors")
            .header("Sec-Fetch-Site", "same-site")
            .send()
            .await?
            .text()
            .await?;

        let json: serde_json::Value = serde_json::from_str(&json_text)?;

        if let Some(results) = json.get("results").and_then(|v| v.as_array()) {
            for item in results {
                let title = item
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let description = item
                    .get("description")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let content_url = item.get("content").and_then(|v| v.as_str()).unwrap_or("");
                let url = Self::unshiturl(content_url);

                let mut thumb = None;
                if let Some(images) = item.get("images").and_then(|v| v.as_object()) {
                    for size in ["large", "medium", "small"] {
                        if let Some(t) = images.get(size).and_then(|v| v.as_str()) {
                            thumb = Some(t.to_string());
                            break;
                        }
                    }
                }

                let views = item
                    .get("statistics")
                    .and_then(|v| v.get("viewCount"))
                    .and_then(|v| v.as_i64());

                let duration = item.get("duration").and_then(|v| v.as_str()).map(|d| {
                    let parts: Vec<&str> = d.split(':').collect();
                    let mut secs: i64 = 0;
                    if parts.len() == 3 {
                        secs += parts[0].parse::<i64>().unwrap_or(0) * 3600;
                        secs += parts[1].parse::<i64>().unwrap_or(0) * 60;
                        secs += parts[2].parse::<i64>().unwrap_or(0);
                    } else if parts.len() == 2 {
                        secs += parts[0].parse::<i64>().unwrap_or(0) * 60;
                        secs += parts[1].parse::<i64>().unwrap_or(0);
                    }
                    secs
                });

                let author = item
                    .get("uploader")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string());

                let date = item
                    .get("published")
                    .and_then(|v| v.as_str())
                    .and_then(|s| {
                        // Try parsing ISO date
                        chrono::DateTime::parse_from_rfc3339(s)
                            .ok()
                            .map(|dt| dt.timestamp())
                            .or_else(|| {
                                chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d")
                                    .ok()
                                    .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc().timestamp())
                            })
                    });

                response.video.push(VideoResult {
                    title,
                    url,
                    views,
                    duration,
                    date,
                    description: if description.is_empty() {
                        None
                    } else {
                        Some(description)
                    },
                    source: Some("ddg".into()),
                    author,
                    thumb,
                });
            }
        }

        if let Some(next) = json.get("next").and_then(|v| v.as_str()) {
            if !next.is_empty() {
                response.npt = Some(format!("1,{}", next));
            }
        }

        Ok(response)
    }

    async fn news(&self, query: &SearchQuery) -> Result<NewsResponse, AppError> {
        let mut response = NewsResponse::empty();

        let js_url = if let Some(npt) = &query.npt {
            let parts: Vec<&str> = npt.splitn(2, ',').collect();
            if parts.len() == 2 {
                format!("https://duckduckgo.com/{}", parts[1])
            } else {
                return Ok(response);
            }
        } else {
            let html = self
                .http
                .client
                .get("https://duckduckgo.com/")
                .query(&[
                    ("q", query.q.as_str()),
                    ("iar", "news"),
                    ("ia", "news"),
                ])
                .header(
                    "Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                )
                .header("Accept-Language", "en-US,en;q=0.5")
                .send()
                .await?
                .text()
                .await?;

            let vqd =
                Self::vqd(&html).ok_or_else(|| AppError::ScraperError("Failed to get VQD".into()))?;

            let p = match query.nsfw {
                NsfwLevel::Yes => "-2",
                NsfwLevel::Maybe => "-1",
                NsfwLevel::No => "1",
            };

            let qs = format!(
                "l=wt-wt&o=json&noamp=1&m=30&q={}&vqd={}&p={}&df=&u=bing",
                url::form_urlencoded::byte_serialize(query.q.as_bytes()).collect::<String>(),
                vqd,
                p
            );

            format!("https://duckduckgo.com/news.js?{}", qs)
        };

        let json_text = self
            .http
            .client
            .get(&js_url)
            .header("Accept", "*/*")
            .header("Referer", "https://duckduckgo.com/")
            .header("User-Agent", self.http.random_ua())
            .send()
            .await?
            .text()
            .await?;

        let json: serde_json::Value = serde_json::from_str(&json_text)?;

        if let Some(results) = json.get("results").and_then(|v| v.as_array()) {
            for item in results {
                let title = item
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let url = item.get("url").and_then(|v| v.as_str()).unwrap_or("");
                let url = Self::unshiturl(url);
                let description = item
                    .get("excerpt")
                    .and_then(|v| v.as_str())
                    .map(|s| Self::strip_html(s))
                    .unwrap_or_default();
                let source = item
                    .get("source")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string());
                let date = item.get("date").and_then(|v| v.as_i64());
                let thumb = item
                    .get("image")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string());

                response.news.push(NewsResult {
                    title,
                    url,
                    description,
                    date,
                    source,
                    thumb,
                });
            }
        }

        if let Some(next) = json.get("next").and_then(|v| v.as_str()) {
            if !next.is_empty() {
                response.npt = Some(format!("1,{}", next));
            }
        }

        Ok(response)
    }

    async fn autocomplete(&self, query: &str) -> Result<Vec<String>, AppError> {
        let resp: serde_json::Value = self
            .http
            .client
            .get("https://duckduckgo.com/ac/")
            .query(&[("q", query), ("type", "list")])
            .header("User-Agent", self.http.random_ua())
            .send()
            .await?
            .json()
            .await?;

        // DDG returns [query, [suggestions]]
        let suggestions = if let Some(arr) = resp.as_array() {
            if let Some(suggestions_arr) = arr.get(1).and_then(|v| v.as_array()) {
                suggestions_arr
                    .iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            } else {
                vec![]
            }
        } else {
            vec![]
        };

        Ok(suggestions)
    }
}
