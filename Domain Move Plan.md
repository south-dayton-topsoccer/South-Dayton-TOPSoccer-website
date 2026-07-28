# South Dayton TOPSoccer — Domain Move & Site Cutover Plan

**Goal:** Move `southdaytontopsoccer.com` off Kris Arquilla's server and onto Cloudflare (under the **SDTSAdmin@gmail.com** org account), and point it at the new site already live at `https://south-dayton-topsoccer-website.pages.dev`.

**Status as of 2026-06-24:** New site built and live on Cloudflare Pages. Only the domain remains to be moved.

---

## The deadline (read this first)

Kris's shutdown notice went out **June 5, 2026** with a **30-day window → ~July 5, 2026**. That's about **11 days**. After that her server (and the current DNS + any domain email) can go offline. The **domain registration itself** is the asset we must get out of her account before then.

## What the live lookups show (2026-06-24)

- **Nameservers:** `ns1.hostingbusinesses.com` / `ns2.hostingbusinesses.com` — Kris's hosting/registrar platform. *DNS is controlled there.*
- **Mail (MX):** the domain points mail back at its own server on Kris's box → **any `@southdaytontopsoccer.com` email addresses live on her server** and will stop working when she shuts down.
- **Registrar of record:** to be confirmed (a reseller on the hostingbusinesses.com platform) — ask Kris, or read it off the transfer paperwork.

## What we do NOT need

- ❌ SetraHost — Kris's suggested host. We're using Cloudflare instead.
- ❌ The cPanel login / migrating the old FrontPage site — the new site replaces it. (Creds intentionally not stored.)
- The **only** thing we need from Kris is the **domain** (unlock + auth code), plus a nameserver change or registrar login.

---

## The plan

### Phase 0 — Do now, no waiting (Dean / SDTSAdmin)
1. Confirm you're logged into Cloudflare as **SDTSAdmin@gmail.com** (the Pages project already lives there).
2. In Cloudflare: **Add a site** → `southdaytontopsoccer.com` → choose the **Free** plan. Cloudflare scans the existing DNS and imports what it can.
3. **Review the imported DNS records.** Make sure anything still needed is present (especially MX/email — see Phase 3). Don't delete unknown records yet.
4. Cloudflare shows you **two assigned nameservers** (e.g. `xxx.ns.cloudflare.com`). **Copy these** — they go in the message to Kris.

### Phase 1 — The critical-path ask to Kris (today, via Jess)
Everything else waits on this. Send Kris one message requesting:
1. **Unlock** `southdaytontopsoccer.com` for transfer.
2. The **EPP / authorization (auth) code**.
3. The **current registrar name** (the company the domain is registered through).
4. The **registrant email on file** (transfer-approval emails go there — we need it reachable).
5. Either **change the nameservers** to the two Cloudflare values we provide, **or** give temporary registrar login so we can.
6. Confirm whether any **`@southdaytontopsoccer.com` email addresses** are actively used (so we don't lose mail).

*(Draft message is in `Domain Move — Message to Kris.md`.)*

### Phase 2 — Move DNS to Cloudflare (frees you from Kris's server)
Once Kris points the nameservers to Cloudflare (or we do it via registrar login):
- Wait for Cloudflare to show the zone as **Active** (usually minutes to a few hours).
- From this point Cloudflare controls DNS — **the new site can go live on the real domain even before the registration transfer finishes.**

### Phase 3 — Email continuity (if any `@domain` addresses are in use)
- Set up **Cloudflare Email Routing** (free, forward-only): forward e.g. `info@southdaytontopsoccer.com` → a Gmail inbox (SDTSAdmin or wherever).
- If no domain email is actually used, skip this and remove the self-pointing MX record.

### Phase 4 — Wire the domain to the new site
- Cloudflare → **Pages** → your project → **Custom domains** → add `southdaytontopsoccer.com` **and** `www.southdaytontopsoccer.com`.
- Cloudflare auto-creates the records and issues the **SSL certificate**.
- Add a redirect so `www` → apex (or apex → `www`), your choice, for one canonical address.

### Phase 5 — Transfer the registration into Cloudflare Registrar
- With the nameservers already on Cloudflare (Phase 2), Cloudflare lets you **transfer the registration in**.
- Cloudflare → **Registrar / Domain Registration** → **Transfer Domains** → enter the **auth code** → pay ~**1 year at cost (~$10–11)** → approve.
- Takes **5–7 days**; the site stays up the whole time because DNS is already on Cloudflare.

### Phase 6 — Verify, update links, decommission
- Test `https://southdaytontopsoccer.com` and `https://www.…` → new site loads, padlock valid.
- **Fix old page links in the Config sheet:** `registration_url`, `volunteer_url`, and any links pointing at `…southdaytontopsoccer.com/signup.html`, `/volunteer.html`, etc. Those old pages don't exist on the new single-page site — point them at the right section anchor or the real registration form.
- Once the domain resolves to the new site and email forwarding works, tell Kris she's **clear to shut down** — you're no longer dependent on her server.

---

## Risks / watch-items
- **60-day transfer lock:** ICANN blocks transfers within 60 days of a registration or prior transfer. The domain's been around since ~2013, so this should be fine — but confirm it wasn't recently transferred/renewed-as-transfer.
- **Approval emails:** the transfer release may require approval at the **registrant email on file** (could be Kris or an old address). That's why we ask her to confirm it / be ready to approve.
- **Don't lose MX:** capture/recreate email routing before the old server dies.
- **Timing:** Phases 0, 2 and 4 can be done within a day of Kris acting — that gets the live site on the real domain well before July 5. The registration transfer (Phase 5) can finish afterward without downtime.

## Fallback if Kris will only give the auth code (won't touch nameservers)
Cloudflare Registrar requires the domain be on Cloudflare DNS *before* transfer-in. If Kris won't change nameservers and won't give login, transfer the registration to **Porkbun** or **Namecheap** (they accept auth-code-only transfers), then move nameservers to Cloudflare from the new registrar's panel, and optionally move the registration to Cloudflare later (after the 60-day post-transfer lock).
