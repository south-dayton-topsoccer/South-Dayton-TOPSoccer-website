/* South Dayton TOPSoccer — renderer · Version: 1.19
   Pulls content from the Google Sheet named in config.js (live), and
   falls back to the built-in SAMPLE content if the sheet isn't set or
   can't be reached. You should not need to edit this file. */

(function () {
  'use strict';

  var CFG = window.SDTS_CONFIG || {};
  var TABS = CFG.TABS || {};

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function setText(id, val) { var el = $(id); if (el) el.textContent = (val == null ? '' : String(val)); }
  function setHTML(id, html) { var el = $(id); if (el) el.innerHTML = html; }
  function truthy(v) { return /^(true|yes|on|1)$/i.test(String(v == null ? '' : v).trim()); }
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // Turn *word* into an italic emphasis span (for headlines). Escapes first.
  function emphasize(s) {
    return esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }
  // Turn a markdown link [text](https://…) into a real link; a whole-cell URL
  // also becomes a link. Escapes first, so it's safe. Used for Location/Notes.
  // Forgiving on purpose: a volunteer typing the link may drop a parenthesis,
  // so we accept [text](url), [text]url, [text](url, and [text] url too.
  function linkify(s) {
    s = esc(String(s == null ? '' : s)).trim();
    if (!s) return '';
    if (/^https?:\/\/\S+$/.test(s)) return '<a href="' + s + '" target="_blank" rel="noopener">' + s + '</a>';
    return s.replace(/\[([^\]]+)\]\s*\(?\s*(https?:\/\/[^\s)]+)\)?/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  // Normalize a link the way a volunteer might type it: add https:// if the
  // scheme is missing, so "recipes.deanheyne.org" becomes a real external link.
  function extUrl(u) {
    u = String(u == null ? '' : u).trim();
    if (!u) return '';
    return /^(https?:|mailto:|tel:)/i.test(u) ? u : 'https://' + u;
  }

  // Parse a schedule "Date" cell like "Sun, Aug 16" into a Date (year supplied
  // separately since the cell has no year). Returns null if unparseable.
  var SCHED_MON = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  function schedDate_(str, year) {
    var s = String(str || '');
    var m = s.toLowerCase()
      .match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})/);
    if (!m) return null;
    var mon = SCHED_MON[m[1].slice(0, 3)];
    if (mon == null) return null;
    var ym = s.match(/\b(20\d\d)\b/);              // use a year in the cell if present
    return new Date(ym ? +ym[1] : year, mon, parseInt(m[2], 10));
  }

  // Make an <img>-friendly URL. Converts a Google Drive share link or file ID
  // into a direct image URL. Returns '' for things that can't be embedded
  // (blank, helper text with spaces, or Google Photos album links) so the
  // gallery silently skips them instead of showing a broken tile.
  function imgUrl(u) {
    u = String(u == null ? '' : u).trim();
    if (!u || /\s/.test(u)) return '';                       // blank or prose (e.g. a tip)
    if (/photos\.app\.goo\.gl|photos\.google\.com/i.test(u)) return ''; // album link ≠ image
    var m = u.match(/\/d\/([A-Za-z0-9_-]{20,})/) || u.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1200';
    if (/^[A-Za-z0-9_-]{25,}$/.test(u)) return 'https://drive.google.com/thumbnail?id=' + u + '&sz=w1200';
    if (/^https?:\/\//i.test(u)) return u;                   // direct image URL
    if (u.indexOf('.') !== -1) return 'https://' + u;        // bare domain/path
    return '';
  }

  // Parse a Google Sheets gviz response into an array of row objects keyed by header label.
  function parseGviz(text) {
    var json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
    var cols = (json.table.cols || []).map(function (c, i) { return (c.label || c.id || ('col' + i)).trim(); });
    return (json.table.rows || []).map(function (r) {
      var obj = {};
      (r.c || []).forEach(function (cell, i) {
        var key = cols[i] || ('col' + i);
        obj[key] = cell ? (cell.f != null ? cell.f : cell.v) : '';
        if (obj[key] == null) obj[key] = '';
        // If the cell is a real date, keep its true value (year included) so
        // we never have to guess the year. gviz raw looks like "Date(2026,7,16)".
        if (cell && cell.v != null) {
          var dm = String(cell.v).match(/^Date\((\d+),(\d+),(\d+)/);
          if (dm) obj[key + '__d'] = new Date(+dm[1], +dm[2], +dm[3]).getTime();
        }
      });
      return obj;
    });
  }

  function fetchTab(tab) {
    var url = 'https://docs.google.com/spreadsheets/d/' + CFG.SHEET_ID +
              '/gviz/tq?tqx=out:json&headers=1&sheet=' + encodeURIComponent(tab);
    return fetch(url).then(function (res) { return res.text(); }).then(parseGviz);
  }

  // Config tab is Key/Value pairs -> object
  function rowsToConfig(rows) {
    var o = {};
    rows.forEach(function (r) {
      var k = (r.Key || r.key || '').toString().trim();
      if (k) o[k] = (r.Value != null ? r.Value : r.value);
    });
    return o;
  }

  // ---------- load ----------
  function load() {
    var S = CFG.SAMPLE || {};
    if (!CFG.SHEET_ID) { return Promise.resolve(S); }   // preview mode

    return Promise.all([
      fetchTab(TABS.config).then(rowsToConfig).catch(function () { return S.config; }),
      fetchTab(TABS.stats).catch(function () { return S.stats; }),
      fetchTab(TABS.schedule).catch(function () { return S.schedule; }),
      fetchTab(TABS.faqs).catch(function () { return S.faqs; }),
      fetchTab(TABS.sponsors).catch(function () { return S.sponsors; }),
      fetchTab(TABS.contacts).catch(function () { return S.contacts; }),
      fetchTab(TABS.photos).catch(function () { return S.photos; }),
      // Volunteers: when live, if the tab is missing/empty show nothing (don't
      // fall back to the sample teams — those would be fake names on the site).
      fetchTab(TABS.volunteers).catch(function () { return []; })
    ]).then(function (a) {
      var cfg = (a[0] && a[0].org_name) ? a[0] : S.config;   // empty/blocked sheet -> sample
      var nz = function (arr, fb) { return (arr && arr.length) ? arr : fb; };
      return { config: cfg,
               stats: nz(a[1], S.stats), schedule: nz(a[2], S.schedule),
               faqs: nz(a[3], S.faqs), sponsors: nz(a[4], S.sponsors),
               contacts: nz(a[5], S.contacts), photos: nz(a[6], S.photos),
               volunteers: (a[7] && a[7].length) ? a[7] : [] };
    }).catch(function () { return S; });
  }

  // ---------- render ----------
  function render(data) {
    var c = data.config || {};

    // Alert banner (field closings / weather)
    if (truthy(c.alert_active) && c.alert_message) {
      setText('alert-text', c.alert_message);
      var ab = $('alert-banner'); if (ab) ab.hidden = false;
    }

    // Announcement card
    if (c.announcement) {
      setText('announcement-text', c.announcement);
      var an = $('announcement'); if (an) an.hidden = false;
    }

    // Brand + hero
    setText('brand-name', c.org_name);
    setText('tagline', c.tagline);

    // Logo: use a custom logo image from the sheet if set, else the built-in
    // ball mark. A custom logo usually contains the name, so hide the text.
    var brandLogo = $('brand-logo'), brandName = $('brand-name');
    var logoH = parseInt(c.logo_height, 10);
    if (!logoH || logoH < 16 || logoH > 400) logoH = c.logo_url ? 48 : 30;
    if (brandLogo) {
      if (c.logo_url) {
        brandLogo.src = imgUrl(c.logo_url);
        if (brandName) brandName.hidden = true;
      } else if (brandName) {
        brandName.hidden = false;
      }
      brandLogo.style.height = logoH + 'px';
    }
    setHTML('hero-headline', emphasize(c.hero_headline));
    setText('hero-subtext', c.hero_subtext);
    setText('footer-org', c.org_name);
    setText('footer-org2', c.org_name);

    // About
    setText('about-text', c.about_text);
    setText('season-info', c.season_info);

    // Stats band
    var stats = data.stats || [];
    setHTML('stats-list', stats.map(function (s) {
      return '<div class="stat"><div class="num">' + esc(s.Number || s.number) +
             '</div><div class="lbl">' + esc(s.Label || s.label) + '</div></div>';
    }).join(''));

    // Get involved links
    var regUrl = c.registration_url ? extUrl(c.registration_url) : '#register';
    if ($('involve-register')) $('involve-register').setAttribute('href', regUrl);
    if (c.volunteer_url && $('involve-volunteer')) $('involve-volunteer').setAttribute('href', extUrl(c.volunteer_url));
    if (c.donate_url && $('involve-donate')) $('involve-donate').setAttribute('href', extUrl(c.donate_url));

    // Registration section
    setText('registration-window', c.registration_window);
    var open = truthy(c.registration_open);
    var rl = $('register-link'), rc = $('register-closed');
    if (open) {
      if (rl) { rl.setAttribute('href', regUrl); rl.hidden = false; }
      if (rc) rc.hidden = true;
    } else {
      if (rl) rl.hidden = true;
      if (rc) rc.hidden = false;
    }

    // Schedule — chronological list; past dates dimmed automatically.
    // Year-proof: use season_year if set, else assume the current year — but
    // once the season is over (Nov/Dec), roll to next year so the upcoming
    // Aug–Oct dates read as future instead of all showing as past.
    var year = parseInt(c.season_year, 10);
    if (!year) { var n = new Date(); year = n.getFullYear() + (n.getMonth() >= 10 ? 1 : 0); }
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var sched = (data.schedule || []).map(function (r) {
      // Prefer the cell's real date value (year and all); fall back to parsing
      // the text + the year-proofed season year only if it's not a real date.
      var d = (typeof r['Date__d'] === 'number') ? new Date(r['Date__d']) : schedDate_(r.Date, year);
      return { r: r, d: d };
    }).sort(function (a, b) { return (a.d ? a.d.getTime() : 0) - (b.d ? b.d.getTime() : 0); });

    // "Subscribe to the schedule" calendar button (webcal feed from config)
    var calBtn = $('cal-subscribe');
    var calNote = $('cal-note');
    if (calBtn) {
      if (c.calendar_url) {
        calBtn.setAttribute('href', c.calendar_url); calBtn.hidden = false;
        if (calNote) {
          var httpsUrl = String(c.calendar_url).replace(/^webcal:/i, 'https:');
          calNote.innerHTML = 'Using Google Calendar? Add it under <em>Other calendars → + → From URL</em>: ' +
            esc(httpsUrl);
          calNote.hidden = false;
        }
      } else {
        calBtn.hidden = true;
        if (calNote) calNote.hidden = true;
      }
    }

    // Editable schedule heading (blank = keep the built-in one)
    if (c.schedule_heading && $('schedule-heading')) {
      $('schedule-heading').innerHTML = emphasize(c.schedule_heading);
    }

    var listEl = $('schedule-list');
    if (listEl) listEl.className = 'sched';     // switch from card grid to list
    setHTML('schedule-list', sched.map(function (x) {
      var r = x.r;
      var past = x.d && x.d < today;
      var loc = [r.Location, r.Notes].filter(Boolean).map(linkify).join(' · ');
      // Weekday is always computed from the real date — a typed/wrong day can't show.
      var dateLabel = x.d
        ? x.d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : (r.Date || '');
      return '<div class="srow' + (past ? ' past' : '') + '">' +
        '<div class="sdate">' + esc(dateLabel) + '</div>' +
        '<div class="sev">' + esc(r.Event) + '</div>' +
        '<div class="stime">' + esc(r.Time || '') + '</div>' +
        '<div class="sloc">' + loc + '</div>' +
      '</div>';
    }).join(''));

    // Location
    setText('location-name', c.location_name);
    if (c.location_address) { setText('location-address', c.location_address); }
    else { var law = $('location-address-wrap'); if (law) law.hidden = true; }
    if (c.location_maps_url && $('location-maps')) $('location-maps').setAttribute('href', extUrl(c.location_maps_url));

    // FAQs
    var faqs = data.faqs || [];
    setHTML('faq-list', faqs.map(function (f) {
      return '<details class="faq"><summary>' + esc(f.Question || f.question) + '</summary>' +
             '<div class="ans">' + esc(f.Answer || f.answer) + '</div></details>';
    }).join(''));

    // Sponsors
    var sponsors = data.sponsors || [];
    setHTML('sponsor-list', sponsors.map(function (s) {
      var name = esc(s.Name || s.name);
      var inner = (s.URL || s.url)
        ? '<a href="' + esc(extUrl(s.URL || s.url)) + '" target="_blank" rel="noopener">' + name + '</a>'
        : name;
      var lvl = (s.Level || s.level) ? '<span class="level">' + esc(s.Level || s.level) + '</span>' : '';
      return '<div class="sponsor">' + inner + lvl + '</div>';
    }).join(''));

    // Volunteer Teams (from the Volunteers tab). Team + Coaches always show;
    // Organization + Season are optional. Heading + intro come from config.
    // The whole section hides itself when there are no teams.
    if ($('volunteers-heading') && c.volunteers_heading) {
      $('volunteers-heading').innerHTML = emphasize(c.volunteers_heading);
    }
    if ($('volunteers-intro')) {
      if (c.volunteers_intro) setText('volunteers-intro', c.volunteers_intro);
      else $('volunteers-intro').hidden = true;
    }
    var vteams = (data.volunteers || []).filter(function (v) {
      return (v.Team || v.team || v.Name || v.name || '').toString().trim();
    });
    var vSection = $('volunteers');
    if (vteams.length) {
      if (vSection) vSection.hidden = false;
      setHTML('volunteer-list', vteams.map(function (v) {
        var team    = v.Team || v.team || v.Name || v.name || '';
        var coaches = String(v.Coaches || v.coaches || v.Coach || v.coach || '').trim();
        var org     = String(v.Organization || v.organization || v.School || v.school || v.Org || v.org || '').trim();
        var season  = String(v.Season || v.season || v.Year || v.year || '').trim();
        var tags = '';
        if (org)    tags += '<span class="vtag">' + esc(org) + '</span>';
        if (season) tags += '<span class="vtag vseason">' + esc(season) + '</span>';
        return '<div class="vteam">' +
          '<div class="vname">' + esc(team) + '</div>' +
          (coaches ? '<div class="vcoach">' + esc(coaches) + '</div>' : '') +
          (tags ? '<div class="vtags">' + tags + '</div>' : '') +
        '</div>';
      }).join(''));
    } else if (vSection) {
      vSection.hidden = true;
    }

    // Photo gallery (from the Photos tab)
    // Add "?ids" to the site URL to overlay each photo's Drive filename — makes
    // it easy to spot a bad photo here and go delete that file in the folder.
    // Hovering any photo also shows its filename as a tooltip.
    var photos = data.photos || [];
    var showIds = /[?&#]ids\b/i.test(location.search + location.hash);
    setHTML('photo-gallery', photos.map(function (p, i) {
      var raw = p.Image || p.image || p.URL || p.url;
      var src = imgUrl(raw);
      if (!src) return '';
      var cap = p.Caption || p.caption || '';
      var file = String(p.File || p.file || p.Filename || p.filename || '').trim();
      var idm = String(raw).match(/[-\w]{25,}/);                 // drive file id, if any
      var token = file || (idm ? '…' + idm[0].slice(-6) : ('#' + (i + 1)));
      var titleAttr = esc((file || ('photo ' + (i + 1))) + (cap ? ' — ' + cap : ''));
      return '<figure class="shot"><img loading="lazy" src="' + esc(src) + '" alt="' +
             esc(cap || 'South Dayton TOPSoccer') + '" title="' + titleAttr + '">' +
             (showIds ? '<span class="fileid">' + esc(token) + '</span>' : '') +
             (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>';
    }).join(''));

    // Full-album link (optional)
    var pl = $('photos-link');
    if (pl) {
      if (c.photos_url) { pl.setAttribute('href', extUrl(c.photos_url)); pl.hidden = false; }
      else { pl.hidden = true; }
    }

    // Contact
    if (c.phone_label && $('phone-label')) setText('phone-label', c.phone_label);
    if (c.email_label && $('email-label')) setText('email-label', c.email_label);
    if (c.hotline_phone && $('contact-phone')) {
      $('contact-phone').textContent = c.hotline_phone;
      $('contact-phone').setAttribute('href', 'tel:' + String(c.hotline_phone).replace(/[^\d+]/g, ''));
    }
    if (c.contact_email && $('contact-email')) {
      $('contact-email').textContent = c.contact_email;
      $('contact-email').setAttribute('href', 'mailto:' + c.contact_email);
    }
    setText('mailing-address', c.mailing_address);
    setText('donate-text', c.donate_text);

    var contacts = data.contacts || [];
    setHTML('contact-list', contacts.map(function (p) {
      var lines = [];
      if (p.Role || p.role) lines.push('<div class="role">' + esc(p.Role || p.role) + '</div>');
      if (p.Phone || p.phone) lines.push('<div>' + esc(p.Phone || p.phone) + '</div>');
      if (p.Email || p.email) lines.push('<div><a href="mailto:' + esc(p.Email || p.email) + '">' + esc(p.Email || p.email) + '</a></div>');
      return '<div class="contact-card"><div class="nm">' + esc(p.Name || p.name) + '</div>' + lines.join('') + '</div>';
    }).join(''));

    // Social links
    var social = [];
    if (c.facebook_url) social.push('<a href="' + esc(c.facebook_url) + '" target="_blank" rel="noopener">Facebook</a>');
    if (c.instagram_url) social.push('<a href="' + esc(c.instagram_url) + '" target="_blank" rel="noopener">Instagram</a>');
    setHTML('social', social.join(''));

    // Footer year
    setText('year', new Date().getFullYear());

    document.title = (c.org_name || 'South Dayton TOPSoccer');
  }

  load().then(render).catch(function (e) {
    // Last-ditch: render from sample so the page is never blank.
    try { render(CFG.SAMPLE || {}); } catch (_) {}
    if (window.console) console.error('SDTS render error:', e);
  });
})();
