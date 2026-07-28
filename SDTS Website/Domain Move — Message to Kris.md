# Message to Kris (ready to send — send via Jess, or Jess forwards)

Subject: South Dayton TOPSoccer — moving the domain to Cloudflare

---

Hi Kris,

Thank you again for all the years of help, and for the heads-up about the move. We've moved the South Dayton TOPSoccer website to Cloudflare and now need to point the **domain** there too, under the program's own account. For **southdaytontopsoccer.com**, could you please help us with these:

1. **Point the domain's nameservers to Cloudflare.** Replace the current nameservers —
   - `ns1.hostingbusinesses.com`
   - `ns2.hostingbusinesses.com`

   — with these two (copied exactly):
   - `pam.ns.cloudflare.com`
   - `wesley.ns.cloudflare.com`

2. If **DNSSEC** (sometimes shown as "DS records") is turned on for the domain, please **turn it off** — otherwise the site can break when the nameservers change.

3. So we can also move the registration to the program's account, please **unlock** the domain for transfer and send us the **EPP / authorization (auth) code**.

4. Let us know the **registrar** the domain is registered through, and the **registrant email address on file** (so the transfer-approval message reaches us).

5. Lastly — are there any **email addresses** on `@southdaytontopsoccer.com` currently in use? We want to make sure we don't drop anyone's email when the server goes offline.

(Or, if it's easier for you, you're welcome to share registrar login and we'll make the nameserver/DNSSEC changes ourselves.)

We really appreciate it, and we hope Jim is healing well.

Thank you!
~Jess

---

**Note:** Items 1–2 are what bring the new site live on the real domain — those are the time-sensitive ones. Items 3–4 are for moving the registration afterward and aren't urgent.
