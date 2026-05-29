use crate::config::Config;
use reqwest::{Client, Proxy};
use std::sync::atomic::{AtomicU64, Ordering};

#[derive(Debug, Clone)]
pub struct ProxyConfig {
    pub proxy_type: ProxyType,
    pub address: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone)]
pub enum ProxyType {
    Http,
    Https,
    Socks4,
    Socks5,
    Socks5Hostname,
}

impl ProxyConfig {
    pub fn proxy_type_str(&self) -> &str {
        match self.proxy_type {
            ProxyType::Http => "http",
            ProxyType::Https => "https",
            ProxyType::Socks4 => "socks4",
            ProxyType::Socks5 => "socks5",
            ProxyType::Socks5Hostname => "socks5h",
        }
    }
    pub fn from_line(line: &str) -> Option<Self> {
        let parts: Vec<&str> = line.splitn(5, ':').collect();
        if parts.len() < 3 {
            return None;
        }

        let proxy_type = match parts[0] {
            "http" => ProxyType::Http,
            "https" => ProxyType::Https,
            "socks4" => ProxyType::Socks4,
            "socks5" | "socks" => ProxyType::Socks5,
            "socks5h" | "socks5_hostname" | "socks4a" => ProxyType::Socks5Hostname,
            "raw_ip" => return None,
            _ => return None,
        };

        let address = parts[1].to_string();
        let port: u16 = parts[2].parse().ok()?;
        let username = parts.get(3).filter(|s| !s.is_empty()).map(|s| s.to_string());
        let password = parts.get(4).filter(|s| !s.is_empty()).map(|s| s.to_string());

        Some(ProxyConfig {
            proxy_type,
            address,
            port,
            username,
            password,
        })
    }

    pub fn to_reqwest_proxy(&self) -> Result<Proxy, Box<dyn std::error::Error>> {
        let url = match self.proxy_type {
            ProxyType::Http => format!("http://{}:{}", self.address, self.port),
            ProxyType::Https => format!("https://{}:{}", self.address, self.port),
            ProxyType::Socks4 => format!("socks4://{}:{}", self.address, self.port),
            ProxyType::Socks5 => format!("socks5://{}:{}", self.address, self.port),
            ProxyType::Socks5Hostname => format!("socks5h://{}:{}", self.address, self.port),
        };

        let mut proxy = Proxy::all(&url)?;
        if let (Some(user), Some(pass)) = (&self.username, &self.password) {
            proxy = proxy.basic_auth(user, pass);
        }
        Ok(proxy)
    }
}

pub struct ProxyPool {
    pub proxies: Vec<ProxyConfig>,
    counter: AtomicU64,
}

impl ProxyPool {
    pub fn new(proxies: Vec<ProxyConfig>) -> Self {
        ProxyPool {
            proxies,
            counter: AtomicU64::new(0),
        }
    }

    pub fn from_file(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let proxies: Vec<ProxyConfig> = content
            .lines()
            .filter(|l| {
                let trimmed = l.trim();
                !trimmed.is_empty() && !trimmed.starts_with('#')
            })
            .filter_map(ProxyConfig::from_line)
            .collect();

        if proxies.is_empty() {
            return Err(format!("No valid proxies found in {}", path).into());
        }

        Ok(ProxyPool::new(proxies))
    }

    pub fn next(&self) -> Option<&ProxyConfig> {
        if self.proxies.is_empty() {
            return None;
        }
        let idx = self.counter.fetch_add(1, Ordering::Relaxed) % self.proxies.len() as u64;
        Some(&self.proxies[idx as usize])
    }

    #[allow(dead_code)]
    pub fn is_empty(&self) -> bool {
        self.proxies.is_empty()
    }
}

impl Clone for ProxyPool {
    fn clone(&self) -> Self {
        ProxyPool {
            proxies: self.proxies.clone(),
            counter: AtomicU64::new(self.counter.load(Ordering::Relaxed)),
        }
    }
}

pub struct HttpClient {
    pub client: Client,
    pub proxy_pools: Vec<(String, ProxyPool)>,
    pub user_agent: String,
    pub user_agent_friendly: String,
}

impl HttpClient {
    pub fn new(config: &Config) -> Result<Self, Box<dyn std::error::Error>> {
        let client = Client::builder()
            .user_agent(&config.server.user_agent)
            .gzip(true)
            .brotli(true)
            .danger_accept_invalid_certs(false)
            .connect_timeout(std::time::Duration::from_secs(30))
            .timeout(std::time::Duration::from_secs(30))
            .pool_max_idle_per_host(32)
            .http2_adaptive_window(true)
            .build()?;

        Ok(HttpClient {
            client,
            proxy_pools: vec![],
            user_agent: config.server.user_agent.clone(),
            user_agent_friendly: config.server.user_agent_friendly.clone(),
        })
    }

    pub fn load_proxy_pool(&mut self, name: &str, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let pool = ProxyPool::from_file(path)?;
        self.proxy_pools.push((name.to_string(), pool));
        Ok(())
    }

    #[allow(dead_code)]
    pub fn get_proxy_pool(&self, name: &str) -> Option<&ProxyPool> {
        self.proxy_pools
            .iter()
            .find(|(n, _)| n == name)
            .map(|(_, p)| p)
    }

    pub fn get_or_raw_client(&self, pool_name: Option<&str>) -> (Client, Option<String>) {
        if let Some(name) = pool_name {
            if let Some(pool) = self.get_proxy_pool(name) {
                if let Some(proxy_config) = pool.next() {
                    if let Ok(proxy) = proxy_config.to_reqwest_proxy() {
                        if let Ok(client) = Client::builder()
                            .user_agent(&self.user_agent)
                            .proxy(proxy)
                            .gzip(true)
                            .brotli(true)
                            .danger_accept_invalid_certs(false)
                            .connect_timeout(std::time::Duration::from_secs(15))
                            .timeout(std::time::Duration::from_secs(30))
                            .build()
                        {
                            let label = format!("{}:{}:{}", proxy_config.proxy_type_str(), proxy_config.address, proxy_config.port);
                            return (client, Some(label));
                        }
                    }
                }
            }
        }
        (self.client.clone(), None)
    }
}

impl Clone for HttpClient {
    fn clone(&self) -> Self {
        HttpClient {
            client: self.client.clone(),
            proxy_pools: self.proxy_pools.clone(),
            user_agent: self.user_agent.clone(),
            user_agent_friendly: self.user_agent_friendly.clone(),
        }
    }
}
