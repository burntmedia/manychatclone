const fs = require('fs').promises;
const path = require('path');
const { logError } = require('./logger');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    logError('Failed to ensure data directory', error);
  }
}

async function writeJson(fileName, data) {
  try {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, fileName);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    logError('Failed to write JSON file', error, { fileName });
    throw error;
  }
}

async function readJson(fileName, defaultValue) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, fileName);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        await writeJson(fileName, defaultValue);
      } catch (writeError) {
        logError('Failed to create missing JSON file', writeError, { fileName });
      }
      return defaultValue;
    }

    logError('Failed to read JSON file', error, { fileName });
    return defaultValue;
  }
}

module.exports = {
  readJson,
  writeJson,
};
