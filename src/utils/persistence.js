const DB_NAME = 'auction-warroom-db';
const DB_VERSION = 1;
const STORE_NAME = 'tournaments';
const BACKUP_KEY = 'auction_warroom_backups_v3';
const STORAGE_KEY = 'auction_warroom_tournaments_v3';

function readJson(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function getValue(storeName, key) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => resolve(req.result?.value ?? null);
        req.onerror = () => reject(req.error || new Error('Failed to read value from IndexedDB'));
      })
      .catch(reject);
  });
}

function putValue(storeName, key, value) {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((db) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put({ id: key, value });

        req.onsuccess = () => resolve(value);
        req.onerror = () => reject(req.error || new Error('Failed to save value to IndexedDB'));
      })
      .catch(reject);
  });
}

export function deepClone(value) {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

export function createBackupRecord(tournament, actionLabel = 'auto-save') {
  const stamp = Date.now();
  return {
    id: `${tournament.id}-backup-${stamp}`,
    tournamentId: tournament.id,
    createdAt: new Date(stamp).toISOString(),
    action: actionLabel,
    tournament: deepClone(tournament)
  };
}

export async function loadStoredTournaments() {
  const fallback = readJson(STORAGE_KEY, []);

  try {
    const stored = await getValue(STORE_NAME, 'savedTournaments');
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
  } catch {
    // fall through to localStorage fallback below
  }

  return fallback;
}

export async function persistStoredTournaments(tournaments, backupTournament = null, actionLabel = 'auto-save') {
  const nextList = Array.isArray(tournaments) ? tournaments : [];

  try {
    await putValue(STORE_NAME, 'savedTournaments', nextList);
  } catch {
    // ignore and rely on localStorage fallback
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  } catch {
    // ignore storage quota errors
  }

  if (backupTournament) {
    try {
      const existing = readJson(BACKUP_KEY, []);
      const nextBackups = [createBackupRecord(backupTournament, actionLabel), ...existing].slice(0, 10);
      localStorage.setItem(BACKUP_KEY, JSON.stringify(nextBackups));
    } catch {
      // ignore failed backup writes
    }
  }

  return nextList;
}

export function loadBackupHistory() {
  const backupList = readJson(BACKUP_KEY, []);
  return Array.isArray(backupList) ? backupList : [];
}

export function snapshotTournamentState(tournament) {
  return {
    id: tournament.id,
    name: tournament.name,
    sport: tournament.sport,
    preset: deepClone(tournament.preset),
    myTeamName: tournament.myTeamName,
    players: deepClone(tournament.players || []),
    mySquad: deepClone(tournament.mySquad || []),
    rivals: deepClone(tournament.rivals || []),
    activePlayerId: tournament.activePlayerId,
    targetsList: deepClone(tournament.targetsList || []),
    auctionPlan: deepClone(tournament.auctionPlan || {}),
    auctionLog: deepClone(tournament.auctionLog || []),
    isPractice: Boolean(tournament.isPractice),
    updatedAt: tournament.updatedAt
  };
}
