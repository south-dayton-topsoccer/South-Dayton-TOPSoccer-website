# TOPSoccer Registration — Ownership Transfer to SDTSAdmin

**Goal:** Move the active TOPSoccer registration assets off your personal **dheyne@gmail.com** and onto the org account **SDTSAdmin@gmail.com**, so nothing critical stays tangled with your personal identity (same rule you applied to the website and domain).

**Status as of this guide (2026-06-27):** Every file below is owned *solely* by dheyne@gmail.com and not yet shared with anyone. Clean starting point.

---

## What's moving

**Active — in scope:**

| # | File | Type | ID |
|---|------|------|-----|
| 1 | 2025 registration - raw data | Google Sheet (+ bound player-search app "SOCCER Raw") | `1PZI-TwfDfVVxBrq37eEzdwKJ4gpRvTInyDF_x9PB1WI` |
| 2 | 2025 registration - raw data.xlsx | Uploaded Excel (backup) | `1_Mx7uQHByhFIBownZ1dB-IGzOXfQuw-U` |
| 3 | 2025 MASTER TOP Soccer Database for Dean | Google Sheet | `1OK08E4NwwgCO2apBdJLDvW4fhxna1vbgoTuHigvM2dg` |
| 4 | 2025 MASTER TOP Soccer Database for Dean.xlsm | Uploaded Excel (macro) | `1TGByGSoLDfcJHTlJgKSVKLjDxLpuJm6T` |

**Optional — legacy personal history (leave unless you want them gone):** old "TOP Soccer" Forms/Sheets from 2011–2019, "11 top soccer database", "2018 MASTER TOP Soccer Database", "Brody's Soccer". None feed the live tools.

**Not in Drive:** the QR-code PNG lives in the Cowork project folder, not Drive. It gets **regenerated** after the web app is redeployed (Part D), so there's nothing to transfer.

---

## Three things to know before you start

1. **"Make owner" only works on native Google files.** Items **1** and **3** (Google Sheets) transfer cleanly. Items **2** and **4** (uploaded .xlsx/.xlsm) **cannot** have ownership transferred between two personal Gmail accounts — Google greys out the option. For those you recreate them under SDTSAdmin (Part C). They're just backups, so this is low-stakes.

2. **The player-search web app needs a fresh deployment, and that changes the volunteer URL.** Ownership of the bound script moves *with* the Sheet, but the live `/exec` deployment was authorized as you. SDTSAdmin must create a **new deployment** → new `/exec` URL → **regenerate the QR code** → redistribute. Plan for this; don't let it surprise you mid-season.

3. **Folders can't be ownership-transferred to a consumer account either.** So we don't move a folder — we transfer the files, then (optionally) SDTSAdmin drops them into a folder *it* owns for tidiness.

**Timing:** Do this now (late June), before fall registration ramps mid-July. You do *not* want to be swapping the volunteer URL during the signup rush.

---

## Part A — Prep (5 min)

1. Be signed into **both** accounts in the same browser (Chrome profiles or just `Add account`). You'll bounce between them.
2. In **SDTSAdmin@gmail.com**'s Drive, create a destination folder, e.g. **`TOP Soccer — Registration`**. (Optional but recommended — gives the transferred files a clean home.)
3. Keep this guide open so you can copy the file IDs/links above.

---

## Part B — Transfer the two Google Sheets (the important part)

Do this for **File 1 (registration)** and **File 3 (MASTER native)**. Steps are identical.

1. Signed in as **dheyne@gmail.com**, open the Sheet.
2. Click **Share** (top right).
3. Type `SDTSAdmin@gmail.com`, set role to **Editor**, and send/share. (Uncheck "Notify people" if you like — you control both inboxes.)
4. Re-open **Share**. SDTSAdmin now appears in the list. Click the **role dropdown** next to it → choose **Transfer ownership** (may read "Make owner").
5. Confirm. Google sends an ownership-transfer **invitation** to SDTSAdmin.
6. Switch to **SDTSAdmin@gmail.com** → open the email (or the file's Share dialog) → **Accept** the ownership transfer.
7. Done — SDTSAdmin is now **Owner**; you (dheyne) automatically drop to **Editor**. *Leave yourself as Editor* so you can still help maintain it.
8. As SDTSAdmin, drag the file into the **`TOP Soccer — Registration`** folder (optional tidy-up).

> ✅ When you transfer **File 1**, the bound Apps Script project ("SOCCER Raw" — the player-search app) travels with it automatically. You'll re-deploy it in Part D.

---

## Part C — Re-home the two Excel backups (optional, low-stakes)

Items **2** and **4** can't be ownership-transferred. Easiest fix — recreate them under SDTSAdmin:

1. Signed in as **dheyne**, **Share** each .xlsx/.xlsm with `SDTSAdmin@gmail.com` as **Viewer** (or Editor).
2. Switch to **SDTSAdmin** → open each file's location → right-click → **Make a copy** (or download then re-upload). The **copy is owned by SDTSAdmin**.
3. Move the copies into the `TOP Soccer — Registration` folder; delete the SDTSAdmin-owned duplicates' "Copy of" prefix if you care.
4. Once confirmed, you can delete the originals from your personal Drive (they're backups of the live Sheet anyway).

*If you'd rather not bother:* these are just point-in-time exports. You can simply delete them from your Drive and let the live Sheet (now SDTSAdmin-owned) be the single source of truth.

---

## Part D — Redeploy the player-search web app under SDTSAdmin

This is what makes volunteers' search tool run as the org account instead of you.

1. Signed in as **SDTSAdmin**, open **File 1** (registration Sheet) → **Extensions ▸ Apps Script**. You should see the **SOCCER Raw** project (`SearchDemo_Code.gs` + `Index.html`).
2. Run any function once (e.g. open the editor, pick a function, **Run**) and **authorize** the scopes when prompted — this re-grants the read/write + PDF permissions under SDTSAdmin.
3. **Deploy ▸ New deployment** → type **Web app**:
   - **Execute as:** Me (**SDTSAdmin@gmail.com**)
   - **Who has access:** Anyone with a Google account
   - **Deploy** → copy the **new `/exec` URL**.
4. **Regenerate the QR code** for the new URL (any QR generator, or ask me — I'll produce a fresh PNG into the project folder).
5. **Distribute** the new URL/QR to volunteers and replace any printed copies. Retire the old URL.
6. *(Optional cleanup)* Back as **dheyne**, you can later **revoke** the old deployment's access from your Google Account ▸ Security ▸ Third-party access, once you've confirmed the new one works.

> The old `/exec` may keep working (executing as you) until revoked — that's your safety net. Verify the new URL fully works *before* you retire the old one.

---

## Part E — Verify & wrap up

- [ ] File 1 (registration Sheet) shows **Owner: SDTSAdmin**, you = Editor
- [ ] File 3 (MASTER native) shows **Owner: SDTSAdmin**, you = Editor
- [ ] Bound player-search app redeployed; **new `/exec` URL works** when signed in as a test volunteer (or incognito with a Google account)
- [ ] New **QR code** generated and distributed; old one retired
- [ ] Excel backups re-homed or deleted (Part C)
- [ ] Files tucked into the SDTSAdmin **`TOP Soccer — Registration`** folder
- [ ] (Later, optional) old deployment access revoked from your personal account

After this, the whole registration/membership stack — like the website and domain — lives under **SDTSAdmin@gmail.com** and survives volunteer turnover.

---

### Quick reference — file links

- Registration Sheet: https://docs.google.com/spreadsheets/d/1PZI-TwfDfVVxBrq37eEzdwKJ4gpRvTInyDF_x9PB1WI/edit
- MASTER (native): https://docs.google.com/spreadsheets/d/1OK08E4NwwgCO2apBdJLDvW4fhxna1vbgoTuHigvM2dg/edit
- registration .xlsx: https://drive.google.com/file/d/1_Mx7uQHByhFIBownZ1dB-IGzOXfQuw-U/view
- MASTER .xlsm: https://drive.google.com/file/d/1TGByGSoLDfcJHTlJgKSVKLjDxLpuJm6T/view
