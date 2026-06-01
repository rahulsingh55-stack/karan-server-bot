# 🛡️ Karan Protection Bot — Setup Guide

## Step 1: Create Your Bot
1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it "Karan Bot"
3. Go to **Bot** tab → click **Add Bot**
4. Under **Token**, click **Reset Token** and copy it
5. Enable these **Privileged Gateway Intents**:
   - Server Members Intent ✅
   - Message Content Intent ✅

## Step 2: Invite Bot to Your Server
1. Go to **OAuth2 → URL Generator**
2. Check: `bot`
3. Check permissions: `Administrator` (or select individual permissions)
4. Open the generated URL and invite to your **Karan** server

## Step 3: Install & Run
```bash
# Make sure Node.js is installed (https://nodejs.org)
npm install
```

## Step 4: Add Your Token
Open `index.js` and replace:
```js
const TOKEN = 'YOUR_BOT_TOKEN_HERE';
```
with your actual bot token.

## Step 5: Create Log Channel
In your Discord server, create a text channel named exactly:
```
karan-logs
```
The bot will send all mod actions and alerts here.

## Step 6: Start the Bot
```bash
node index.js
```

---

## 🛡️ Features
| Feature | Description |
|---|---|
| Anti-Spam | Auto-mutes users sending 5+ messages in 4 seconds |
| Anti-Link | Blocks links from non-admins |
| Word Filter | Deletes banned words automatically |
| New Account Alert | Warns if a joining account is under 7 days old |
| Join/Leave Log | Logs all member joins and leaves |

## 📋 Commands (Moderators Only)
| Command | Description |
|---|---|
| `!kick @user [reason]` | Kick a member |
| `!ban @user [reason]` | Ban a member |
| `!mute @user [minutes]` | Timeout a member |
| `!unmute @user` | Remove timeout |
| `!warn @user [reason]` | DM a warning to a member |
| `!serverinfo` | Show server stats |
| `!help` | Show all commands |

## Customize
- Edit `BANNED_WORDS` array in `index.js` to add your own banned words
- Change `SPAM_THRESHOLD` and `SPAM_WINDOW_MS` to tune anti-spam sensitivity
