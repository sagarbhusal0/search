use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub bot_protection: BotProtectionConfig,
    pub scrapers: ScrapersConfig,
    pub proxies: HashMap<String, Option<String>>,
    pub oracles: OraclesConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub name: String,
    pub short_description: String,
    pub long_description: Option<String>,
    pub default_theme: String,
    pub host: String,
    pub port: u16,
    pub data_dir: String,
    pub user_agent: String,
    pub user_agent_friendly: String,
    pub api_enabled: bool,
    pub instances: Vec<String>,
    pub alt_addresses: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BotProtectionConfig {
    pub enabled: u8,
    pub max_searches: u32,
    pub header_regex: Option<String>,
    pub filtered_header_keys: Vec<String>,
    pub captcha_dataset: Vec<CaptchaDatasetEntry>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CaptchaDatasetEntry {
    pub name: String,
    pub count: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScrapersConfig {
    pub google_cx_endpoint: Option<String>,
    pub marginalia_api_key: Option<String>,
    pub yep_use_api: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OraclesConfig {
    pub enabled: bool,
}

impl Config {
    pub fn load(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }

    pub fn default_path() -> String {
        "config.toml".to_string()
    }

    pub fn proxy_pool_for(&self, scraper: &str) -> Option<&str> {
        let key = format!("PROXY_{}", scraper.to_uppercase());
        self.proxies.get(&key).and_then(|v| v.as_deref())
    }

    pub fn data_path(&self, sub: &str) -> String {
        let p = Path::new(&self.server.data_dir).join(sub);
        p.to_string_lossy().to_string()
    }
}
