pub mod client;
pub mod ddg;
pub mod brave;
pub mod google;
pub mod yandex;
pub mod baidu;
pub mod startpage;
pub mod qwant;
pub mod yahoo_japan;
pub mod ghostery;
pub mod mwmbl;
pub mod mojeek;
pub mod wiby;
pub mod coccoc;
pub mod solofield;
pub mod yt;
pub mod vimeo;
pub mod sepiasearch;
pub mod sc;
pub mod swisscows;
pub mod spotify;
pub mod pinterest;
pub mod flickr;
pub mod pexels;
pub mod fivehpx;
pub mod vsco;
pub mod imgur;
pub mod cara;
pub mod ftm;

use crate::types::*;
use async_trait::async_trait;
use std::collections::HashMap;

#[async_trait]
pub trait Scraper: Send + Sync {
    fn name(&self) -> &str;

    async fn web(&self, _query: &SearchQuery) -> Result<WebResponse, crate::errors::AppError> {
        Err(crate::errors::AppError::ScraperNotSupported(format!(
            "{} does not support web search",
            self.name()
        )))
    }

    async fn image(&self, _query: &SearchQuery) -> Result<ImageResponse, crate::errors::AppError> {
        Err(crate::errors::AppError::ScraperNotSupported(format!(
            "{} does not support image search",
            self.name()
        )))
    }

    async fn video(&self, _query: &SearchQuery) -> Result<VideoResponse, crate::errors::AppError> {
        Err(crate::errors::AppError::ScraperNotSupported(format!(
            "{} does not support video search",
            self.name()
        )))
    }

    async fn news(&self, _query: &SearchQuery) -> Result<NewsResponse, crate::errors::AppError> {
        Err(crate::errors::AppError::ScraperNotSupported(format!(
            "{} does not support news search",
            self.name()
        )))
    }

    async fn music(&self, _query: &SearchQuery) -> Result<MusicResponse, crate::errors::AppError> {
        Err(crate::errors::AppError::ScraperNotSupported(format!(
            "{} does not support music search",
            self.name()
        )))
    }

    async fn autocomplete(&self, _query: &str) -> Result<Vec<String>, crate::errors::AppError> {
        Err(crate::errors::AppError::ScraperNotSupported(format!(
            "{} does not support autocomplete",
            self.name()
        )))
    }
}

pub type ScraperRegistry = HashMap<&'static str, Box<dyn Scraper>>;

pub fn build_registry(http: client::HttpClient, _config: &crate::config::Config) -> ScraperRegistry {
    let mut r: ScraperRegistry = HashMap::new();

    r.insert("ddg", Box::new(ddg::DDG::new(http.clone())) as Box<dyn Scraper>);
    r.insert("brave", Box::new(brave::Brave::new(http.clone())));
    r.insert("google", Box::new(google::Google::new(http.clone())));
    r.insert("yandex", Box::new(yandex::Yandex::new(http.clone())));
    r.insert("baidu", Box::new(baidu::Baidu::new(http.clone())));
    r.insert("startpage", Box::new(startpage::Startpage::new(http.clone())));
    r.insert("qwant", Box::new(qwant::Qwant::new(http.clone())));
    r.insert("yahoo_japan", Box::new(yahoo_japan::YahooJapan::new(http.clone())));
    r.insert("ghostery", Box::new(ghostery::Ghostery::new(http.clone())));
    r.insert("mwmbl", Box::new(mwmbl::Mwmbl::new(http.clone())));
    r.insert("mojeek", Box::new(mojeek::Mojeek::new(http.clone())));
    r.insert("wiby", Box::new(wiby::Wiby::new(http.clone())));
    r.insert("coccoc", Box::new(coccoc::CocCoc::new(http.clone())));
    r.insert("solofield", Box::new(solofield::Solofield::new(http.clone())));
    r.insert("yt", Box::new(yt::YouTube::new(http.clone())));
    r.insert("vimeo", Box::new(vimeo::Vimeo::new(http.clone())));
    r.insert("sepiasearch", Box::new(sepiasearch::SepiaSearch::new(http.clone())));
    r.insert("sc", Box::new(sc::SoundCloud::new(http.clone())));
    r.insert("swisscows", Box::new(swisscows::Swisscows::new(http.clone())));
    r.insert("spotify", Box::new(spotify::Spotify::new(http.clone())));
    r.insert("pinterest", Box::new(pinterest::Pinterest::new(http.clone())));
    r.insert("flickr", Box::new(flickr::Flickr::new(http.clone())));
    r.insert("pexels", Box::new(pexels::Pexels::new(http.clone())));
    r.insert("fivehpx", Box::new(fivehpx::FiveHundredPx::new(http.clone())));
    r.insert("vsco", Box::new(vsco::VSCO::new(http.clone())));
    r.insert("imgur", Box::new(imgur::Imgur::new(http.clone())));
    r.insert("cara", Box::new(cara::Cara::new(http.clone())));
    r.insert("ftm", Box::new(ftm::FindThatMeme::new(http.clone())));

    r
}
