/**
 * File: SearchDemo_Code.gs
 * TOP Soccer — Player Search (web app)
 * Version: 3.4
 *
 * v3.4: Export PDF now honors the report Sort selector (By team / By last name).
 *       exportPdf() takes a sort arg; sortRosterRows_() mirrors labelSort_ ordering.
 *       buildRosterV2_ rows now expose first/last for sorting.
 *       DOB column widened (6%->8%, from Contact) + nowrap so the date no longer
 *       breaks onto a second line.
 * v3.3: exportCsv always prepends Team as first column regardless of ROSTER FIELDS
 *       checkboxes, so the CSV is always useful for sorting/filtering by team.
 * v3.2: Export CSV button in the web app — shown only when csv_roster = true in Config.
 *       Uses the same ROSTER FIELDS columns as Team Rosters PDF/CSV. getCsvEnabled()
 *       lets the UI check the flag; exportCsv() returns the CSV string for download.
 * v3.1: GoSport team shown below annotation dropdown — Team Name (regular) when set,
 *       else team preference stripped to short name (italic). Reads gotsport_pref from
 *       Raw tab (Membership Import.gs v0.34 adds the column to COLUMN_MAP).
 * v3.0: added CHS game + Fall Classic event checkboxes (markEvent). setAnnotation_
 *       now auto-adds missing columns to the header so new fields work on existing tabs.
 *       PDF export updated: 12-column layout with CHS game + Fall Classic columns and stats.
 * v2.9: getAvailableYears() now also matches Raw_Coaches_YYYY so the year dropdown
 *       appears as soon as either a player or coach tab exists for that season.
 * v2.8: multi-season year selector — getAvailableYears() scans for Raw_YYYY tabs;
 *       all roster/write functions accept an optional year param and read/write
 *       Raw_YYYY + Annotations_YYYY tabs accordingly.
 * v2.7: login throttle — attemptLogin() locks out after 5 wrong tries, but the
 *       counter is PER BROWSER (keyed by a client id), so one coach's mistakes
 *       never lock out another. Deterrent layered on the strong passphrase.
 * v2.6: full login wall — the page shows nothing and no data is returned until the
 *       access code is entered. getRoster/getTeams/markShirt/saveNote/exportPdf now
 *       require the code (server-enforced). Blank coach_passcode = open (no wall).
 * v2.5: file name in header.
 * v2.4: gate team reassignment behind the Config coach_passcode (blank = open).
 * v2.3: normalize phone numbers to nnn-nnn-nnnn (strips +1 / punctuation).
 * v2.2: show Registration ID under the player name (and make it searchable).
 * v2.1: format DOB as a clean MM/DD/YYYY (was the raw timestamp).
 * v2.0: reads from the Raw + Annotations layer (not by scanning tabs). Notes,
 *       shirt-pickups, and team assignments now read/write the ANNOTATIONS tab
 *       by Registration ID, so re-imports never wipe them. Adds a Team dropdown
 *       (setTeam) and getTeams() for the picker.
 *
 * Reuses helpers from the Membership Import file (same project): getConfig_,
 * getRawRecords_, applyTeam_, readAnnotations_, teamRankMap_.
 */

var NOTE_MAX_LENGTH = 60;

/* ---------------- web app ---------------- */

/** Returns years that have a Raw_YYYY tab, newest first. */
function getAvailableYears() {
  var sheets = SpreadsheetApp.getActive().getSheets();
  var years = [];
  sheets.forEach(function (s) {
    var m = s.getName().match(/^Raw_(\d{4})$/);
    if (m) years.push(m[1]);
  });
  years.sort().reverse();
  return years;
}

function doGet() {
  return HtmlService.createTemplateFromFile('PlayerSearch')
    .evaluate()
    .setTitle('TOP Soccer — Player Search')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Roster for the page — requires the access code (no data before auth). */
function getRoster(code, year) {
  if (!checkCoachCode(code)) throw new Error('Locked');
  return buildRosterV2_(year);
}

/** Team names for the dropdown (config order, excludes Staff). Requires the code. */
function getTeams(code, year) {
  if (!checkCoachCode(code)) throw new Error('Locked');
  var c = getConfig_(), rank = teamRankMap_(c);
  var names = Object.keys(c.teams).filter(function (n) { return n.toLowerCase() !== 'staff'; });
  names.sort(function (a, b) { return (rank[a.toLowerCase()] || 0) - (rank[b.toLowerCase()] || 0); });
  return names;
}

/** Build the roster from Raw_YYYY ⨝ Annotations_YYYY (or config defaults if no year). */
function buildRosterV2_(year) {
  var c = getConfig_();
  var rawTab = year ? 'Raw_' + year : (c.settings['raw_tab'] || 'Raw');
  var annTab = year ? 'Annotations_' + year : (c.settings['annotations_tab'] || 'Annotations');
  var recs = getRawRecords_(c, rawTab);
  applyTeam_(c, recs, annTab);
  var ann = readAnnotations_(c, annTab);
  return recs.map(function (r) {
    var a = ann[r.reg_id] || {};
    return {
      regId:    r.reg_id,
      first:    r.first || '',
      last:     r.last || '',
      player:   (r.first + ' ' + r.last).replace(/\s+/g, ' ').trim(),
      guardian: (r.g1_first + ' ' + r.g1_last).replace(/\s+/g, ' ').trim(),
      phone:    formatPhone_(r.phone),
      email:    r.email || '',
      gender:   r.gender || '',
      dob:      formatDob_(r.dob),
      age:      ageFromDob_(r.dob),
      program:  r.program || '',
      team:     r.team || '',
      tshirt:   r.shirt_size || '',
      paid:     r.payment_status || '',
      pickedUp:     a.shirt_picked_up || '',
      chsGame:      a.chs_game || '',
      fallClassic:  a.fall_classic || '',
      note:         a.note || '',
      gotsportTeam: r.team_gotsport || '',
      gotsportPref: stripTeamPref_(r.gotsport_pref || '')
    };
  });
}

/* ---------------- write-backs (all keyed by Registration ID → Annotations) ---------------- */

function markShirt(regId, checked, code, year) {
  if (!checkCoachCode(code)) throw new Error('Locked');
  var ts = checked ? Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'M/d/yyyy h:mm a') : '';
  setAnnotation_(regId, { shirt_picked_up: ts, last_updated: new Date(), updated_by: who_() }, year);
  return ts;
}

/** Generic event attendance checkbox (chs_game, fall_classic). */
function markEvent(regId, field, checked, code, year) {
  if (!checkCoachCode(code)) throw new Error('Locked');
  var allowed = { chs_game: true, fall_classic: true };
  if (!allowed[field]) throw new Error('Unknown event field: ' + field);
  var ts = checked ? Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'M/d/yyyy h:mm a') : '';
  var update = { last_updated: new Date(), updated_by: who_() };
  update[field] = ts;
  setAnnotation_(regId, update, year);
  return ts;
}

function saveNote(regId, text, code, year) {
  if (!checkCoachCode(code)) throw new Error('Locked');
  var clean = (text || '').toString().slice(0, NOTE_MAX_LENGTH);
  setAnnotation_(regId, { note: clean, last_updated: new Date(), updated_by: who_() }, year);
  return clean;
}

function setTeam(regId, team, code, year) {
  if (!checkCoachCode(code)) throw new Error('Wrong coach code.');
  var t = (team || '').toString().trim();
  setAnnotation_(regId, {
    team_override: t, team_override_by: who_(), team_override_at: new Date(),
    last_updated: new Date(), updated_by: who_()
  }, year);
  return t;
}

// Team editing is locked when Config has a coach_passcode. Blank = open.
function isTeamLocked() {
  return ((getConfig_().settings['coach_passcode'] || '').trim()) !== '';
}
function checkCoachCode(code) {
  var pass = (getConfig_().settings['coach_passcode'] || '').trim();
  return pass === '' || String(code || '').trim() === pass;
}

// Login attempt with PER-BROWSER throttle (clientId scopes the counter, so one
// person's wrong tries never lock out anyone else). Returns {ok|locked|remaining}.
function attemptLogin(code, clientId) {
  var pass = (getConfig_().settings['coach_passcode'] || '').trim();
  if (pass === '') return { ok: true };                       // no wall configured
  var MAX = 5, WINDOW = 300;                                  // 5 tries, ~5-min lockout
  var cache = CacheService.getScriptCache();
  var key = 'login_' + String(clientId || 'anon').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  var n = parseInt(cache.get(key) || '0', 10) || 0;
  if (n >= MAX) return { ok: false, locked: true };
  if (String(code || '').trim() === pass) { cache.remove(key); return { ok: true }; }
  n++;
  cache.put(key, String(n), WINDOW);
  return { ok: false, locked: n >= MAX, remaining: Math.max(0, MAX - n) };
}

// Set one or more fields on the Annotations row for a Registration ID (creates the row if missing).
function setAnnotation_(regId, updates, year) {
  var c = getConfig_();
  var annTab = year ? 'Annotations_' + year : (c.settings['annotations_tab'] || 'Annotations');
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(annTab);
  // Auto-create the annotations tab for a new season if it doesn't exist yet.
  if (!sh) {
    sh = ss.insertSheet(annTab);
    sh.appendRow(['reg_id','shirt_picked_up','chs_game','fall_classic','note','team_override','team_override_by','team_override_at','last_updated','updated_by']);
  }
  var vals = sh.getDataRange().getValues(), hdr = vals[0], idC = hdr.indexOf('reg_id');
  // Auto-add any missing columns to the header row.
  for (var f in updates) {
    if (hdr.indexOf(f) === -1) {
      sh.getRange(1, hdr.length + 1).setValue(f);
      hdr.push(f);
    }
  }
  var rowIdx = -1;
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][idC]).trim() === String(regId).trim()) { rowIdx = i; break; }
  }
  if (rowIdx === -1) {
    var nr = hdr.map(function () { return ''; });
    nr[idC] = regId; sh.appendRow(nr);
    rowIdx = sh.getLastRow() - 1;
  }
  for (var f in updates) {
    var col = hdr.indexOf(f);
    if (col >= 0) sh.getRange(rowIdx + 1, col + 1).setValue(updates[f]);
  }
}

function who_() { try { return Session.getActiveUser().getEmail() || 'web'; } catch (e) { return 'web'; } }

// Normalize US phone numbers to nnn-nnn-nnnn; leave anything unexpected as entered.
function formatPhone_(v) {
  if (!v) return '';
  var digits = String(v).replace(/\D/g, '');
  if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
  if (digits.length === 10) return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
  return String(v).trim();
}

function formatDob_(v) {
  if (!v) return '';
  var d = new Date(v);
  if (isNaN(d.getTime())) return String(v);   // leave non-dates alone
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'MM/dd/yyyy');
}

function ageFromDob_(dob) {
  if (!dob) return '';
  var d = new Date(dob);
  if (isNaN(d.getTime())) return '';
  var now = new Date(), a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return (a >= 0 && a < 120) ? a : '';
}

/* ---------------- PDF export (unchanged editorial style) ---------------- */

function exportPdf(query, code, year, sort) {
  if (!checkCoachCode(code)) throw new Error('Locked');
  query = (query || '').toString().trim().toLowerCase();
  sort = (sort === 'last') ? 'last' : 'team';
  var rows = buildRosterV2_(year).filter(function (r) { return matchesQuery_(r, query); });
  sortRosterRows_(rows, sort);
  var html = buildRosterHtml_(rows, query);
  var pdf = Utilities.newBlob(html, 'text/html', 'roster.html').getAs('application/pdf');
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var name = 'TOP Soccer Roster ' + stamp + (query ? ' (filtered)' : '') + '.pdf';
  return { name: name, b64: Utilities.base64Encode(pdf.getBytes()) };
}

/** Sort roster rows for the PDF, mirroring the report Sort selector.
 *  'last' = alphabetical by last, first. 'team' (default) = config team order, then last/first. */
function sortRosterRows_(rows, sort) {
  function byLastFirst(a, b) {
    var k = ((a.last || '') + ' ' + (a.first || '')).toLowerCase();
    var l = ((b.last || '') + ' ' + (b.first || '')).toLowerCase();
    return k < l ? -1 : k > l ? 1 : 0;
  }
  if (sort === 'last') { rows.sort(byLastFirst); return; }
  var rank = teamRankMap_(getConfig_());
  rows.sort(function (a, b) {
    var ra = a.team ? (rank[a.team.toLowerCase()] || 5e5) : 1e9;
    var rb = b.team ? (rank[b.team.toLowerCase()] || 5e5) : 1e9;
    return (ra - rb) || byLastFirst(a, b);
  });
}

/** Returns true if csv_roster is enabled in Config. Called by the UI on load. */
function getCsvEnabled(code) {
  if (!checkCoachCode(code)) throw new Error('Locked');
  var c = getConfig_();
  return !!(c.settings['csv_roster'] === true ||
            String(c.settings['csv_roster'] || '').trim().toLowerCase() === 'true');
}

/** Build a CSV using the same ROSTER FIELDS columns as Team Rosters, filtered by query.
 *  Returns { csv, name } — the client downloads it directly. */
function exportCsv(query, code, year) {
  if (!checkCoachCode(code)) throw new Error('Locked');
  var c = getConfig_();
  if (!getCsvEnabled(code)) throw new Error('CSV export not enabled in Config.');
  query = (query || '').toString().trim().toLowerCase();

  // Raw records + team + annotation merge (same path as teamRostersCsv_).
  var rawTab = year ? 'Raw_' + year : (c.settings['raw_tab'] || 'Raw');
  var annTab = year ? 'Annotations_' + year : (c.settings['annotations_tab'] || 'Annotations');
  var recs = getRawRecords_(c, rawTab);
  applyTeam_(c, recs, annTab);
  var ann = readAnnotations_(c, annTab);
  recs.forEach(function (r) {
    var a = ann[r.reg_id] || {};
    r.chs_game     = a.chs_game || '';
    r.fall_classic = a.fall_classic || '';
  });

  // Filter by query across key fields.
  if (query) {
    recs = recs.filter(function (r) {
      return [r.first, r.last, r.g1_first, r.g1_last, r.phone, r.email,
              r.gender, r.program, r.team, r.shirt_size, r.payment_status]
        .join(' ').toLowerCase().indexOf(query) !== -1;
    });
  }

  var cols = rosterColumns_(c);   // from Membership Import.gs — respects ROSTER FIELDS checkboxes
  function csvCell_(v) {
    var s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  // Always include Team as the first column so the CSV is useful for sorting/filtering.
  var lines = [['Team'].concat(cols.map(function (col) { return col.label; })).map(csvCell_).join(',')];
  recs.forEach(function (r) {
    var row = [r.team || ''].concat(cols.map(function (col) { return col.get(r) || ''; }));
    lines.push(row.map(csvCell_).join(','));
  });

  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var name = 'TOP Soccer Roster ' + stamp + (query ? ' (filtered)' : '') + '.csv';
  return { csv: lines.join('\n'), name: name };
}

function matchesQuery_(r, q) {
  if (!q) return true;
  return [r.player, r.guardian, r.phone, r.email, r.gender, r.program,
          r.dob, r.age, r.team, r.tshirt, r.paid, r.note, r.regId]
    .join(' ').toLowerCase().indexOf(q) !== -1;
}

function buildRosterHtml_(rows, query) {
  var tz = Session.getScriptTimeZone();
  var when = Utilities.formatDate(new Date(), tz, "MMMM d, yyyy 'at' h:mm a");
  var pickedCount   = rows.filter(function (r) { return r.pickedUp; }).length;
  var chsCount      = rows.filter(function (r) { return r.chsGame; }).length;
  var fallCount     = rows.filter(function (r) { return r.fallClassic; }).length;

  var cols = [
    { h: 'Player', w: 12 }, { h: 'Guardian', w: 9 }, { h: 'Contact', w: 12 },
    { h: 'Sex', w: 3, cls: 'center' }, { h: 'DOB', w: 8 }, { h: 'Team', w: 10 },
    { h: 'Shirt', w: 5, cls: 'center' }, { h: 'Paid', w: 6, cls: 'center' },
    { h: 'Shirt picked up', w: 8, cls: 'center' }, { h: 'CHS game', w: 8, cls: 'center' },
    { h: 'Fall Classic', w: 8, cls: 'center' }, { h: 'Reg note', w: 11 }
  ];
  var colgroup = '<colgroup>' + cols.map(function (c) { return '<col style="width:' + c.w + '%">'; }).join('') + '</colgroup>';
  var thead = '<tr>' + cols.map(function (c) { return '<th class="' + (c.cls || '') + '">' + escapeHtml_(c.h) + '</th>'; }).join('') + '</tr>';

  var body = rows.map(function (r) {
    var paidCls = /yes|paid|complete|true/i.test(r.paid) ? 'paid-yes'
                : (/no|unpaid|pending|due|false/i.test(r.paid) ? 'paid-no' : '');
    var contact =
      (r.phone ? '<span class="ph">' + escapeHtml_(r.phone) + '</span>' : '') +
      (r.email ? '<span class="em">' + escapeHtml_(r.email) + '</span>' : '');
    var pickup = r.pickedUp
      ? '<span class="stamp">' + escapeHtml_(r.pickedUp).replace(/ (\d+:\d+ ?[AP]M)$/i, '<br>$1') + '</span>'
      : '<span class="open">—</span>';
    var chsCell = r.chsGame
      ? '<span class="stamp">' + escapeHtml_(r.chsGame).replace(/ (\d+:\d+ ?[AP]M)$/i, '<br>$1') + '</span>'
      : '<span class="open">—</span>';
    var fallCell = r.fallClassic
      ? '<span class="stamp">' + escapeHtml_(r.fallClassic).replace(/ (\d+:\d+ ?[AP]M)$/i, '<br>$1') + '</span>'
      : '<span class="open">—</span>';
    return '<tr>' +
      '<td><span class="pl">' + escapeHtml_(r.player) + '</span>' +
        (r.program ? '<span class="prog">' + escapeHtml_(r.program) + '</span>' : '') +
        '<span class="prog">#' + escapeHtml_(String(r.regId)) + '</span>' + '</td>' +
      '<td>' + escapeHtml_(r.guardian) + '</td>' +
      '<td class="contact">' + contact + '</td>' +
      '<td class="center">' + escapeHtml_((r.gender || '').toUpperCase()) + '</td>' +
      '<td><span class="dobv">' + escapeHtml_(r.dob) + '</span>' + (r.age ? '<span class="ag">age ' + escapeHtml_(String(r.age)) + '</span>' : '') + '</td>' +
      '<td>' + escapeHtml_(r.team) + '</td>' +
      '<td class="center">' + escapeHtml_(r.tshirt) + '</td>' +
      '<td class="center ' + paidCls + '">' + escapeHtml_(r.paid) + '</td>' +
      '<td class="center">' + pickup + '</td>' +
      '<td class="center">' + chsCell + '</td>' +
      '<td class="center">' + fallCell + '</td>' +
      '<td class="note">' + escapeHtml_(r.note || '') + '</td>' +
    '</tr>';
  }).join('');

  return '' +
    '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page { size: A4 landscape; margin: 14mm; }' +
    'body { font-family: Georgia, "Times New Roman", serif; color: #2b2b2b; margin: 0; }' +
    '.eyebrow { font-family: Arial, sans-serif; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #8a7d4a; }' +
    'h1 { font-size: 27px; font-weight: 700; color: #1c1c1c; margin: 3px 0 2px; }' +
    '.sub { font-size: 12px; color: #777; margin: 0; }' +
    '.rule { border-bottom: 2px solid #a0892e; margin: 9px 0 16px; }' +
    '.stats { margin: 0 0 14px; }' +
    '.stat { display: inline-block; margin-right: 52px; vertical-align: top; }' +
    '.stat .n { font-size: 30px; font-weight: 700; color: #1c1c1c; line-height: 1; }' +
    '.stat .l { font-family: Arial, sans-serif; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: #8a8a8a; margin-top: 4px; }' +
    'table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }' +
    'thead th { text-align: left; font-family: Arial, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #8a8a8a; padding: 7px 8px; border-bottom: 2px solid #a0892e; }' +
    'th.center { text-align: center; }' +
    'tbody td { padding: 8px 8px; vertical-align: top; border-bottom: 1px solid #ece6d8; word-wrap: break-word; }' +
    'tbody tr:nth-child(even) td { background: #f6f1e4; }' +
    'td.center { text-align: center; }' +
    '.pl { font-weight: 700; display: block; }' +
    '.prog { font-family: Arial, sans-serif; display: block; font-size: 8.5px; color: #9a9a9a; margin-top: 1px; }' +
    '.contact .ph { display: block; }' +
    '.contact .em { display: block; font-size: 9.5px; color: #5b5b5b; word-break: break-all; margin-top: 1px; }' +
    '.dobv { white-space: nowrap; }' +
    '.ag { display: block; font-size: 9px; color: #9a9a9a; }' +
    '.paid-yes { color: #5a7d2a; font-weight: 700; }' +
    '.paid-no { color: #b03a2e; font-weight: 700; }' +
    '.stamp { color: #5a7d2a; font-size: 9.5px; line-height: 1.25; }' +
    '.open { color: #c9c2ad; }' +
    'td.note { font-family: Arial, sans-serif; font-size: 9.5px; color: #5b5b5b; }' +
    '</style></head><body>' +
    '<div class="eyebrow">South Dayton TOPSoccer</div>' +
    '<h1>Player Roster' + (query ? ' &mdash; Filtered' : '') + '</h1>' +
    '<p class="sub">As of ' + escapeHtml_(when) + (query ? ' &nbsp;·&nbsp; matching &ldquo;' + escapeHtml_(query) + '&rdquo;' : '') + '</p>' +
    '<div class="rule"></div>' +
    '<div class="stats">' +
      '<div class="stat"><div class="n">' + rows.length + '</div><div class="l">Players shown</div></div>' +
      '<div class="stat"><div class="n">' + pickedCount + '</div><div class="l">Shirts picked up</div></div>' +
      '<div class="stat"><div class="n">' + chsCount + '</div><div class="l">CHS game</div></div>' +
      '<div class="stat"><div class="n">' + fallCount + '</div><div class="l">Fall Classic</div></div>' +
    '</div>' +
    '<table>' + colgroup + '<thead>' + thead + '</thead><tbody>' + body + '</tbody></table>' +
    '</body></html>';
}

// Strip the long suffix from a GoSport team preference string.
// "Dribblers: 5–8 years old" → "Dribblers"
function stripTeamPref_(v) {
  if (!v) return '';
  var i = v.indexOf(':');
  return i !== -1 ? v.slice(0, i).trim() : v.trim();
}

function escapeHtml_(s) {
  return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
