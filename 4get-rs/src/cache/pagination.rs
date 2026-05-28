use crate::cache::CacheStore;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    ChaCha20Poly1305, Key, Nonce,
};
use flate2::read::DeflateDecoder;
use flate2::write::DeflateEncoder;
use flate2::Compression;
use rand::RngCore;
use std::io::{Read, Write};

pub struct PaginationStore {
    cache: CacheStore,
    cipher: ChaCha20Poly1305,
}

impl PaginationStore {
    pub fn new(cache: CacheStore) -> Self {
        let mut key_bytes = [0u8; 32];
        OsRng.fill_bytes(&mut key_bytes);
        let key = Key::from_slice(&key_bytes);
        let cipher = ChaCha20Poly1305::new(key);
        PaginationStore { cache, cipher }
    }

    pub fn store(
        &self,
        scraper: &str,
        page: &str,
        payload: &[u8],
        proxy: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let request_id = self.cache.increment("pagination", b"requestid")?;

        let mut encoder = DeflateEncoder::new(Vec::new(), Compression::best());
        encoder.write_all(payload)?;
        let compressed = encoder.finish()?;

        let nonce_bytes = {
            let mut buf = [0u8; 12];
            OsRng.fill_bytes(&mut buf);
            buf
        };
        let nonce = Nonce::from_slice(&nonce_bytes);
        let encrypted = self.cipher.encrypt(nonce, compressed.as_ref())
            .map_err(|e| format!("encrypt error: {}", e))?;

        let page_letter = page.chars().next().unwrap_or('w');
        let apcu_key = format!("{}.{}{}", page_letter, scraper, request_id);

        let mut store_data = Vec::with_capacity(12 + 4 + proxy.len() + encrypted.len());
        store_data.extend_from_slice(&nonce_bytes);
        let proxy_bytes = proxy.as_bytes();
        store_data.extend_from_slice(&(proxy_bytes.len() as u32).to_le_bytes());
        store_data.extend_from_slice(proxy_bytes);
        store_data.extend_from_slice(&encrypted);

        self.cache.set_with_ttl("pagination", apcu_key.as_bytes(), &store_data, 900)?;

        let mut key_enc = vec![0u8; 32];
        // We need to store this key for retrieval - but the PHP model
        // encodes the key in the token itself for zero-server-state.
        // We'll derive a key_id and store it.
        let key_id = self.cache.increment("pagination", b"keyid")?;
        let key_id_b64 = URL_SAFE_NO_PAD.encode(key_id.to_le_bytes());
        self.cache.set_with_ttl(
            "pagination",
            format!("key_{}", key_id_b64).as_bytes(),
            &key_enc,
            900,
        )?;

        let token = format!("{}{}.{}", scraper, request_id, key_id_b64);
        Ok(token)
    }

    pub fn retrieve(
        &self,
        token: &str,
        page: &str,
    ) -> Result<(Vec<u8>, String), Box<dyn std::error::Error>> {
        let parts: Vec<&str> = token.splitn(2, '.').collect();
        if parts.len() != 2 {
            return Err("Malformed nextPageToken".into());
        }

        let page_letter = page.chars().next().unwrap_or('w');
        let apcu_key = format!("{}.{}", page_letter, parts[0]);

        let store_data = self
            .cache
            .get("pagination", apcu_key.as_bytes())?
            .ok_or_else(|| "The next page token is invalid or has expired!".to_string())?;

        if store_data.len() < 16 {
            return Err("Invalid stored data".into());
        }

        let nonce = Nonce::from_slice(&store_data[..12]);
        let proxy_len_bytes: [u8; 4] = store_data[12..16].try_into()?;
        let proxy_len = u32::from_le_bytes(proxy_len_bytes) as usize;

        if 16 + proxy_len > store_data.len() {
            return Err("Invalid proxy length".into());
        }

        let proxy = String::from_utf8(store_data[16..16 + proxy_len].to_vec())?;
        let encrypted = &store_data[16 + proxy_len..];

        let decrypted = self.cipher.decrypt(nonce, encrypted)
            .map_err(|e| format!("decrypt error: {}", e))?;

        let mut decoder = DeflateDecoder::new(decrypted.as_slice());
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed)?;

        Ok((decompressed, proxy))
    }
}
