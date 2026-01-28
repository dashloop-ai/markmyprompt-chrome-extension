# Quick Start Guide

Get Promptean Sync up and running in 5 minutes!

## Prerequisites

- ✅ Chrome browser installed
- ✅ Promptean backend running (default: `http://localhost:7070`)
- ✅ Promptean API key (generate from web app)

## Installation Steps

### 1. Load Extension (2 minutes)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `chromeplugin` folder
5. Extension installed! ✅

> **Note**: You'll see a warning about icons - this is normal. The extension will work fine without custom icons.

### 2. Generate API Key (1 minute)

1. Open Promptean web app (`http://localhost:7071`)
2. Sign in to your account
3. Go to **Settings** → **API Keys**
4. Click **"+ New API Key"**
5. Enter name: `Chrome Extension`
6. Click **Create**
7. **Copy the API key** (you won't see it again!)

### 3. Configure Extension (1 minute)

1. Click the Promptean Sync icon in Chrome toolbar
2. Click **"Open Settings"**
3. Paste your API key in the **API Key** field
4. Verify **Base URL** is `http://localhost:7070`
5. Click **"Verify & Activate"**
6. Wait for success: "✓ API key verified! Extension is now active."

### 4. Test It! (1 minute)

#### On ChatGPT
1. Go to `https://chat.openai.com`
2. Start a new chat or open existing one
3. Hover over any of your messages
4. See the **purple sync button** appear?
5. Click it!
6. Toast notification: "✓ Prompt synced successfully!"

#### On Gemini - Sync Prompts
1. Go to `https://gemini.google.com`
2. Start a new chat or open existing one
3. Hover over any of your prompts
4. See the **purple sync button**?
5. Click it!
6. Toast notification: "✓ Prompt synced successfully!"

#### On Gemini - Sync Answers (NEW!)
1. Ask Gemini a question and wait for the response
2. Click Gemini's **copy button** (next to the AI response)
3. A **sync modal** will appear automatically
4. Click **"Sync Answer"** in the modal
5. Toast notification: "✓ Answer synced successfully!"

### 5. Verify in Promptean (30 seconds)

1. Go back to Promptean web app
2. Navigate to **My Prompts**
3. Your synced prompt should be there!
4. Check the tags - it should include `chatgpt` or `gemini`

## Troubleshooting

### "Extension not activated"
→ Go to Settings and click "Verify & Activate"

### Sync buttons not showing
→ Refresh the ChatGPT/Gemini page and wait a few seconds

### "Verification failed"
→ Make sure Promptean backend is running at `http://localhost:7070`

### Can't find the API key
→ Generate a new one in Promptean Settings → API Keys

## What's Next?

- ✅ Sync prompts from ChatGPT
- ✅ Sync prompts from Gemini
- ✅ Sync AI answers from Gemini (NEW!)
- ✅ Organize prompts with tags in Promptean
- ✅ Search and reuse your best prompts
- ✅ Share prompts with others

## Need Help?

See the full [README.md](./README.md) for:
- Detailed feature explanations
- Architecture overview
- Advanced configuration
- Adding new platforms
- Development guide

---

Happy syncing! ⚡
