# Reply to Kris (ready to send)

Subject: Re: Hi Nancy, it's Kris Arquilla

---

Hi Kris,

Thank you so much — that's a big help, and I've got the authorization code.

One quick note so we don't cross wires: we've decided to host the site on **Cloudflare** rather than SetraHost, and our new site is already built and ready. So we won't be signing up for SetraHost or doing the cPanel "Migration" — no need on your end for any of that.

The **one thing** we need from you to go live is to repoint the domain's nameservers. For **southdaytontopsoccer.com**, please replace the current nameservers —

- `ns1.hostingbusinesses.com`
- `ns2.hostingbusinesses.com`

— with these two (copied exactly):

- `pam.ns.cloudflare.com`
- `wesley.ns.cloudflare.com`

And if **DNSSEC** (sometimes shown as "DS records") is turned on for the domain, please turn it off — otherwise the site can break when the nameservers change.

Once that's done, our new site goes live on the domain, and we'll use the authorization code you sent to move the registration over to our account afterward.

Last thing — are there any **email addresses** on `@southdaytontopsoccer.com` currently in use? We want to make sure we don't drop anyone's mail when your server goes offline.

(If it's easier, you're also welcome to share registrar login and we'll make the nameserver change ourselves.)

Thank you again — we really appreciate it, and we hope Jim is healing well.

~Dean
