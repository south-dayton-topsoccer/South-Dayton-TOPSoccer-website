# Short URL Setup — coaches.southdaytontopsoccer.com

*Make a short, branded web address that automatically forwards to the coach app. Cloudflare, click-by-click. No prior Cloudflare knowledge assumed.*

**What you're building:** a tidy address — `coaches.southdaytontopsoccer.com` — that quietly forwards anyone who visits it to the long Google app link. It's two small jobs: (1) tell Cloudflare the new name exists, (2) tell Cloudflare where to forward it.

**Have this ready** (the long app link — you'll paste it once):

```
https://script.google.com/macros/s/AKfycbyB-RO38fqG8dI7jRYbIucZMOc3bXxYjYKB5pQ_sh-q/exec
```

---

## Step 0 — Sign in to Cloudflare

1. Open a new browser tab and go to **`dash.cloudflare.com`**.
2. Sign in with the **SDTSAdmin** account you used when you set up the website.
3. After signing in, you land on a page that lists your website(s). Cloudflare calls each website a **"zone"** — it just means a domain you manage.
4. In that list, **click the blue text `southdaytontopsoccer.com`**. This opens the control panel for *just* that domain. Everything below happens inside here.

---

## Step 1 — Register the new name (a DNS record)

This step is like adding `coaches` to the phone book so the internet knows it exists.

1. Look at the **menu running down the left side** of the screen. Click **DNS**. If a sub-list appears under it, click **Records**.
2. You'll see a **table of existing entries** (rows with columns like Type, Name, Content). Near the top of that table, click the blue **+ Add record** button.
3. A small form drops down. Fill it in **exactly** like this:
   - **Type:** click the dropdown and choose **`AAAA`**
   - **Name:** type just the word **`coaches`** (Cloudflare adds `.southdaytontopsoccer.com` for you)
   - **IPv6 address:** type **`100::`** (the number one, then two zeros, then colon-colon). Nothing is really hosted there — it's a placeholder Cloudflare expects for forwards.
   - **Proxy status:** there's a little **cloud icon** next to a toggle. It must be an **orange cloud that says "Proxied."** If it's a grey cloud ("DNS only"), **click it to turn it orange.** ← this part is essential; the forward won't work on grey.
   - **TTL:** leave it on **Auto**.
4. Click **Save**.
5. You should now see a new row in the table: **coaches**, with an **orange cloud**. ✓

---

## Step 2 — Tell it where to forward (a Redirect Rule)

1. Back in the **left-side menu**, click **Rules**. (It may expand into a few choices.)
2. Click **Redirect Rules**. (On some screens it's shown inside a "Rules" overview page — look for the words "Redirect Rules" and an associated **Create** button.)
3. Click **Create rule**. If it asks what type, choose **Single Redirect**.
4. **Rule name:** type something like **`Coaches app`**.
5. Find the section titled **"When incoming requests match…"** It has a few dropdowns in a row. Set them:
   - **Field** (first dropdown): choose **`Hostname`**
   - **Operator** (second dropdown): choose **`equals`**
   - **Value** (the box): type **`coaches.southdaytontopsoccer.com`**

   *If instead you only see a single box labeled **"Custom filter expression,"** paste this into it:*
   ```
   http.host eq "coaches.southdaytontopsoccer.com"
   ```
6. Find the next section, **"Then…"** (sometimes "URL redirect"). Set:
   - **Type:** choose **`Static`**
   - **URL:** paste the **long app link** from the top of this page (the one ending in `/exec`)
   - **Status code:** choose **`302`** (this means "temporary forward" — the right choice here)
   - **Preserve query string:** leave it **unchecked / off**
7. Click **Deploy** (or **Save**) at the bottom.

---

## Step 3 — Test it

1. Wait about **one minute** after deploying.
2. Open a new browser tab and go to **`https://coaches.southdaytontopsoccer.com`**.
3. It should jump to the Google sign-in, then to your **password screen**. That means it worked.
4. *If you get a security / certificate warning the very first time,* don't worry — wait **3–5 minutes** (Cloudflare is creating the security certificate for the new name) and try again.

---

## Step 4 — Start using it

- Hand out **`coaches.southdaytontopsoccer.com`** instead of the long Google link.
- Want a **QR code** for it? Just ask — I'll generate one you can print.
- This short address is now **permanent**. If the Google link ever changes down the road, you only edit the **URL** box back in Step 2 — and every QR code and bookmark keeps working. Nothing to reprint.

---

### Two things that are normal (not mistakes)

- **After it forwards, your browser's address bar shows the long Google address again.** That's expected — this is a forward, not a disguise. People only ever *type/scan* the short one.
- **There's no `www`** — the address is just `coaches.southdaytontopsoccer.com`.
