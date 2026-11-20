'use strict';

// Never let AI output (or quoted user content) ping @everyone, @here, roles or users.
const NO_MENTIONS = Object.freeze({ parse: [], repliedUser: false });

/** Neutralise mass mentions and code-fence breakouts inside text we display. */
function sanitizeForDisplay(text, max = 600) {
  return String(text || '')
    .replace(/@(everyone|here)/gi, '@\u200b$1')
    .replace(/`/g, "'")
    .slice(0, max);
}

module.exports = { NO_MENTIONS, sanitizeForDisplay };
