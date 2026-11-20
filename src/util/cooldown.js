'use strict';

/**
 * Simple in-memory per-key cooldown.
 * check(key) returns 0 if allowed (and records the hit), otherwise the remaining seconds.
 */
function createCooldown(seconds, now = () => Date.now()) {
  const last = new Map();
  const ms = seconds * 1000;

  return {
    check(key) {
      if (ms <= 0) return 0;
      const t = now();
      if (last.has(key)) {
        const remaining = last.get(key) + ms - t;
        if (remaining > 0) return Math.ceil(remaining / 1000);
      }
      last.set(key, t);
      // Opportunistic cleanup to keep the map small
      if (last.size > 5000) {
        for (const [k, v] of last) if (v + ms < t) last.delete(k);
      }
      return 0;
    },
  };
}

module.exports = { createCooldown };
