pub mod pagination;

use sled::{Db, Tree};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct CacheStore {
    db: Db,
}

impl CacheStore {
    pub fn open(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let db = sled::open(path)?;
        Ok(CacheStore { db })
    }

    pub fn tree(&self, name: &str) -> Tree {
        self.db.open_tree(name).unwrap()
    }

    pub fn get(&self, tree: &str, key: &[u8]) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        let t = self.tree(tree);
        match t.get(key)? {
            Some(value) => Ok(Some(value.to_vec())),
            None => Ok(None),
        }
    }

    pub fn set(&self, tree: &str, key: &[u8], value: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
        let t = self.tree(tree);
        t.insert(key, value)?;
        Ok(())
    }

    pub fn set_with_ttl(
        &self,
        tree: &str,
        key: &[u8],
        value: &[u8],
        ttl_secs: u64,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let t = self.tree(tree);
        let expiry = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
            + ttl_secs;
        let mut buf = Vec::with_capacity(value.len() + 8);
        buf.extend_from_slice(&expiry.to_le_bytes());
        buf.extend_from_slice(value);
        t.insert(key, buf)?;
        Ok(())
    }

    pub fn get_with_ttl(&self, tree: &str, key: &[u8]) -> Result<Option<Vec<u8>>, Box<dyn std::error::Error>> {
        let t = self.tree(tree);
        match t.get(key)? {
            Some(value) => {
                if value.len() < 8 {
                    return Ok(Some(value.to_vec()));
                }
                let expiry_bytes: [u8; 8] = value[..8].try_into().unwrap();
                let expiry = u64::from_le_bytes(expiry_bytes);
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                if now > expiry {
                    t.remove(key)?;
                    return Ok(None);
                }
                Ok(Some(value[8..].to_vec()))
            }
            None => Ok(None),
        }
    }

    pub fn increment(&self, tree: &str, key: &[u8]) -> Result<u64, Box<dyn std::error::Error>> {
        let t = self.tree(tree);
        let val = t.update_and_fetch(key, |old| {
            let current = old
                .and_then(|v| {
                    let bytes: [u8; 8] = v[..8].try_into().ok()?;
                    Some(u64::from_le_bytes(bytes))
                })
                .unwrap_or(0);
            Some(current.wrapping_add(1).to_le_bytes().to_vec())
        })?;
        let bytes: [u8; 8] = val.as_ref().unwrap()[..8].try_into().unwrap();
        Ok(u64::from_le_bytes(bytes))
    }

    pub fn flush(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.db.flush()?;
        Ok(())
    }
}
