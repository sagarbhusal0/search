use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    #[allow(dead_code)]
    pub bot_protection: BotProtectionConfig,
    pub scrapers: ScrapersConfig,
    #[allow(dead_code)]
    pub proxies: HashMap<String, Option<String>>,
    #[allow(dead_code)]
    pub oracles: OraclesConfig,
    #[serde(default)]
    pub cors: CorsConfig,
    #[serde(default)]
    pub auth: AuthConfig,
}

impl Default for CorsConfig {
    fn default() -> Self {
        CorsConfig {
            allowed_origins: vec![],
        }
    }
}

impl Default for AuthConfig {
    fn default() -> Self {
        AuthConfig { api_key: None }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub name: String,
    #[allow(dead_code)]
    pub short_description: String,
    #[allow(dead_code)]
    pub long_description: Option<String>,
    #[allow(dead_code)]
    pub default_theme: String,
    pub host: String,
    pub port: u16,
    pub data_dir: String,
    pub user_agent: String,
    pub user_agent_friendly: String,
    #[allow(dead_code)]
    pub api_enabled: bool,
    #[allow(dead_code)]
    pub instances: Vec<String>,
    #[allow(dead_code)]
    pub alt_addresses: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct BotProtectionConfig {
    pub enabled: u8,
    pub max_searches: u32,
    pub header_regex: Option<String>,
    pub filtered_header_keys: Vec<String>,
    pub captcha_dataset: Vec<CaptchaDatasetEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct CaptchaDatasetEntry {
    pub name: String,
    pub count: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScrapersConfig {
    pub pixabay_api_key: Option<String>,
    pub flickr_api_key: Option<String>,
    pub google_cse_cx: Option<String>,
    pub soundcloud_client_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CorsConfig {
    pub allowed_origins: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuthConfig {
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct OraclesConfig {
    pub enabled: bool,
}

impl Config {
    pub fn load(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }

    #[allow(dead_code)]
    pub fn default_path() -> String {
        "config.toml".to_string()
    }

    #[allow(dead_code)]
    pub fn proxy_pool_for(&self, scraper: &str) -> Option<&str> {
        let key = format!("PROXY_{}", scraper.to_uppercase());
        self.proxies.get(&key).and_then(|v| v.as_deref())
    }

    pub fn data_path(&self, sub: &str) -> String {
        let p = Path::new(&self.server.data_dir).join(sub);
        p.to_string_lossy().to_string()
    }
}
