# Manychat-style local automation (Instagram + Facebook)

This repo scaffolds a self-hosted responder that listens to Instagram/Facebook comment webhooks, matches comments against configurable keywords (with typo tolerance), and posts public replies plus DM follow-ups. It runs as a lightweight Node.js service inside Docker and stores keyword mappings in a simple JSON file.

## What you need from the Meta developer portal (with steps)
Follow these steps in order—they match the latest Meta Business app flow and avoid the “short-lived token” pitfalls.

1) **Create a Meta developer app (type: Business)**
   - Visit <https://developers.facebook.com/apps> → **Create App** → choose **Business**.
   - Note the **App ID** and **App Secret** from **Settings → Basic**; these go into `APP_ID` and `APP_SECRET`.

2) **Link your Facebook Page and Instagram Business account** (required for Instagram Graph API)
   - In **Facebook Business Settings**: **Accounts → Pages** → ensure your Page is added to the Business.
   - In the same screen, add your **Instagram Business/Creator account** and connect it to the Page (Meta prompts you to log in and confirm).
   - After linking, open **Instagram accounts → Connected assets** to confirm the Page is listed.

3) **Add products to the app**
   - In the app dashboard, go to **Add Product** and set up:
     - **Instagram Graph API** (needed for IG comments).
     - **Webhooks** (to receive comment events).
     - **Messenger** (only if you want FB DMs; required for `pages_messaging`).

4) **Grant permissions and generate a long-lived Page token (recommended: System User token)**
   - In **Business Settings → Users → System Users**, create a **System User** (type: Admin for automation).
   - Assign assets: choose your **Page** (and optionally the connected Instagram account) with full control.
   - Click **Generate New Token**, select your app, and request these scopes: `instagram_manage_comments`, `instagram_basic`, `pages_read_engagement`, `pages_manage_engagement`, `pages_manage_metadata`, `pages_messaging` (needed for FB public replies + DMs).
   - Choose the Page during token creation to embed Page access. The resulting token is long-lived and goes into `PAGE_ACCESS_TOKEN`.

5) **Collect IDs for `.env`**
   - `INSTAGRAM_BUSINESS_ID`: In **Business Settings → Accounts → Instagram accounts**, open the account and copy the **Instagram Business Account ID**. You can also query `/{page-id}?fields=instagram_business_account` with the Page token and use the returned `id`.
   - `PAGE_ID` (needed for FB DMs and optional to log responses): Copy from your Page **About** tab or query `me?fields=id` with the Page token.
   - `VERIFY_TOKEN`: choose any random string; you will paste the same value in the webhook subscription UI.
   - `SERVER_URL`: the public HTTPS URL Meta can reach (reverse proxy on your NAS or a temporary tunnel like Cloudflare or ngrok during setup).

6) **Subscribe the webhook**
   - In **App Dashboard → Webhooks**, choose **Instagram** and/or **Page** and click **Subscribe to this object**.
   - For Instagram, subscribe to **`comments`** (event includes mentions). For Facebook Pages, subscribe to **`feed`** and **`messages`** if you want DMs.
   - Set **Callback URL** to `https://<SERVER_URL>/webhook` and **Verify Token** to the exact `VERIFY_TOKEN` you set locally. Complete the verification challenge (the service responds to the GET check).

## Project layout
```
./backend            # Node.js service handling webhooks and responses
  ├─ src/
  │  ├─ index.js     # Minimal HTTP server
  │  ├─ controllers/ # Webhook handler
  │  ├─ services/    # Matching, Meta calls, JSON store
  │  └─ utils/       # Env loader, logger
  ├─ data/keywords.example.json # Sample keyword config
  ├─ .env.example    # Fields to fill from the Meta app
  └─ Dockerfile
./docker-compose.yml # Runs the API with a bind-mounted data folder
```

## Quick start (local or Docker)
1. **Create config files**
   ```bash
   cp backend/.env.example backend/.env
   cp backend/data/keywords.example.json backend/data/keywords.json
   ```
   Fill `backend/.env` with your Meta app values.

2. **Define keywords** (per-post or global) in `backend/data/keywords.json`. Example:
   ```json
   {
     "global": [
       {
         "keyword": "info",
         "variants": ["info", "information"],
         "commentReplies": ["Thanks for asking! Check your DMs for the link."],
         "dmReplies": ["Here you go: {{resourceUrl}}"],
         "resourceUrl": "https://example.com/global"
       }
     ],
     "posts": {
       "<instagram_or_fb_post_id>": [
         {
           "keyword": "guide",
           "variants": ["guide", "gide"],
           "commentReplies": ["Appreciate the comment—DM on the way!"],
           "dmReplies": ["Download the guide: {{resourceUrl}}"],
           "resourceUrl": "https://example.com/guide"
         }
       ]
     }
   }
   ```

3. **Run locally (without Docker)**
  ```bash
  cd backend
  npm install   # no external deps, keeps package-lock for Docker builds
  npm start
  # Server listens on http://localhost:3000
  ```

   Open <http://localhost:3000/> for a simple UI to add keywords and see what’s configured without editing JSON.

4. **Run in Docker**
  ```bash
 docker compose up --build
  ```
  The API + UI listen on `http://localhost:3000` and persist `backend/data/keywords.json` via a bind mount.

### Webhook verification checklist (works in Codespaces + ngrok)
1. Set the same `VERIFY_TOKEN` in `backend/.env` and in the Meta Webhooks UI.
2. Start the service from `backend/` so the `.env` is loaded: `npm start`.
3. If you are using Codespaces, expose port **3000**. If you are using ngrok locally, run `ngrok http 3000` and use the tunneled HTTPS URL.
4. Test the verification callback before pasting it into Meta:
   ```bash
   # Replace the token with your VERIFY_TOKEN value
   curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=$VERIFY_TOKEN&hub.challenge=123" -i
   # Expect: HTTP/1.1 200 and body "123" when the token matches; HTTP 403 otherwise.
   ```
5. Only after the local curl returns 200, use the public URL (Codespaces forward URL or ngrok URL) in the Webhooks UI.

## How the webhook handler behaves
- **GET /webhook** performs Meta verification using `VERIFY_TOKEN`.
- **POST /webhook** expects a Graph API payload. For each `change` containing comment text it:
  1. Loads global + post-specific keyword configs.
  2. Fuzzy-matches the comment text against keyword variants (case-insensitive, one-character typo tolerance).
  3. Picks a random template for the public comment reply and DM reply, replacing `{{keyword}}` and `{{resourceUrl}}` placeholders.
  4. Calls the Graph API to post the reply and send the DM using `PAGE_ACCESS_TOKEN`.

## Scheduling + post IDs
You can preconfigure scheduled content by adding the **post ID** before it goes live:
- **Facebook scheduled posts**: query `/{page-id}/scheduled_posts?fields=id,published,scheduled_publish_time` with your Page token.
- **Instagram scheduled posts**: create scheduled media via `/{ig-user-id}/media` with `publish_at` and capture the returned `id`.
Add those IDs under `posts` in `keywords.json` so matching works the moment comments arrive.

## Operational tips
- Use a reverse proxy/HTTPS terminator on your NAS (Traefik/Caddy/Nginx) to expose `/webhook` publicly.
- Regenerate long-lived Page tokens periodically (Meta tokens expire); store them in `backend/.env`.
- For Messenger DMs, ensure the Page has the **messaging** product and the user has messaged the Page before (platform requirement).
- Logs are JSON lines; pipe them to `jq` for readability during debugging.

## Minimal test
A small smoke check ensures the config files load:
```bash
cd backend
npm test
```
