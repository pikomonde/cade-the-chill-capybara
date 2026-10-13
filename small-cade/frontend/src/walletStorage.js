import { generatePrivateKey } from 'viem/accounts';

const STORAGE_KEY = 'cade_capybara_private_key';

/**
 * Read from Telegram CloudStorage via Promise
 */
const getTelegramCloudItem = (key) => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.CloudStorage?.getItem) {
      try {
        window.Telegram.WebApp.CloudStorage.getItem(key, (err, val) => {
          if (err || !val) {
            resolve(null);
          } else {
            resolve(val);
          }
        });
        return;
      } catch (e) {
        console.warn("Could not read Telegram CloudStorage:", e);
      }
    }
    resolve(null);
  });
};

/**
 * Save to Telegram CloudStorage via Promise
 */
const setTelegramCloudItem = (key, val) => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.CloudStorage?.setItem) {
      try {
        window.Telegram.WebApp.CloudStorage.setItem(key, val, (err, success) => {
          resolve(!err && Boolean(success));
        });
        return;
      } catch (e) {
        console.warn("Could not write to Telegram CloudStorage:", e);
      }
    }
    resolve(false);
  });
};

/**
 * Remove from Telegram CloudStorage via Promise
 */
const removeTelegramCloudItem = (key) => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.CloudStorage?.removeItem) {
      try {
        window.Telegram.WebApp.CloudStorage.removeItem(key, (err, success) => {
          resolve(!err && Boolean(success));
        });
        return;
      } catch (e) {
        console.warn("Could not remove from Telegram CloudStorage:", e);
      }
    }
    resolve(false);
  });
};

/**
 * Automatically fetch existing Private Key or generate a new one.
 * Priority: Telegram CloudStorage -> localStorage -> generate fresh key
 */
export const getOrCreatePrivateKey = async () => {
  // 1. Try Telegram CloudStorage first (cross-device on Telegram)
  let key = await getTelegramCloudItem(STORAGE_KEY);
  if (key && key.startsWith('0x') && key.length === 66) {
    localStorage.setItem(STORAGE_KEY, key);
    return { key, isNew: false, source: 'telegram_cloud' };
  }

  // 2. Try localStorage (Farcaster, web browser, local dev)
  key = localStorage.getItem(STORAGE_KEY);
  if (key && key.startsWith('0x') && key.length === 66) {
    // Sync back to Telegram CloudStorage if in Telegram
    await setTelegramCloudItem(STORAGE_KEY, key);
    return { key, isNew: false, source: 'local_storage' };
  }

  // 3. Generate a new cryptographically secure random Private Key
  key = generatePrivateKey();
  localStorage.setItem(STORAGE_KEY, key);
  await setTelegramCloudItem(STORAGE_KEY, key);
  return { key, isNew: true, source: 'generated' };
};

/**
 * Import a custom private key (e.g. from Privy export or another device)
 */
export const saveCustomPrivateKey = async (rawKey) => {
  let formatted = rawKey.trim().replace(/^["']|["']$/g, '').trim();
  if (!formatted.toLowerCase().startsWith('0x')) {
    formatted = `0x${formatted}`;
  } else {
    formatted = `0x${formatted.slice(2)}`;
  }
  if (formatted.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(formatted)) {
    throw new Error("Invalid private key format. Expected 64 hex characters (e.g. 0x... or without 0x).");
  }

  localStorage.setItem(STORAGE_KEY, formatted);
  await setTelegramCloudItem(STORAGE_KEY, formatted);
  return formatted;
};

/**
 * Clear stored private key
 */
export const clearStoredPrivateKey = async () => {
  localStorage.removeItem(STORAGE_KEY);
  await removeTelegramCloudItem(STORAGE_KEY);
};
