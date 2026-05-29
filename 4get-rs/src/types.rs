use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub page: u32,
    pub nsfw: NsfwLevel,
    pub safe: bool,
    pub spellcheck: bool,
    pub filters: HashMap<String, String>,
    pub npt: Option<String>,
    pub extended_search: bool,
}

#[allow(dead_code)]
impl SearchQuery {
    pub fn from_params(params: &HashMap<String, String>) -> Self {
        let q = params.get("s").cloned().unwrap_or_default();
        let npt = params.get("npt").cloned();
        let extended = params.get("extendedsearch").map(|v| v == "true").unwrap_or(false);
        let nsfw = match params.get("nsfw").map(|s| s.as_str()) {
            Some("yes") => NsfwLevel::Yes,
            Some("maybe") => NsfwLevel::Maybe,
            _ => NsfwLevel::No,
        };
        let safe = params.get("safe").map(|v| v == "1").unwrap_or(false);
        let spellcheck = params.get("spellcheck").map(|v| v == "no").unwrap_or(true);
        let mut filters = HashMap::new();
        for (k, v) in params {
            if k.starts_with("f_") {
                filters.insert(k.clone(), v.clone());
            }
        }
        SearchQuery {
            q,
            page: 0,
            nsfw,
            safe,
            spellcheck,
            filters,
            npt,
            extended_search: extended,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NsfwLevel {
    Yes,
    Maybe,
    No,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpellCorrection {
    #[serde(rename = "type")]
    pub correction_type: String,
    pub using: String,
    pub correction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebResult {
    pub title: String,
    pub url: String,
    pub description: String,
    pub date: Option<i64>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageSource {
    pub url: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageResult {
    pub title: String,
    pub url: String,
    pub source: Vec<ImageSource>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoResult {
    pub title: String,
    pub url: String,
    pub views: Option<i64>,
    pub duration: Option<i64>,
    pub date: Option<i64>,
    pub description: Option<String>,
    pub source: Option<String>,
    pub author: Option<String>,
    pub thumb: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsResult {
    pub title: String,
    pub url: String,
    pub description: String,
    pub date: Option<i64>,
    pub source: Option<String>,
    pub thumb: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DescNode {
    #[serde(rename = "type")]
    pub node_type: String,
    pub value: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnswerResult {
    pub title: Option<String>,
    pub url: Option<String>,
    pub thumb: Option<String>,
    pub description: Vec<DescNode>,
    pub table: HashMap<String, String>,
    pub sublink: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SongStream {
    pub endpoint: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SongResult {
    pub title: String,
    pub author: String,
    pub duration: Option<i64>,
    pub stream: SongStream,
    pub url: Option<String>,
    pub thumb: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebResponse {
    pub status: String,
    pub npt: Option<String>,
    pub spelling: SpellCorrection,
    pub web: Vec<WebResult>,
    pub image: Vec<ImageResult>,
    pub video: Vec<VideoResult>,
    pub news: Vec<NewsResult>,
    pub answer: Vec<AnswerResult>,
    pub related: Vec<String>,
}

impl WebResponse {
    pub fn empty() -> Self {
        WebResponse {
            status: "ok".to_string(),
            npt: None,
            spelling: SpellCorrection {
                correction_type: "no_correction".to_string(),
                using: String::new(),
                correction: String::new(),
            },
            web: vec![],
            image: vec![],
            video: vec![],
            news: vec![],
            answer: vec![],
            related: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageResponse {
    pub status: String,
    pub npt: Option<String>,
    pub image: Vec<ImageResult>,
}

impl ImageResponse {
    pub fn empty() -> Self {
        ImageResponse {
            status: "ok".to_string(),
            npt: None,
            image: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoResponse {
    pub status: String,
    pub npt: Option<String>,
    pub video: Vec<VideoResult>,
}

impl VideoResponse {
    pub fn empty() -> Self {
        VideoResponse {
            status: "ok".to_string(),
            npt: None,
            video: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsResponse {
    pub status: String,
    pub npt: Option<String>,
    pub news: Vec<NewsResult>,
}

impl NewsResponse {
    pub fn empty() -> Self {
        NewsResponse {
            status: "ok".to_string(),
            npt: None,
            news: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MusicResponse {
    pub status: String,
    pub npt: Option<String>,
    pub song: Vec<SongResult>,
}

impl MusicResponse {
    pub fn empty() -> Self {
        MusicResponse {
            status: "ok".to_string(),
            npt: None,
            song: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutocompleteResponse {
    pub status: String,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct Ami4GetResponse {
    pub status: String,
    pub name: String,
    pub version: u32,
    pub api_enabled: bool,
    pub bot_protection: u8,
    pub instance_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct HealthzResponse {
    pub status: String,
    pub service: String,
    pub version: u32,
    pub timestamp: i64,
}
