# +1AI — Free & Open-Source AI Discord Bot

> Auto-Support from your server's FAQ, instant `/summarize` channel recaps, and an AI Anti-Scam Shield — powered by **free-tier AI** (Google Gemini, Groq, or 100% local Ollama).

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-00d4ff?style=for-the-badge)

---

## Features

- **🤖 Auto-Support (`knowledge/faq.md`):** Reads your custom Markdown FAQ and answers member questions automatically when mentioned (`@+1AI`) or inside designated support channels.
- **✨ Instant Channel Summaries (`/summarize`):** Summarizes the last 10–100 messages into crisp bullet points, key decisions, and action items.
- **🛡️ AI Anti-Scam Shield:** Uses a fast local heuristic filter + AI verification to detect Nitro phishing, fake Steam/crypto drops, and account-hijack links — auto-deleting the message, timing out the scammer, and logging details to `#mod-logs`.
- **💸 100% Free & Provider-Flexible:** Switch between **Google Gemini (free tier)**, **Groq (free tier)**, or **Ollama (local & private)** with one `.env` line. Zero paid subscriptions.

---

## Quick Setup (2 Minutes)

### 1. Clone & Install
```bash
git clone https://github.com/fabioxyz/1ai-bot.git
cd 1ai-bot
npm install
```

### 2. Configure `.env`
```bash
cp .env.example .env
```
Fill in:
- `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` from the [Discord Developer Portal](https://discord.com/developers/applications) *(enable **Message Content Intent** under Bot settings)*
- `GEMINI_API_KEY` (free at [Google AI Studio](https://aistudio.google.com/apikey)) — or set `AI_PROVIDER=groq` / `ollama`
- Optional: `SUPPORT_CHANNEL_IDS`, `SUMMARIZE_CHANNEL_IDS` and `MOD_LOG_CHANNEL_ID`

### Safe defaults
- **Anti-Scam starts in `review` mode:** suspected scams are only reported to `#mod-logs`. Once you trust the classifications on your server, set `ANTI_SCAM_MODE=enforce` to delete messages and apply timeouts. Every log shows the **real result** of each action (e.g. `❌ Delete FAILED: Missing Permissions`), and nothing is announced or counted unless it actually happened.
- **`/summarize` is opt-in per channel** (`SUMMARIZE_CHANNEL_IDS`, or `*` for all). It only works for members who can read that channel's history, and the summary is shown **only to the person who asked**.
- **Privacy:** with Gemini or Groq, the selected messages and usernames are sent to that provider. Use Ollama to keep everything local.
- **Limits:** AI requests time out after `AI_TIMEOUT_MS`; `/ask` and `/summarize` have a per-user cooldown (`COMMAND_COOLDOWN_SECONDS`); auto-support only answers explicit `@+1AI` mentions outside support channels (never `@everyone`/`@here`), and bot replies can't ping anyone.

### 3. Customize Your FAQ
Edit [`knowledge/faq.md`](knowledge/faq.md) with your server's rules, links, and common answers.

### 4. Register Slash Commands & Start
```bash
npm run deploy
npm start
```

---

## Slash Commands

| Command | Description |
|---|---|
| `/summarize [messages]` | Privately summarizes the last 10–100 messages (most recent first if over the length limit) in an allowed channel |
| `/ask <question>` | Asks +1AI a question using your server FAQ + AI knowledge |
| `/ai-status` | Displays active AI provider, model, uptime, and protection stats |

---

## License

MIT — built by **[@bigbotdp](https://www.youtube.com/@bigbotdp)**. Star the repo if it helped your server!
