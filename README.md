# Manychat-style local automation (Instagram + Facebook)

This repo scaffolds a self-hosted responder that listens to Instagram/Facebook comment webhooks, matches comments against configurable keywords (with typo tolerance), and posts public replies plus DM follow-ups. It runs as a lightweight Node.js service inside Docker and stores keyword mappings in a simple JSON file. The latest OAuth flow lets you connect **multiple Pages/Instagram Business Accounts** and stores their long-lived Page tokens in `backend/data/tokens.json`.

## What you need from the Meta developer portal (with steps)
Follow these steps in order—they match the latest Meta Business app flow and avoid the “short-lived token” pitfalls.

1) **Create a Meta developer app (type: Business)**
   - Visit <https://developers.facebook.com/apps> → **Create App** → choose **Business**.
   - Note the **App ID** and **App Secret** from **Settings → Basic**; these go into `META_APP_ID` and `META_APP_SECRET`.

2) **Link your Facebook Page and Instagram Business account** (required for Instagram Graph API)
   - In **Facebook Business Settings**: **Accounts → Pages** → ensure your Page is added to the Business.
   - In the same screen, add your **Instagram Business/Creator account** and connect it to the Page (Meta prompts you to log in and confirm).
   - After linking, open **Instagram accounts → Connected assets** to confirm the Page is listed.

3) **Add products to the app**
   - In the app dashboard, go to **Add Product** and set up:
     - **Instagram Graph API** (needed for IG comments).
     - **Webhooks** (to receive comment events).
     - **Messenger** (only if you want FB DMs; required for `pages_messaging`).

4) **Configure OAuth + environment values**
   - In **App Dashboard → Use Cases → Customize → Client OAuth Settings**, set **Valid OAuth Redirect URIs** to `https://<SERVER_URL>/auth/callback`.
   - In `backend/.env`, set:
     - `META_APP_ID` and `META_APP_SECRET` from step 1.
     - `META_REDIRECT_URI` to the exact HTTPS redirect you set above (for local dev with a tunnel, include the public URL).
     - `VERIFY_TOKEN`: choose any random string; you will paste the same value in the webhook subscription UI.
     - `SERVER_URL`: the public HTTPS URL Meta can reach (reverse proxy on your NAS or a temporary tunnel like Cloudflare or ngrok during setup).

5) **Connect Pages/IG accounts via OAuth (multi-account)**
   - Run the service locally (`npm start` in `backend`) or in Docker, ensuring it is reachable at `https://<SERVER_URL>`.
   - Visit `https://<SERVER_URL>/auth/login` and complete the Meta login. The flow requests the required scopes (`pages_*`, `instagram_manage_comments`, `instagram_manage_messages`).
   - If multiple Pages are in the business, either pick the one with an Instagram Business Account attached or pass `?page_id=<PAGE_ID>` to `/auth/callback` to force a specific Page.
   - The backend exchanges tokens, fetches the Page-specific long-lived token, and writes it to `backend/data/tokens.json` along with the Instagram Business Account ID. Repeat the login for each Page you want the webhook handler to manage.

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
   Open `https://<SERVER_URL>/auth/login` while the server is running to authorize each Page/IG account you want connected; the
   resulting long-lived Page tokens land in `backend/data/tokens.json`.

4. **Run in Docker**
  ```bash
  docker compose up --build
  ```
   The API listens on `http://localhost:3000` and persists `backend/data/keywords.json` plus the OAuth token store via a bind
   mount. Use your public URL (with TLS termination) to open `/auth/login` and connect Pages when running this way.

## How the webhook handler behaves
- **GET /webhook** performs Meta verification using `VERIFY_TOKEN`.
- **POST /webhook** expects a Graph API payload. For each `change` containing comment text it:
  1. Loads global + post-specific keyword configs.
  2. Fuzzy-matches the comment text against keyword variants (case-insensitive, one-character typo tolerance).
  3. Picks a random template for the public comment reply and DM reply, replacing `{{keyword}}` and `{{resourceUrl}}` placeholders.
  4. Calls the Graph API to post the reply and send the DM using the Page token looked up in `backend/data/tokens.json` (one entry per connected Page).

## Scheduling + post IDs
You can preconfigure scheduled content by adding the **post ID** before it goes live:
- **Facebook scheduled posts**: query `/{page-id}/scheduled_posts?fields=id,published,scheduled_publish_time` with your Page token.
- **Instagram scheduled posts**: create scheduled media via `/{ig-user-id}/media` with `publish_at` and capture the returned `id`.
Add those IDs under `posts` in `keywords.json` so matching works the moment comments arrive.

## Operational tips
- Use a reverse proxy/HTTPS terminator on your NAS (Traefik/Caddy/Nginx) to expose `/webhook` publicly.
- Regenerate long-lived Page tokens periodically (Meta tokens expire) by revisiting `/auth/login`; the service will refresh the entry in `backend/data/tokens.json`.
- For Messenger DMs, ensure the Page has the **messaging** product and the user has messaged the Page before (platform requirement).
- Logs are JSON lines; pipe them to `jq` for readability during debugging.

## Minimal test
A small smoke check ensures the config files load:
```bash
cd backend
npm test
```
