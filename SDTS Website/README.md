# South Dayton TOPSoccer — website

A fast, mobile-friendly single-page site whose **content is driven by a Google Sheet**. Volunteers edit the Sheet; the site updates within a few minutes. Nobody touches code.

- **Source / hosting:** GitHub repo (under the org account `SDTSAdmin@gmail.com`) → Cloudflare Pages.
- **Content:** a Google Sheet ("SDTS Site Config") published read-only; the site reads it live in the browser.
- **Falls back** to built-in sample content if the Sheet isn't connected yet, so the page never looks broken.

> Ownership rule: everything (GitHub, Cloudflare, domain, the config Sheet) lives under the org account, never a personal account.

---

## Files

| File | What it is | How often you touch it |
|------|------------|------------------------|
| `index.html` | Page structure | Rarely |
| `styles.css` | Look & feel (colors at the top) | Rarely |
| `app.js` | Reads the Sheet and fills the page | Never |
| `config.js` | **One line:** your Google Sheet ID | Once |

---

## Step 1 — Build the config Google Sheet

**Shortcut:** a ready-made template is included — **`SDTS Site Config (import to Google Sheets).xlsx`**. Sign in as `SDTSAdmin@gmail.com`, create a new Google Sheet, then **File → Import → Upload** that file (Replace spreadsheet). All tabs, headers, and sample content come pre-built. Otherwise, build the tabs by hand as below.

Tabs (header row names matter; row order doesn't):

### Tab: `Config` (two columns: `Key`, `Value`)
One row per setting. Edit the Value column anytime.

| Key | Example value |
|-----|----------------|
| org_name | South Dayton TOPSoccer |
| tagline | The Outreach Program for Soccer |
| hero_headline | Soccer for every child and young adult. |
| hero_subtext | An all-volunteer program for kids and adults with disabilities… |
| hotline_phone | (937) 815-1548 |
| contact_email | SDTSAdmin@gmail.com |
| registration_open | TRUE  *(or FALSE to hide the Register button)* |
| registration_url | https://link-to-your-signup |
| registration_window | Registration runs mid-July through early August. |
| volunteer_url | https://link-to-volunteer (optional) |
| donate_url | https://link-to-donate (optional) |
| facebook_url | https://facebook.com/… (optional) |
| instagram_url | https://instagram.com/… (optional) |
| season_info | Season runs Aug–Oct, Wed evenings & Sun afternoons at Oak Grove Park. |
| about_text | TOPSoccer is a national US Youth Soccer program… |
| location_name | Oak Grove Park |
| location_address | Centerville, OH |
| location_maps_url | https://www.google.com/maps/search/?api=1&query=Oak+Grove+Park+Centerville+OH |
| photos_url | https://photos.google.com/… |
| mailing_address | South Dayton TOPSoccer, P.O. Box 750252, Dayton, OH 45475 |
| donate_text | Make checks payable to South Dayton TOPSoccer… |
| **alert_active** | FALSE  *(set TRUE for a rain-out / field-closing banner)* |
| **alert_message** | Fields closed tonight (6/25) due to weather. |
| announcement | (leave blank to hide the announcement card) |

### Tab: `Stats` (columns: `Number`, `Label`)
The impact band. e.g. `150+` / `Athletes each year`.

### Tab: `Schedule` (columns: `Date`, `Event`, `Time`, `Location`, `Notes`)

### Tab: `FAQs` (columns: `Question`, `Answer`)

### Tab: `Sponsors` (columns: `Name`, `URL`, `Level`)

### Tab: `Contacts` (columns: `Name`, `Role`, `Email`, `Phone`)

### Tab: `Photos` (columns: `Image`, `Caption`)
The on-page gallery. Paste a **shareable Google Drive image link** (or any direct image URL) into `Image`; the site converts Drive links automatically. To get one: in Drive, right-click the photo → **Share → "Anyone with the link"** → Copy link. `Caption` is optional. Add a row = add a photo.

> The two most-used controls day to day are **alert_active / alert_message** (turn the weather banner on/off) and **Schedule**.

---

## Step 2 — Publish the Sheet (read-only)

1. In the Sheet: **Share → General access → "Anyone with the link: Viewer."**
2. Copy the Sheet ID from the URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.
3. Open `config.js`, paste it into the `SHEET_ID: ''` line, save.

The site reads published cells with a short Google cache (~5 min), so edits appear within a few minutes.

---

## Step 3 — Put it on GitHub (org account)

1. Sign in to GitHub as **`SDTSAdmin@gmail.com`** (a separate account from any personal one).
2. Create a new repository, e.g. `southdaytontopsoccer`.
3. Add these four files (`index.html`, `styles.css`, `app.js`, `config.js`) — drag-and-drop in the browser is fine. (`README.md` optional.)

> This is its own repo on its own account — completely separate from any other GitHub project.

---

## Step 4 — Host on Cloudflare Pages

1. Sign in to Cloudflare as `SDTSAdmin@gmail.com`.
2. **Workers & Pages → Create → Pages → Connect to Git**, pick the `southdaytontopsoccer` repo.
3. Framework preset: **None.** Build command: *(blank)*. Output directory: `/` (root). Deploy.
4. You get a free `your-project.pages.dev` URL to preview immediately.
5. Every time you change a file in the repo, Cloudflare re-deploys automatically.

---

## Step 5 — Point the domain

1. Get the **domain unlock + EPP/authorization code** from the current host (Kris) before starting.
2. Add `southdaytontopsoccer.com` to Cloudflare (it scans existing DNS) and switch the nameservers at the current registrar to Cloudflare's. Optionally transfer the registration into **Cloudflare Registrar**.
3. In the Pages project → **Custom domains → add `southdaytontopsoccer.com`** (and `www`). Cloudflare wires up DNS + SSL.
4. Once it resolves, retire the old hosting.

---

## Fonts & design note

The design is an original build inspired by common modern web layouts — none of any third-party site's code, images, logos, or text is used. Body type uses the visitor's own system font (San Francisco on Apple devices) via `-apple-system`, falling back to **Inter**, which is free under the SIL Open Font License. No licensed fonts are bundled or served, so there's nothing to license. (When you add real **sponsor logos**, just confirm the sponsors are OK with you displaying them — standard practice.)

## Local preview

Open `index.html` in a browser. With `SHEET_ID` blank it renders the built-in sample content. (For the live Sheet fetch to work you'll want it served over http — Cloudflare Pages or any local static server — but the sample view works straight from the file.)
