use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;
use scraper::{Html, Selector};

pub struct Ghostery {
    http: HttpClient,
}

impl Ghostery {
    pub fn new(http: HttpClient) -> Self {
        Ghostery { http }
    }

    fn get_country(query: &SearchQuery) -> String {
        query
            .filters
            .get("f_country")
            .cloned()
            .unwrap_or_else(|| "any".to_string())
    }

    fn titledots(s: &str) -> String {
        s.trim_matches(|c| c == '.' || c == ' ' || c == '\t' || c == '\n' || c == '\r')
            .trim()
            .to_string()
    }

    fn cookie_country(country: &str) -> String {
        if country == "any" {
            "--".to_string()
        } else {
            country.to_string()
        }
    }
}

#[async_trait]
impl Scraper for Ghostery {
    fn name(&self) -> &str {
        "ghostery"
    }

    async fn web(&self, query: &SearchQuery) -> Result<WebResponse, AppError> {
        let html = if let Some(npt) = &query.npt {
            let parts: Vec<&str> = npt.splitn(2, '|').collect();
            if parts.len() != 2 {
                return Err(AppError::ScraperError("Invalid NPT data".into()));
            }
            let query_string = parts[0];
            let country = parts[1];

            let url = format!(
                "https://ghosterysearch.com/search?{}",
                query_string
            );

            let cookie = format!("ctry={}; noads=true", Self::cookie_country(country));

            self.http
                .client
                .get(&url)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.5")
                .header("Referer", "https://ghosterysearch.com")
                .header("Cookie", &cookie)
                .header("Upgrade-Insecure-Requests", "1")
                .header("Sec-Fetch-Dest", "document")
                .header("Sec-Fetch-Mode", "navigate")
                .header("Sec-Fetch-Site", "same-origin")
                .header("Sec-Fetch-User", "?1")
                .header("Priority", "u=0, i")
                .send()
                .await?
                .text()
                .await?
        } else {
            if query.q.is_empty() {
                return Err(AppError::BadRequest("Search term is empty".into()));
            }

            let country = Self::get_country(query);
            let cookie = format!("ctry={}; noads=true", Self::cookie_country(&country));

            self.http
                .client
                .get("https://ghosterysearch.com/search")
                .query(&[("q", query.q.as_str())])
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.5")
                .header("Referer", "https://ghosterysearch.com")
                .header("Cookie", &cookie)
                .header("Upgrade-Insecure-Requests", "1")
                .header("Sec-Fetch-Dest", "document")
                .header("Sec-Fetch-Mode", "navigate")
                .header("Sec-Fetch-Site", "same-origin")
                .header("Sec-Fetch-User", "?1")
                .header("Priority", "u=0, i")
                .send()
                .await?
                .text()
                .await?
        };

        let mut response = WebResponse::empty();

        let document = Html::parse_document(&html);

        let results_sel = Selector::parse("section.results").map_err(|e| {
            AppError::ScraperError(format!("Selector error: {}", e))
        })?;
        let result_sel = Selector::parse("li.result").map_err(|e| {
            AppError::ScraperError(format!("Selector error: {}", e))
        })?;
        let a_sel = Selector::parse("a.url").map_err(|e| {
            AppError::ScraperError(format!("Selector error: {}", e))
        })?;
        let h2_sel = Selector::parse("h2").map_err(|e| {
            AppError::ScraperError(format!("Selector error: {}", e))
        })?;
        let p_sel = Selector::parse("p").map_err(|e| {
            AppError::ScraperError(format!("Selector error: {}", e))
        })?;

        let results_section = match document.select(&results_sel).next() {
            Some(s) => s,
            None => {
                return Err(AppError::ScraperError(
                    "Failed to find results section".into(),
                ));
            }
        };

        let results = results_section.select(&result_sel).collect::<Vec<_>>();

        if results.is_empty() {
            return Ok(response);
        }

        for result in results {
            let a_el = match result.select(&a_sel).next() {
                Some(a) => a,
                None => continue,
            };

            let url = a_el.value().attr("href").unwrap_or("").to_string();

            let title = result
                .select(&h2_sel)
                .next()
                .map(|h| Self::titledots(&h.text().collect::<String>()))
                .unwrap_or_default();

            let description = result
                .select(&p_sel)
                .next()
                .map(|p| Self::titledots(&p.text().collect::<String>()))
                .unwrap_or_default();

            response.web.push(WebResult {
                title,
                url,
                description,
                date: None,
                source: Some("ghostery".into()),
            });
        }

        let pagination_sel = Selector::parse("div.pagination").map_err(|e| {
            AppError::ScraperError(format!("Selector error: {}", e))
        })?;
        let pagination_a_sel = Selector::parse("a").map_err(|e| {
            AppError::ScraperError(format!("Selector error: {}", e))
        })?;

        if let Some(pagination) = document.select(&pagination_sel).next() {
            let links: Vec<_> = pagination.select(&pagination_a_sel).collect();
            if let Some(last_link) = links.last() {
                if let Some(href) = last_link.value().attr("href") {
                    let full_url = if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("https://ghosterysearch.com{}", href)
                    };

                    if let Ok(parsed) = url::Url::parse(&full_url) {
                        let query_string = parsed.query().unwrap_or("");
                        let country = Self::get_country(query);
                        response.npt = Some(format!("{}|{}", query_string, country));
                    }
                }
            }
        }

        Ok(response)
    }
}
