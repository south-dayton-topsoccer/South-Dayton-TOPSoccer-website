# Phase 1 — Setup & Test

Three files make up Phase 1:

- **Membership Config — SEED (import to Google Sheets).xlsx** — your dedicated config file, pre-seeded.
- **Membership Import — Code.gs** — the import script (Version 0.1).
- *(this guide)*

Everything below happens under **SDTSAdmin**. Nothing touches live data until the test step, and even then it only writes new `Raw_*` / `Annotations` tabs.

---

## 1 · Create the dedicated Config sheet

1. In SDTSAdmin's Google Drive, **New → File upload** → the SEED `.xlsx`.
2. Right-click it → **Open with → Google Sheets**, then **File → Save as Google Sheets** (gives you a native Sheet). You can delete the uploaded `.xlsx` after.
3. Copy this new sheet's **ID** from its URL (`/spreadsheets/d/`**`THIS_PART`**`/edit`) — you'll paste it into the script in step 3.
4. On the single **Config** tab, fill the two blank Value cells (marked ◄):
   - `drop_folder_id` → (next step)
   - `coach_passcode` → leave blank for now (used later)

This file has **one tab** and is **standalone** — no link to the website config, by design.

## 2 · Create the Drop folder

1. In SDTSAdmin's Drive, make a folder, e.g. **GotSport Drop**.
2. Copy its ID (from the folder URL) into Settings → `drop_folder_id`.

## 3 · Add the script to the registration workbook

1. Open the **registration workbook** (`2025 registration - raw data`, already SDTSAdmin-owned).
2. **Extensions → Apps Script**. Add a file, paste in **Membership Import — Code.gs**.
3. At the top, set `CONFIG_SHEET_ID` to the Config sheet ID from step 1.3. **Save.**
4. Reload the workbook — a **TOPSoccer** menu appears.

## 4 · Test against the 2025 export

1. **TOPSoccer → Show Config check** → authorize when prompted. You should see "Config loaded ✓" with the field counts.
2. Drop your `program-registrations-…csv` into the **GotSport Drop** folder.
3. **TOPSoccer → Import Latest Download.**

**Expected result:**

- A **`Raw`** tab written verbatim — **144 rows × 76 columns**.
- An **`Annotations`** tab with **144 rows**, one per Registration ID, sticky columns blank.
- The CSV moved into an **`Imported`** subfolder.

Re-run it (drop the same file again) and confirm: Raw is replaced, but **Annotations stays at 144 with nothing wiped** — that's the stickiness working.

---

## What's proven once this passes

The whole foundation: config-driven column mapping, verbatim Raw import, and the sticky Annotations layer keyed by Registration ID. From here, Phase 2 hardens the import (coach routing, validation), Phase 3 migrates the player-search app onto Annotations, and Phases 4–6 build the reports, web app, and reassignment.

*(Already validated in simulation against your real 2025 file: reg_id resolves, 144 unique annotation rows, shirt size resolved 143/144, mailable addresses 135/144.)*
