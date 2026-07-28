/**
 * File: TOPSoccer SMS.gs
 * TOPSoccer — Twilio SMS blasts (one-way announcements)
 * Version: 0.5
 *
 * v0.5: the Send Text Blast passcode gate now reads Config `photo_passcode` (was
 *       `coach_passcode`). The person who edits photos also handles texting — a much
 *       tighter group than the coaches, who all share the coach passcode. Prompt label
 *       generalized to "Passcode".
 * v0.4: "Send Text Blast" now opens a custom compose DIALOG (SmsCompose.html) instead of
 *       chained prompt boxes. The dialog shows a LIVE character counter, a segment/"# of
 *       texts" indicator, and a live count of how many opted-in guardians will receive it,
 *       and it HARD-STOPS input at the character limit (textarea maxlength). Limit is read
 *       from Config `sms_char_limit` (default 160 = one SMS segment) via smsCharLimit_().
 *       New public handlers smsComposeAudience()/smsComposeSend() are called by the dialog
 *       (names have NO trailing underscore so google.script.run can reach them). The limit
 *       is also re-enforced server-side in smsComposeSend as defense in depth. Menu wiring
 *       is unchanged — "Send Text Blast…" still calls sendTextBlast().
 * v0.3: auth via a Twilio API Key (SK…/secret) as well as the legacy Account SID + Auth
 *       Token. API key is preferred (revocable, scoped). Basic Auth user:pass is the API
 *       key SID:secret; the request URL still uses the Account SID (AC…). smsConfig_ picks
 *       API-key mode when TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET are set, else falls
 *       back to TWILIO_AUTH_TOKEN.
 * v0.2: opt-in enforcement. Only guardians who checked the GoSports SMS opt-in question
 *       ("Would you like to receive text message updates? …" → "Yes please send me text
 *       updates") are texted. The opt-in column is found by fuzzy header match (robust to
 *       the exact wording/spelling), NOT COLUMN_MAP. Config flag sms_require_optin (default
 *       true) gates this; if the column can't be found while required, the blast aborts
 *       rather than risk texting non-consenting numbers. Confirm dialog shows opted-in count.
 *
 * Sends one-way text announcements (weather/cancellation, picture day / CHS night)
 * to guardian phone numbers pulled from the latest Raw_YYYY tab. Reuses helpers from
 * Membership Import.gs (getConfig_, getRawRecords_, applyTeam_).
 *
 * SECURITY — Twilio credentials live in SCRIPT PROPERTIES, never in code or the Config sheet.
 *   Apps Script editor → Project Settings (gear) → Script Properties → add:
 *     TWILIO_ACCOUNT_SID     ACxxxxxxxxxxxxxxxx...   (from the Console dashboard; used in the URL)
 *     TWILIO_FROM            +1XXXXXXXXXX            (your Twilio number, E.164)
 *   Then EITHER (preferred — a revocable API key):
 *     TWILIO_API_KEY_SID     SKxxxxxxxxxxxxxxxx...
 *     TWILIO_API_KEY_SECRET  (shown once when you create the key — copy it then)
 *   OR (simpler, less secure — the account Auth Token):
 *     TWILIO_AUTH_TOKEN      (from the Console dashboard)
 *   Optional:
 *     SMS_TEST_TO            +1XXXXXXXXXX            (your own cell, used by "Send Test Text")
 *
 * Config (Membership Config sheet) — optional:
 *   sms_require_optin   true (default) / false
 *   sms_char_limit      160 (default) — max characters the compose dialog accepts per blast
 *
 * TRIAL NOTE — On a Twilio free trial you can only text VERIFIED numbers and must use
 *   Twilio's template wording. Custom message bodies + texting all guardians require an
 *   upgraded (paid) account with A2P 10DLC registration approved.
 *
 * Tabs this file uses (auto-created as needed):
 *   SMS_OptOut  — one phone number per row in column A; these are skipped on every send.
 *   SMS_Log     — append-only log of every message attempted.
 *
 * Menu wiring lives in Membership Import.gs onOpen (v0.38+): TOPSoccer → Send Text Blast / Send Test Text.
 */

var SMS_OPTOUT_TAB = 'SMS_OptOut';   // one phone per row in col A (any format; normalized on read)
var SMS_LOG_TAB    = 'SMS_Log';
var SMS_RATE_MS    = 1100;           // ~1 msg/sec — matches A2P low-volume throughput (1 MPS)
var SMS_SEG_LEN    = 153;            // GSM concatenated-segment size (billed per segment)
var SMS_DEFAULT_LIMIT = 160;         // one SMS segment; over=split + billed per segment

// Fuzzy match for the GoSports SMS opt-in column header (robust to exact wording/spelling).
var SMS_OPTIN_HEADER_RE = /(text\s*message|text\s*updates|recie?ve\s*text|opt.?in)/i;
// An opt-in CELL counts as YES if it affirmatively contains "yes" (GoSports exports
// e.g. ["Yes please send me text updates"]; blank / anything without "yes" = not opted in).
var SMS_OPTIN_YES_RE = /yes/i;

/** Read Twilio creds from Script Properties; throw a clear error listing anything missing. */
function smsConfig_() {
  var p = PropertiesService.getScriptProperties();
  var accountSid = p.getProperty('TWILIO_ACCOUNT_SID');    // AC… — always used in the request URL
  var keySid = p.getProperty('TWILIO_API_KEY_SID');        // SK… — preferred (revocable API key)
  var keySecret = p.getProperty('TWILIO_API_KEY_SECRET');
  var authToken = p.getProperty('TWILIO_AUTH_TOKEN');      // fallback if not using an API key
  var from = p.getProperty('TWILIO_FROM');

  var missing = [];
  if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!from) missing.push('TWILIO_FROM');

  var user, pass, mode;
  if (keySid && keySecret) { user = keySid; pass = keySecret; mode = 'apikey'; }
  else if (authToken) { user = accountSid; pass = authToken; mode = 'authtoken'; }
  else { missing.push('TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (preferred) or TWILIO_AUTH_TOKEN'); }

  if (missing.length) throw new Error('Missing Script Properties: ' + missing.join(', ') +
    '. Add them in Project Settings → Script Properties.');
  return { accountSid: accountSid, user: user, pass: pass, from: from, mode: mode };
}

/** Character limit for a blast — Config sms_char_limit, else 160 (one segment). */
function smsCharLimit_() {
  try {
    var c = getConfig_();
    var v = parseInt(c.settings['sms_char_limit'], 10);
    if (v && v > 0) return v;
  } catch (e) {}
  return SMS_DEFAULT_LIMIT;
}

/** Normalize a US/CA phone to E.164 (+1XXXXXXXXXX). Returns '' if it cannot be made valid. */
function toE164_(v) {
  var s = String(v == null ? '' : v).trim();
  if (s.charAt(0) === '+') {
    var plus = '+' + s.slice(1).replace(/\D/g, '');
    return /^\+\d{11,15}$/.test(plus) ? plus : '';
  }
  var d = s.replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return '';
}

/** Map of opted-out phone numbers (normalized to E.164). */
function smsOptOutSet_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SMS_OPTOUT_TAB);
  var set = {};
  if (!sh || sh.getLastRow() < 1) return set;
  sh.getRange(1, 1, sh.getLastRow(), 1).getValues().forEach(function (row) {
    var e = toE164_(row[0]);
    if (e) set[e] = true;
  });
  return set;
}

/** Newest Raw_YYYY player tab (players mirror of getLatestCoachYear_). */
function latestPlayerYear_() {
  var years = [];
  SpreadsheetApp.getActive().getSheets().forEach(function (s) {
    var m = s.getName().match(/^Raw_(\d{4})$/);
    if (m) years.push(m[1]);
  });
  years.sort().reverse();
  return years.length ? years[0] : null;
}

/**
 * Read the SMS opt-in column from a Raw_YYYY tab. Returns { found, phones:{E164:true} }.
 * The column is located by fuzzy header match (SMS_OPTIN_HEADER_RE) so it survives wording
 * or spelling changes in the GoSports export. found=false means no opt-in column was located
 * (e.g. an older export) — callers decide whether to proceed. A guardian counts as opted in
 * if ANY of their rows has an affirmative ("yes") value, so their phone is added to the set.
 */
function smsOptInSet_(tab) {
  var sh = SpreadsheetApp.getActive().getSheetByName(tab);
  var res = { found: false, phones: {} };
  if (!sh || sh.getLastRow() < 2) return res;
  var vals = sh.getDataRange().getValues();
  var header = vals[0];
  var phoneCol = header.indexOf(COLUMN_MAP.phone);   // 'Phone'
  var optCol = -1;
  for (var i = 0; i < header.length; i++) {
    if (SMS_OPTIN_HEADER_RE.test(String(header[i] || ''))) { optCol = i; break; }
  }
  if (optCol === -1 || phoneCol === -1) return res;  // found stays false
  res.found = true;
  for (var r = 1; r < vals.length; r++) {
    if (!SMS_OPTIN_YES_RE.test(String(vals[r][optCol] || ''))) continue;
    var e = toE164_(vals[r][phoneCol]);
    if (e) res.phones[e] = true;
  }
  return res;
}

/**
 * Build the deduped recipient list from the latest Raw_YYYY.
 * Dedupes by phone (a guardian with multiple players is texted once), drops opt-outs, and
 * — when sms_require_optin is on (default) — keeps ONLY guardians who checked the GoSports
 * SMS opt-in box. teamFilter (optional) matches the assigned team (Annotations team_override).
 */
function smsRecipients_(teamFilter) {
  var c = getConfig_();
  var year = latestPlayerYear_();
  var tab = year ? 'Raw_' + year : (c.settings['raw_tab'] || 'Raw');
  var recs = getRawRecords_(c, tab);
  var annTab = year ? 'Annotations_' + year : (c.settings['annotations_tab'] || 'Annotations');
  try { applyTeam_(c, recs, annTab); } catch (e) {}   // sets r.team from team_override

  var requireOptIn = String(c.settings['sms_require_optin'] == null ? 'true' : c.settings['sms_require_optin']).toLowerCase() !== 'false';
  var optIn = smsOptInSet_(tab);
  var opt = smsOptOutSet_();
  var tf = teamFilter ? String(teamFilter).toLowerCase() : '';

  var seen = {}, out = [], candidates = 0, excludedNotOptedIn = 0;
  recs.forEach(function (r) {
    if (tf && String(r.team || '').toLowerCase() !== tf) return;
    var e = toE164_(r.phone);
    if (!e || seen[e] || opt[e]) return;
    seen[e] = true;
    candidates++;
    if (requireOptIn && optIn.found && !optIn.phones[e]) { excludedNotOptedIn++; return; }
    out.push({
      to: e,
      guardian: (String(r.g1_first || '') + ' ' + String(r.g1_last || '')).replace(/\s+/g, ' ').trim(),
      player: (String(r.first || '') + ' ' + String(r.last || '')).replace(/\s+/g, ' ').trim()
    });
  });
  return {
    year: year, tab: tab, list: out,
    optOutCount: Object.keys(opt).length,
    requireOptIn: requireOptIn, optInFound: optIn.found,
    candidates: candidates, excludedNotOptedIn: excludedNotOptedIn
  };
}

/** POST one message to Twilio's REST API. Returns {ok, code, sid, status, error}. */
function twilioSend_(to, body) {
  var cfg = smsConfig_();
  var url = 'https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(cfg.accountSid) + '/Messages.json';
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: { To: to, From: cfg.from, Body: body },
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(cfg.user + ':' + cfg.pass) },
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  var data = {};
  try { data = JSON.parse(resp.getContentText() || '{}'); } catch (e) {}
  return { ok: code >= 200 && code < 300, code: code, sid: data.sid || '', status: data.status || '', error: data.message || '' };
}

/** Append one row to SMS_Log (creates the tab + header on first use). */
function smsLog_(to, body, res) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SMS_LOG_TAB) || ss.insertSheet(SMS_LOG_TAB);
  if (sh.getLastRow() < 1) sh.appendRow(['Timestamp', 'To', 'Body', 'HTTP', 'Twilio SID', 'Status', 'Error', 'Sent by']);
  sh.appendRow([new Date(), to, body, res.code, res.sid, res.status, res.error, who_sms_()]);
}

function who_sms_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

/** Estimated billed segments for a body (GSM-7 assumption; good enough for a guardrail). */
function smsSegments_(body) {
  var n = body.length;
  if (n <= 160) return 1;
  return Math.ceil(n / SMS_SEG_LEN);
}

/**
 * MENU: open the compose dialog for a one-way blast. Passcode gate (if photo_passcode set)
 * runs first; then the SmsCompose.html modal handles team filter, message, live counter,
 * confirm and send (via smsComposeAudience/smsComposeSend).
 */
function sendTextBlast() {
  var ui = SpreadsheetApp.getUi();

  // Gate on photo_passcode if one is set in Config (menu is already limited to sheet editors).
  try {
    var c = getConfig_();
    var pass = c.settings['photo_passcode'];
    if (pass) {
      var pr = ui.prompt('Passcode', 'Enter the passcode to send texts:', ui.ButtonSet.OK_CANCEL);
      if (pr.getSelectedButton() !== ui.Button.OK) return;
      if (String(pr.getResponseText()).trim() !== String(pass).trim()) { ui.alert('Wrong passcode.'); return; }
    }
  } catch (e) {}

  var t = HtmlService.createTemplateFromFile('SmsCompose');
  t.charLimit = smsCharLimit_();
  var html = t.evaluate().setWidth(480).setHeight(600);
  ui.showModalDialog(html, 'Send Text Blast');
}

/**
 * Called by SmsCompose.html (google.script.run) — returns the current audience for a team
 * filter so the dialog can show "N opted-in guardian(s)" live. NO trailing underscore.
 */
function smsComposeAudience(team) {
  try {
    var t = team && String(team).trim() ? String(team).trim() : null;
    var rcp = smsRecipients_(t);
    return {
      ok: true,
      count: rcp.list.length,
      tab: rcp.tab,
      excludedNotOptedIn: rcp.excludedNotOptedIn,
      optOutCount: rcp.optOutCount,
      requireOptIn: rcp.requireOptIn,
      optInFound: rcp.optInFound,
      limit: smsCharLimit_()
    };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/**
 * Called by SmsCompose.html (google.script.run) — validates, sends, logs, and returns a
 * summary. Re-enforces the character limit server-side. NO trailing underscore.
 */
function smsComposeSend(team, body) {
  try {
    var limit = smsCharLimit_();
    body = String(body == null ? '' : body);
    if (!body.trim()) return { ok: false, error: 'Message is empty — nothing sent.' };
    if (body.length > limit) return { ok: false, error: 'Message is ' + body.length + ' characters; the limit is ' + limit + '.' };

    var t = team && String(team).trim() ? String(team).trim() : null;
    var rcp = smsRecipients_(t);
    if (rcp.requireOptIn && !rcp.optInFound) {
      return { ok: false, error: 'Opt-in column not found in ' + rcp.tab + ' — nothing sent (safe default). Import the latest GoSports export first.' };
    }
    if (!rcp.list.length) {
      return { ok: false, error: 'No opted-in recipients' + (t ? ' for team "' + t + '"' : '') + ' in ' + rcp.tab + '.' };
    }

    var sent = 0, failed = 0, firstErr = '';
    for (var i = 0; i < rcp.list.length; i++) {
      var res = twilioSend_(rcp.list[i].to, body);
      smsLog_(rcp.list[i].to, body, res);
      if (res.ok) sent++;
      else { failed++; if (!firstErr) firstErr = 'HTTP ' + res.code + ': ' + res.error; }
      if (i < rcp.list.length - 1) Utilities.sleep(SMS_RATE_MS);
    }
    return { ok: true, sent: sent, failed: failed, firstErr: firstErr, total: rcp.list.length, tab: rcp.tab };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/** MENU: send a single test text to SMS_TEST_TO (or a prompt). Use this on the trial. */
function sendTestText() {
  var ui = SpreadsheetApp.getUi();
  var to = PropertiesService.getScriptProperties().getProperty('SMS_TEST_TO');
  if (!to) {
    var pr = ui.prompt('Test number', 'Enter a VERIFIED phone number to test (e.g. +19375551234):', ui.ButtonSet.OK_CANCEL);
    if (pr.getSelectedButton() !== ui.Button.OK) return;
    to = String(pr.getResponseText()).trim();
  }
  var e = toE164_(to);
  if (!e) { ui.alert('That does not look like a valid US number.'); return; }
  var mp = ui.prompt('Test message', 'Message to send to ' + e + ':', ui.ButtonSet.OK_CANCEL);
  if (mp.getSelectedButton() !== ui.Button.OK) return;
  var body = String(mp.getResponseText()).trim() || 'TOPSoccer test message.';
  var res = twilioSend_(e, body);
  smsLog_(e, body, res);
  ui.alert(res.ok ? 'Sent ✓' : 'Failed',
    res.ok ? ('Twilio status: ' + res.status + '\nSID: ' + res.sid) : ('HTTP ' + res.code + '\n' + res.error),
    ui.ButtonSet.OK);
}
