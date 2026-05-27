const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'presentations.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore() {
  ensureDataDir();
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return {
      activeFile: parsed.activeFile || null,
      files: Array.isArray(parsed.files) ? parsed.files : [],
    };
  } catch {
    return { activeFile: null, files: [] };
  }
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function sanitizeBaseName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function buildStoredFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase() || '.pdf';
  const base = sanitizeBaseName(path.basename(originalname, ext));
  return `${Date.now()}-${base}${ext}`;
}

function addPresentation(file) {
  const store = readStore();
  const item = {
    filename: file.filename,
    originalName: file.originalname,
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
  };
  store.files.unshift(item);
  if (!store.activeFile) {
    store.activeFile = item.filename;
  }
  writeStore(store);
  return { item, store };
}

function setActive(filename) {
  const store = readStore();
  const exists = store.files.find((f) => f.filename === filename);
  if (!exists) return { ok: false, error: 'File not found' };
  store.activeFile = filename;
  writeStore(store);
  return { ok: true, store };
}

function removePresentation(filename) {
  const store = readStore();
  const item = store.files.find((f) => f.filename === filename);
  if (!item) return { ok: false, error: 'File not found' };

  const abs = path.join(DATA_DIR, filename);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);

  store.files = store.files.filter((f) => f.filename !== filename);
  if (store.activeFile === filename) {
    store.activeFile = store.files.length > 0 ? store.files[0].filename : null;
  }
  writeStore(store);
  return { ok: true, store };
}

function getStatus() {
  const store = readStore();
  const active = store.files.find((f) => f.filename === store.activeFile) || null;
  return {
    uploaded: !!active,
    filename: active ? active.originalName : '',
    storedFilename: active ? active.filename : '',
    sizeBytes: active ? active.sizeBytes : 0,
    uploadedAt: active ? active.uploadedAt : '',
    activeFile: store.activeFile,
    files: store.files,
  };
}

function getActivePresentation() {
  const status = getStatus();
  if (!status.uploaded) return null;
  const absPath = path.join(DATA_DIR, status.activeFile);
  if (!fs.existsSync(absPath)) return null;
  return {
    path: absPath,
    filename: status.filename || 'presentation.pdf',
    storedFilename: status.activeFile,
  };
}

module.exports = {
  DATA_DIR,
  buildStoredFilename,
  addPresentation,
  setActive,
  removePresentation,
  getStatus,
  getActivePresentation,
};

