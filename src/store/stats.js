'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

const DEFAULT_STATS = {
  questionsAnswered: 0,
  summariesGenerated: 0,
  scamsBlocked: 0,
  startedAt: Date.now(),
};

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return { ...DEFAULT_STATS, ...JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) };
    }
  } catch {
    // Fallback to defaults if file is corrupted
  }
  return { ...DEFAULT_STATS };
}

const stats = loadStats();
stats.startedAt = Date.now();

function saveStats() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  } catch (err) {
    console.error('[Stats] Failed to save stats:', err.message);
  }
}

function incrementStat(key) {
  if (typeof stats[key] === 'number') {
    stats[key] += 1;
    saveStats();
  }
}

function getStats() {
  return { ...stats };
}

module.exports = { incrementStat, getStats };
