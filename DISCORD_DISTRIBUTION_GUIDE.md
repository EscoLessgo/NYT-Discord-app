# How to Distribute your Discord Activity

## 1. Testers
Since your app is likely in "Unverified" state (the default), only **YOU** and people you explicitly add can see/play it.

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your Application (Farkle).
3. Go to **"App Permissions"** or **"Installation"**? No, go to **"Team"** if you are in a team, or just look for the **"Testers"** section if available (Discord changing this UI often).
4. actually, the easiest way for *Activities* is:
   - Go to **Activities** -> **Getting Started**.
   - Ensure the URL mappings are correct.
   - **CRITICAL:** You must add your friends to the **"App Testers"** list if you want them to see it before it is public.
   - **OR:** Have them join a server where you have "Installed" the app if it's a bot-based activity. But for Ad-Hoc activities, they usually need to be added to the whitelist.

## 2. Public Distribution
To make it public for everyone:
1. You might need to **Verify** your app if it grows.
2. Enable "Discoverability" if that's an option.
3. Usually, just sharing the **Activity Invite Link** in a Voice Channel is enough if the app is configured correctly.

## 3. Troubleshooting "Not Showing Up"
- If your friend clicks the activity button and sees nothing: They might be region-locked or on a device that doesn't support it yet (mobile support is tricky).
- If they click it and it errors: It's the "Loading" bug we are fixing.

## 4. Hosting
- **IMPORTANT:** If you are running `npm run dev` on your PC, **ONLY YOU** can see it unless you use a Tunnel (Cloudflare/Ngrok).
- If you want *everyone* to play 24/7 without your PC on, you MUST deploy this to a host like **Railway, Heroku, or Vercel**.
- **Current Status:** You seem to be running locally. Make sure your Tunnel is active and the URL in Discord Developer Portal matches your Tunnel URL.
