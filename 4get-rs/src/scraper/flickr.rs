use crate::errors::AppError;
use crate::scraper::client::HttpClient;
use crate::scraper::Scraper;
use crate::types::*;
use async_trait::async_trait;

pub struct Flickr {
    http: HttpClient,
}

impl Flickr {
    pub fn new(http: HttpClient) -> Self {
        Flickr { http }
    }
}

#[async_trait]
impl Scraper for Flickr {
    fn name(&self) -> &str {
        "flickr"
    }

    async fn image(&self, query: &SearchQuery) -> Result<ImageResponse, AppError> {
        let resp = self
            .http
            .client
            .get("https://api.flickr.com/services/rest/")
            .query(&[
                ("method", "flickr.photos.search"),
                ("api_key", "1508443e49213ff84d566777dcf2abe3"),
                ("text", query.q.as_str()),
                ("format", "json"),
                ("nojsoncallback", "1"),
                ("per_page", "20"),
                ("sort", "relevance"),
                ("safe_search", if matches!(query.nsfw, crate::types::NsfwLevel::Yes) { "1" } else { "1" }),
                ("extras", "url_l,url_m,url_s,url_t"),
            ])
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let mut response = ImageResponse::empty();

        if let Some(photos) = resp.get("photos").and_then(|p| p.get("photo")).and_then(|v| v.as_array()) {
            for photo in photos {
                let title = photo.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let url_l = photo.get("url_l").and_then(|v| v.as_str());
                let url_m = photo.get("url_m").and_then(|v| v.as_str());
                let url_s = photo.get("url_s").and_then(|v| v.as_str());
                let url_t = photo.get("url_t").and_then(|v| v.as_str());

                let width = photo.get("width_l").or_else(|| photo.get("width_m")).and_then(|v| v.as_u64());
                let height = photo.get("height_l").or_else(|| photo.get("height_m")).and_then(|v| v.as_u64());

                if let Some(primary) = url_l.or(url_m) {
                    let mut sources = vec![ImageSource {
                        url: primary.to_string(),
                        width: width.map(|w| w as u32),
                        height: height.map(|h| h as u32),
                    }];
                    if let Some(thumb) = url_s.or(url_t) {
                        sources.push(ImageSource {
                            url: thumb.to_string(),
                            width: None,
                            height: None,
                        });
                    }
                    response.image.push(ImageResult { title, url: sources[0].url.clone(), source: sources });
                }
            }
        }

        Ok(response)
    }
}
