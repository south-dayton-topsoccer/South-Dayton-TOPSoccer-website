/**
 * File: Membership Import.gs
 * TOPSoccer Membership — Import + Reports
 * Version: 0.38  (Phase 1 + reports)
 *
 * v0.38: TOPSoccer menu gains "Send Text Blast…" + "Send Test Text" (one-way Twilio
 *        SMS to guardians). Handlers live in TOPSoccer SMS.gs; this file only wires the
 *        menu. Twilio creds are read from Script Properties, not Config/code.
 * v0.37: coach reports fall back to the latest existing coach tab when the selected
 *        season has no Raw_Coaches_YYYY yet. resolveCoachRawTab_/resolveCoachAnnTab_
 *        now route through resolveCoachYear_(), which returns the requested year only
 *        if its Raw_Coaches_YYYY tab exists, else getLatestCoachYear_(). Fixes Coach
 *        Roster / Coach Tags erroring on a fresh season (e.g. 2026 with only
 *        Raw_Coaches_2025 imported). Import is unaffected — it always writes the true
 *        season tab. Coach Roster PDF header now shows which season it's reading.
 * v0.36: CSV export for Team Rosters — set csv_roster = true in Config to enable.
 *        Appears as Reports → "Team Rosters CSV"; same columns as PDF, Team column
 *        prepended, saves to TOPSoccer Reports folder in Drive. Menu item is hidden
 *        when csv_roster is false/absent (checked at sheet open via onOpen).
 * v0.35: added chs_game + fall_classic to ROSTER_FIELDS (show ✓ when attended);
 *        teamRostersHtml_ now merges annotation data so these fields are visible
 *        in Team Rosters PDFs. Run "Set up Roster Fields" after pasting to add
 *        the checkboxes to the Config sheet.
 * v0.34: added gotsport_pref to COLUMN_MAP — maps "Please choose which team..." column
 *        from GoSport CSV so team preference is available to the player search web app.
 * v0.33: "Carry over teams from previous season" — carryOverTeams() matches returning
 *        players across Raw_YYYY tabs by first+last+DOB (exact), then exact name (if
 *        unique across the prior season), then last+initial+DOB near-miss. Writes
 *        team_override into Annotations_YYYY for blank cells only; never overwrites
 *        manual 2026 assignments. Batch write for performance. Players with no prior
 *        match (new registrants) are left unassigned and counted in the summary alert.
 * v0.32: coach import is now a merge, not a replace — manually-added coach rows are
 *        preserved across incremental GOT Soccer imports. mergeCoachTab_() upserts by
 *        Registration ID: existing rows updated, new rows appended, unlisted rows kept.
 *        Import alert shows updated / added / preserved counts for coach files.
 * v0.31: coaches now year-scoped — import routes coach CSV to Raw_Coaches_YYYY /
 *        Annotations_Coaches_YYYY (same auto-detection used for players). Helpers
 *        resolveCoachRawTab_, resolveCoachAnnTab_, getLatestCoachYear_ added.
 *        coachTagItems_, coachRosterHtml_, labelItemsFor_, runLabelReport accept an
 *        optional year param; menu calls auto-detect latest coach year. genReportPdf
 *        now also overrides raw_coaches_tab / annotations_coaches_tab when year set.
 * v0.30: fix ugly shirt-pickup timestamps — readAnnotations_ now formats Date objects
 *        with Utilities.formatDate instead of letting String(date) produce the raw JS format.
 * v0.29: auto-detect season year on import — detectYear_() scans CSV rows for a
 *        year >= 2023 (season years, never birth years) and routes the import to
 *        Raw_YYYY + Annotations_YYYY automatically. No prompting needed.
 * v0.28: multi-season support — readAnnotations_ + applyTeam_ accept optional tabName;
 *        genReportPdf accepts year param, overrides raw_tab/annotations_tab when set.
 * v0.27: added Uniform Labels report (Avery 5395) — Team / First Last / Shirt Size
 *        on each badge; menu item + web-app reportKey 'uniformtags'.
 * v0.26: ROSTER FIELDS now uses real checkboxes instead of typed TRUE/FALSE.
 *        New menu item "Set up Roster Fields (checkboxes)" writes the section to
 *        the Config tab with a checkbox per field (defaults pre-checked) plus a
 *        label column; check/uncheck to show/hide, drag rows to reorder. The
 *        reader already accepts booleans, so no logic change was needed.
 * v0.25: Team Roster columns are now config-toggleable. A "ROSTER FIELDS" section
 *        in the Config sheet (field key | TRUE/FALSE) picks which columns show and
 *        in what order (row order = column order). No ROSTER FIELDS section = the
 *        previous default columns. Director can change fields any time.
 * v0.24: Team Rosters — drop email, keep shirt on one line, and pick a specific
 *        team (or all) via a picker.
 * v0.23: added Team Rosters report — one page per team (coach handout) with
 *        contact + medical/allergies; added allergies/medical to COLUMN_MAP.
 * v0.22: added a larger roll stock (Dymo 30256, ~2.3 x 4) — fits name badges too.
 * v0.21: support continuous ROLL labels (1-up, one label per page) for thermal
 *        label printers — added a Dymo 30252 placeholder stock.
 * v0.20: label reports get a Sort option (by team / by last name) and a
 *        "new sheet per team" toggle, in both the Sheets picker and web app.
 * v0.19: file name in header.
 * v0.18: reports runnable from the web app — genReportPdf() returns a downloadable
 *        PDF (gated by the coach code); uniform/coach-roster HTML builders extracted.
 * v0.17: Coach Name Tags as a separate label report; player name tags = players only.
 * v0.16: coaches supported — import routes Coach files to a Raw_Coaches tab
 *        (players untouched); name tags include coaches; new Coach Roster report.
 * v0.15: label reports now open a stock PICKER (choose any template in
 *        LABEL_TEMPLATES) before generating. Add a stock = one registry row.
 * v0.14: corrected Avery 5395 geometry to the official spec (top 0.594 / left 0.688 /
 *        horiz pitch 3.749 / vert pitch 2.493).
 * v0.13: name tags drop the org line (less ink); all black.
 * v0.12: name tags printed all black (no color ink).
 * v0.11: added Name Tags report (Avery 5395 badges), grouped by team order.
 * v0.10: added payment_status to COLUMN_MAP (used by the search app's Paid column).
 * v0.9: fix Uniform List rendering — team-header banners + row striping use
 *       table cells (Google's PDF converter fills <td>, not <div>).
 * v0.8: one-time "Backfill teams from MASTER" — pulls Current Team from the old
 *       MASTER sheet, matches players by name (exact + last-name/initial near-miss),
 *       and writes team_override into Annotations (blank cells only).
 * v0.7: added Uniform List report (grouped by team + shirt-size totals);
 *       team resolution honors the Source-of-Record dial (override wins).
 * v0.6: cleaner label typography — tight 3-line address block, no vertical gap.
 * v0.5: clean literal "null"/"NA" values from Raw; tidy city/state/zip on labels.
 * v0.4: added the Avery label engine + Address Labels (Avery 5160) report,
 *       and a Reports submenu. (Engine is reused by name badges later.)
 * v0.3: authorizeDrive() helper (grant the Drive scope the importer needs).
 * v0.2: single "Config" tab; column map + field list live here in code.
 *
 * Bound to the registration workbook. Reads Config from the SEPARATE membership
 * Config sheet (CONFIG_SHEET_ID). Raw + Annotations tabs live in this workbook.
 */

// ── Set once: the Google Sheet ID of your dedicated membership Config file ──
var CONFIG_SHEET_ID = '1eKgwPS1dRvpXQGY8TnnxhcNrvWuS4tSf9TBQNhjktXM';

// GotSport column map (internal field → exact export header).
var COLUMN_MAP = {
  reg_id: 'Registration ID', role: 'Role', program: 'Program',
  first: 'First Name', last: 'Last Name', gender: 'Gender', dob: 'DOB',
  age_group: 'Age Group', email: 'Contact Email', phone: 'Phone',
  team_gotsport: 'Team Name', shirt_size: 'T-Shirt Size', payment_status: 'Payment Status',
  allergies: 'Allergies', medical: 'Medical Conditions',
  g1_first: 'Guardian 1 First Name', g1_last: 'Guardian 1 Last Name',
  g1_addr: 'Guardian 1 Address', g1_addr2: 'Guardian 1 Address (Continued)',
  g1_city: 'Guardian 1 City', g1_state: 'Guardian 1 State/Province',
  g1_zip: 'Guardian 1 Postal Code',
  gotsport_pref: 'Please choose which team would be the best fit for your player. **We might have to adjust requests based on team sizes**'
};

// One-time team backfill source: the old MASTER sheet (now SDTSAdmin-owned).
var MASTER_SHEET_ID = '1OK08E4NwwgCO2apBdJLDvW4fhxna1vbgoTuHigvM2dg';

// Sticky fields kept per Registration ID (the Annotations tab header).
var ANNOTATION_FIELDS = [
  'reg_id', 'type', 'note', 'shirt_picked_up',
  'team_override', 'team_override_by', 'team_override_at', 'team_override_status',
  'banquet_count', 'fall_classic', 'consent', 'last_updated', 'updated_by'
];

// Avery label/badge geometry (inches). Add a stock here to support it.
var LABEL_TEMPLATES = {
  'Avery 5160': { cols: 3, rows: 10, labelW: 2.625, labelH: 1.0,   top: 0.5, left: 0.1875, pitchX: 2.75,   pitchY: 1.0 },
  'Avery 5395': { cols: 2, rows: 4,  labelW: 3.375, labelH: 2.333, top: 0.594, left: 0.688, pitchX: 3.749, pitchY: 2.493 },
  // Continuous ROLL stock for thermal label printers (Dymo/Brother). 1-up; one label per page.
  // Placeholders — swap labelW/labelH (or the name) to match the actual roll you buy.
  'Dymo 30252 (roll)':       { roll: true, labelW: 3.5, labelH: 1.125 },  // address size
  'Dymo 30256 (large roll)': { roll: true, labelW: 4.0, labelH: 2.3125 }  // shipping size — fits badges
};

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var reportsMenu = ui.createMenu('Reports')
    .addItem('Address Labels (Avery 5160)', 'reportAddressLabels')
    .addItem('Name Tags (Avery 5395)', 'reportNameTags')
    .addItem('Coach Name Tags (Avery 5395)', 'reportCoachTags')
    .addItem('Uniform Labels (Avery 5395)', 'reportUniformTags')
    .addItem('Uniform List', 'reportUniformList')
    .addItem('Team Rosters (per coach)', 'reportTeamRosters')
    .addItem('Coach Roster', 'reportCoachRoster');
  // Add CSV export only when csv_roster = true in Config.
  try {
    var c = getConfig_();
    if (rosterOn_(c.settings['csv_roster'])) {
      reportsMenu.addSeparator().addItem('Team Rosters CSV', 'reportTeamRostersCsv');
    }
  } catch (e) {}  // silently skip if config unavailable at open time
  ui.createMenu('TOPSoccer')
    .addItem('Import Latest Download', 'importLatestDownload')
    .addItem('Rebuild Annotation rows', 'rebuildAnnotations')
    .addItem('Carry over teams from previous season', 'carryOverTeams')
    .addItem('Backfill teams from MASTER (one-time)', 'backfillTeamsFromMaster')
    .addSeparator()
    .addSubMenu(reportsMenu)
    .addSeparator()
    .addItem('Send Text Blast…', 'sendTextBlast')
    .addItem('Send Test Text', 'sendTestText')
    .addSeparator()
    .addItem('Set up Roster Fields (checkboxes)', 'setupRosterFields')
    .addItem('Show Config check', 'showConfigCheck')
    .addToUi();
}

/** ── Config ── */
function getConfig_() {
  if (!CONFIG_SHEET_ID || CONFIG_SHEET_ID.indexOf('PASTE') === 0)
    throw new Error('Set CONFIG_SHEET_ID at the top of the script first.');
  var vals = SpreadsheetApp.openById(CONFIG_SHEET_ID).getSheetByName('Config')
               .getDataRange().getValues();
  var settings = {}, teams = {}, roster = {}, rosterOrder = [], section = '';
  for (var i = 0; i < vals.length; i++) {
    var a = String(vals[i][0]).trim(), b = vals[i][1], up = a.toUpperCase();
    if (up.indexOf('SETTINGS') === 0) { section = 'settings'; continue; }
    if (up.indexOf('TEAMS') === 0)    { section = 'teams';    continue; }
    if (up.indexOf('ROSTER') === 0)   { section = 'roster';   continue; }
    if (up.indexOf('NOTES') === 0)    { section = '';         continue; }
    if (!a || b === '' || b === null) continue;
    if (section === 'settings') settings[a] = String(b).trim();
    else if (section === 'teams') teams[a] = b;
    else if (section === 'roster') { var rk = a.toLowerCase(); roster[rk] = b; rosterOrder.push(rk); }
  }
  return { settings: settings, teams: teams, roster: roster, rosterOrder: rosterOrder };
}

/** ── Import ── */
function importLatestDownload() {
  var c = getConfig_();
  var folderId = c.settings['drop_folder_id'];
  if (!folderId) throw new Error('Set drop_folder_id in the Config tab.');
  var folder = DriveApp.getFolderById(folderId);

  var files = folder.getFilesByType(MimeType.CSV), newest = null;
  while (files.hasNext()) {
    var f = files.next();
    if (!newest || f.getDateCreated() > newest.getDateCreated()) newest = f;
  }
  if (!newest) { SpreadsheetApp.getUi().alert('No CSV found in the Drop folder.'); return; }

  var s = importFile_(newest, c);

  var subName = c.settings['imported_subfolder'] || 'Imported';
  var subs = folder.getFoldersByName(subName);
  var sub = subs.hasNext() ? subs.next() : folder.createFolder(subName);
  newest.moveTo(sub);

  var mergeNote = '';
  if (s.merge) {
    mergeNote = 'Merge: ' + s.merge.updated + ' updated, ' + s.merge.added + ' new, ' +
                s.merge.preserved + ' manually-added coaches preserved.\n';
  }
  SpreadsheetApp.getUi().alert(
    'Imported: ' + newest.getName() + '\n\n' +
    s.rows + ' rows → ' + s.rawTab + (s.year ? '  (season ' + s.year + ' detected)' : '') + '\n' +
    mergeNote +
    s.newAnnotations + ' new annotation rows (sticky data preserved).');
}

// Scan the first 20 rows of a CSV body for a 4-digit year >= 2023.
// Years >= 2023 cannot be player birth years, so they must be season years.
function detectYear_(body) {
  var re = /\b(20[2-9]\d)\b/;
  var sample = body.slice(0, Math.min(20, body.length));
  for (var i = 0; i < sample.length; i++) {
    for (var j = 0; j < sample[i].length; j++) {
      var m = String(sample[i][j]).match(re);
      if (m && Number(m[1]) >= 2023) return m[1];
    }
  }
  return null;
}

function importFile_(file, c) {
  var rows = Utilities.parseCsv(file.getBlob().getDataAsString());
  if (rows.length < 2) throw new Error('CSV looks empty.');
  var header = rows[0].map(function (h) { return String(h).replace(/^﻿/, '').trim(); });
  var body = rows.slice(1).filter(function (r) { return r.join('').trim() !== ''; });

  var ridHeader = c.settings['registration_id_header'] || COLUMN_MAP.reg_id;
  var ridIdx = header.indexOf(ridHeader);
  if (ridIdx === -1) throw new Error('Registration ID column "' + ridHeader + '" not found in CSV.');
  var roleIdx = header.indexOf(COLUMN_MAP.role);

  // Route Coach files to Raw_Coaches; players to Raw_YYYY (auto-detected) or Raw.
  var coachCt = roleIdx >= 0 ? body.filter(function (r) { return /coach/i.test(r[roleIdx] || ''); }).length : 0;
  var isCoach = coachCt > body.length / 2;
  var detectedYear = detectYear_(body);
  var rawTab = isCoach
    ? (detectedYear ? 'Raw_Coaches_' + detectedYear : (c.settings['raw_coaches_tab'] || 'Raw_Coaches'))
    : (detectedYear ? 'Raw_' + detectedYear : (c.settings['raw_tab'] || 'Raw'));
  var annTab = isCoach
    ? (detectedYear ? 'Annotations_Coaches_' + detectedYear : (c.settings['annotations_coaches_tab'] || 'Annotations_Coaches'))
    : (detectedYear ? 'Annotations_' + detectedYear : (c.settings['annotations_tab'] || 'Annotations'));

  var ss = SpreadsheetApp.getActive();
  var mergeResult = null;
  if (isCoach) {
    // Merge: preserve manually-added coaches; upsert by Registration ID.
    mergeResult = mergeCoachTab_(ss, rawTab, header, body, ridIdx);
  } else {
    // Players: full replace (GOT Soccer export is always the complete list).
    var raw = ensureSheet_(ss, rawTab);
    raw.clearContents();
    raw.getRange(1, 1, body.length + 1, header.length).setValues([header].concat(body));
  }

  var newCount = ensureAnnotations_(ss, c, body, ridIdx, roleIdx, annTab);
  return { rows: body.length, rawTab: rawTab, year: detectedYear, newAnnotations: newCount, merge: mergeResult };
}

// Resolve the Raw and Annotations tab names for coach data given an optional year.
// Merge a coach CSV import into an existing Raw_Coaches_YYYY tab.
// Rows matched by Registration ID are updated in-place; new IDs are appended;
// rows already in the tab but absent from the CSV (manually added) are left untouched.
// Returns { updated, added, preserved }.
function mergeCoachTab_(ss, rawTab, header, body, ridIdx) {
  var sh = ensureSheet_(ss, rawTab);

  if (sh.getLastRow() === 0) {
    // Brand-new tab — just write header + all rows.
    sh.getRange(1, 1, body.length + 1, header.length).setValues([header].concat(body));
    return { updated: 0, added: body.length, preserved: 0 };
  }

  var existing = sh.getDataRange().getValues();
  var exHdr = existing[0];
  var ridColName = header[ridIdx];
  var exRidIdx = exHdr.indexOf(ridColName);

  // Index existing rows by Registration ID.
  var byId = {};
  for (var i = 1; i < existing.length; i++) {
    var id = exRidIdx >= 0 ? String(existing[i][exRidIdx]).trim() : '';
    if (id) byId[id] = i;
  }

  // Map each CSV column to its position in the existing header (by name).
  var colMap = header.map(function (h) { return exHdr.indexOf(h); });

  var updated = 0, added = 0;
  var toAppend = [];

  body.forEach(function (csvRow) {
    var id = String(csvRow[ridIdx]).trim();
    if (!id) return;
    if (byId[id] !== undefined) {
      // Update existing row in memory.
      var exRow = existing[byId[id]];
      header.forEach(function (h, ci) {
        var ec = colMap[ci];
        if (ec >= 0) exRow[ec] = csvRow[ci];
      });
      updated++;
    } else {
      // New coach — map to existing header columns.
      var mapped = exHdr.map(function () { return ''; });
      header.forEach(function (h, ci) {
        var ec = colMap[ci];
        if (ec >= 0) mapped[ec] = csvRow[ci];
      });
      toAppend.push(mapped);
      added++;
    }
  });

  // Write back updated rows.
  sh.getDataRange().setValues(existing);

  // Append new rows.
  if (toAppend.length) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, exHdr.length).setValues(toAppend);
  }

  var preserved = (existing.length - 1) - updated;  // rows already there that weren't in the CSV
  return { updated: updated, added: added, preserved: preserved };
}

// Resolve the coach year to actually READ: the requested year if its Raw_Coaches_YYYY
// tab exists, otherwise the latest coach year that does. Keeps coach reports working when
// a season has players registered but no coach import yet (e.g. a fresh 2026 with only
// Raw_Coaches_2025 present). Import writes the true season tab directly and never calls this.
function resolveCoachYear_(year) {
  if (year && SpreadsheetApp.getActive().getSheetByName('Raw_Coaches_' + year)) return year;
  return getLatestCoachYear_() || year || null;
}
function resolveCoachRawTab_(c, year) {
  var y = resolveCoachYear_(year);
  return y ? 'Raw_Coaches_' + y : (c.settings['raw_coaches_tab'] || 'Raw_Coaches');
}
function resolveCoachAnnTab_(c, year) {
  var y = resolveCoachYear_(year);
  return y ? 'Annotations_Coaches_' + y : (c.settings['annotations_coaches_tab'] || 'Annotations_Coaches');
}
// Returns the most recently detected coach year (for Sheets-menu calls that have no explicit year).
function getLatestCoachYear_() {
  var sheets = SpreadsheetApp.getActive().getSheets();
  var years = [];
  sheets.forEach(function (s) {
    var m = s.getName().match(/^Raw_Coaches_(\d{4})$/);
    if (m) years.push(m[1]);
  });
  years.sort().reverse();
  return years.length ? years[0] : null;
}

function ensureAnnotations_(ss, c, body, ridIdx, roleIdx, annTab) {
  var sh = ensureSheet_(ss, annTab || c.settings['annotations_tab'] || 'Annotations');
  if (sh.getLastRow() === 0) sh.appendRow(ANNOTATION_FIELDS);

  var existing = {};
  if (sh.getLastRow() > 1)
    sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
      .forEach(function (r) { existing[String(r[0]).trim()] = true; });

  var tIdx = ANNOTATION_FIELDS.indexOf('type'), add = [];
  body.forEach(function (r) {
    var id = String(r[ridIdx]).trim();
    if (id && !existing[id]) {
      existing[id] = true;
      var row = ANNOTATION_FIELDS.map(function () { return ''; });
      row[0] = id;
      if (tIdx !== -1) row[tIdx] = (roleIdx !== -1 && /coach/i.test(r[roleIdx] || '')) ? 'Coach' : 'Player';
      add.push(row);
    }
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, ANNOTATION_FIELDS.length).setValues(add);
  return add.length;
}

function rebuildAnnotations() {
  var c = getConfig_(), ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(c.settings['raw_tab'] || 'Raw');
  if (!sh || sh.getLastRow() < 2) { SpreadsheetApp.getUi().alert('No Raw data to scan.'); return; }
  var vals = sh.getDataRange().getValues();
  var ridIdx = vals[0].indexOf(c.settings['registration_id_header'] || COLUMN_MAP.reg_id);
  var roleIdx = vals[0].indexOf(COLUMN_MAP.role);
  var n = ensureAnnotations_(ss, c, vals.slice(1), ridIdx, roleIdx);
  SpreadsheetApp.getUi().alert(n + ' new annotation rows added.');
}

function ensureSheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

function norm_(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase(); }

/** ── Team Carryover ── */

// Returns all years that have a Raw_YYYY player tab, newest first.
function getAvailablePlayerYears_() {
  var sheets = SpreadsheetApp.getActive().getSheets();
  var years = [];
  sheets.forEach(function (s) {
    var m = s.getName().match(/^Raw_(\d{4})$/);
    if (m) years.push(m[1]);
  });
  years.sort().reverse();
  return years;
}

// Menu entry: carry team assignments forward from the most recent prior season.
// Matches by first+last+DOB (exact), then exact name alone (if unique in source),
// then last+initial+DOB near-miss. Only writes to blank team_override cells.
function carryOverTeams() {
  var years = getAvailablePlayerYears_();
  if (years.length < 2) {
    SpreadsheetApp.getUi().alert(
      'Need at least two seasons of player data.\n' +
      'Import the new season CSV first, then run this.');
    return;
  }

  var targetYear = years[0];  // newest
  var sourceYear = years[1];  // previous

  var c = getConfig_();
  var srcAnn = readAnnotations_(c, 'Annotations_' + sourceYear);
  var withTeam = Object.keys(srcAnn).filter(function (id) {
    return (srcAnn[id].team_override || '').trim();
  }).length;

  if (!withTeam) {
    SpreadsheetApp.getUi().alert(
      'No team assignments found in ' + sourceYear + '.\nNothing to carry over.');
    return;
  }

  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'Carry over teams ' + sourceYear + ' → ' + targetYear + '?',
    sourceYear + ' has ' + withTeam + ' players with team assignments.\n\n' +
    'Players already assigned in ' + targetYear + ' will not be changed.\n' +
    'New registrants with no prior match will be left unassigned.\n\nContinue?',
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  var result = runCarryOver_(sourceYear, targetYear, c);

  ui.alert(
    'Team carryover complete',
    'Exact matches:   ' + result.exact + '\n' +
    'Near-misses:     ' + result.near + '\n' +
    'Already assigned (kept):  ' + result.skipped + '\n' +
    'New players (no match):   ' + result.unmatched + '\n\n' +
    (result.unmatched > 0
      ? 'Assign unmatched players via the web app team dropdown.'
      : 'All returning players matched — review and adjust in the web app as needed.'),
    ui.ButtonSet.OK);
}

// Core carryover logic. Returns { exact, near, skipped, unmatched }.
function runCarryOver_(sourceYear, targetYear, c) {
  // ── Build lookup maps from source season ──
  var srcRaw = getRawRecords_(c, 'Raw_' + sourceYear);
  applyTeam_(c, srcRaw, 'Annotations_' + sourceYear);

  // Three indexes — each maps a key to the team (only kept when unique in source).
  var byExact = {};               // norm_first|norm_last|dob  → team
  var byName  = {};               // norm_first|norm_last       → {team, n}
  var byNear  = {};               // norm_last|first_initial|dob → {team, n}

  srcRaw.forEach(function (r) {
    if (!r.team) return;
    var nf = norm_(r.first), nl = norm_(r.last), dob = (r.dob || '').trim();
    byExact[nf + '|' + nl + '|' + dob] = r.team;
    var nk = nf + '|' + nl;
    byName[nk] = byName[nk] ? { team: byName[nk].team, n: byName[nk].n + 1 } : { team: r.team, n: 1 };
    if (dob) {
      var nearK = nl + '|' + nf.charAt(0) + '|' + dob;
      byNear[nearK] = byNear[nearK] ? { team: byNear[nearK].team, n: byNear[nearK].n + 1 } : { team: r.team, n: 1 };
    }
  });

  // ── Match each target player ──
  var tgtRaw = getRawRecords_(c, 'Raw_' + targetYear);
  var tgtAnn = readAnnotations_(c, 'Annotations_' + targetYear);
  var updates = {};   // reg_id → team (only players that need writing)
  var exact = 0, near = 0, skipped = 0, unmatched = 0;

  tgtRaw.forEach(function (r) {
    // Skip if already has a team assignment this season.
    if ((tgtAnn[r.reg_id] || {}).team_override) { skipped++; return; }

    var nf = norm_(r.first), nl = norm_(r.last), dob = (r.dob || '').trim();
    var team = null, type = null;

    // 1. Exact: first + last + DOB.
    team = byExact[nf + '|' + nl + '|' + dob];
    if (team) { type = 'exact'; }

    // 2. Exact name, no DOB required (only safe when the name is unique in the source).
    if (!team) {
      var n = byName[nf + '|' + nl];
      if (n && n.n === 1) { team = n.team; type = 'name'; }
    }

    // 3. Near-miss: last name + first initial + DOB.
    if (!team && dob) {
      var nb = byNear[nl + '|' + nf.charAt(0) + '|' + dob];
      if (nb && nb.n === 1) { team = nb.team; type = 'near'; }
    }

    if (team) {
      updates[r.reg_id] = team;
      if (type === 'near') near++; else exact++;
    } else {
      unmatched++;
    }
  });

  // ── Batch write to Annotations_targetYear ──
  if (Object.keys(updates).length) {
    var ss = SpreadsheetApp.getActive();
    var sh = ensureSheet_(ss, 'Annotations_' + targetYear);
    if (sh.getLastRow() === 0) sh.appendRow(ANNOTATION_FIELDS);
    var vals = sh.getDataRange().getValues(), hdr = vals[0];
    var idC = hdr.indexOf('reg_id'),      ovC = hdr.indexOf('team_override'),
        byC = hdr.indexOf('team_override_by'), atC = hdr.indexOf('team_override_at'),
        luC = hdr.indexOf('last_updated'), ubC = hdr.indexOf('updated_by');
    var now = new Date(), source = 'Season carryover from ' + sourceYear;

    for (var i = 1; i < vals.length; i++) {
      var id = String(vals[i][idC]).trim();
      if (updates[id] && !String(vals[i][ovC] || '').trim()) {
        vals[i][ovC] = updates[id];
        if (byC >= 0) vals[i][byC] = source;
        if (atC >= 0) vals[i][atC] = now;
        if (luC >= 0) vals[i][luC] = now;
        if (ubC >= 0) vals[i][ubC] = 'carryover';
        delete updates[id];
      }
    }
    sh.getDataRange().setValues(vals);

    // Any reg_ids that didn't have an existing Annotations row yet (edge case).
    var remaining = Object.keys(updates);
    if (remaining.length) {
      var newRows = remaining.map(function (id) {
        var row = ANNOTATION_FIELDS.map(function () { return ''; });
        row[idC] = id;
        if (ovC >= 0) row[ovC] = updates[id];
        if (byC >= 0) row[byC] = source;
        if (atC >= 0) row[atC] = now;
        if (luC >= 0) row[luC] = now;
        if (ubC >= 0) row[ubC] = 'carryover';
        return row;
      });
      sh.getRange(sh.getLastRow() + 1, 1, newRows.length, ANNOTATION_FIELDS.length).setValues(newRows);
    }
  }

  return { exact: exact, near: near, skipped: skipped, unmatched: unmatched };
}

// One-time: pull Current Team from the old MASTER sheet into team_override (blank cells only).
function backfillTeamsFromMaster() {
  var c = getConfig_();
  var msrc = SpreadsheetApp.openById(MASTER_SHEET_ID).getSheetByName('Master');
  if (!msrc) throw new Error('A tab named "Master" was not found in the MASTER sheet.');
  var mv = msrc.getDataRange().getValues();
  var mh = mv[0].map(function (h) { return String(h).replace(/\s+/g, ' ').trim().toLowerCase(); });
  var fi = mh.indexOf('first'), li = mh.indexOf('last'), ti = mh.indexOf('current team');
  if (fi < 0 || li < 0 || ti < 0) throw new Error('MASTER is missing First / Last / Current Team columns.');

  var byName = {}, byLastInit = {};
  for (var i = 1; i < mv.length; i++) {
    var f = norm_(mv[i][fi]), l = norm_(mv[i][li]), t = String(mv[i][ti] || '').replace(/\s+/g, ' ').trim();
    if ((!f && !l) || !t) continue;
    byName[f + '|' + l] = t;
    var k = l + '|' + f.charAt(0);
    (byLastInit[k] = byLastInit[k] || {})[t] = true;
  }

  var recs = getRawRecords_(c), assign = {}, nExact = 0, nNear = 0;
  recs.forEach(function (r) {
    var f = norm_(r.first), l = norm_(r.last);
    var t = byName[f + '|' + l];
    if (t) { assign[r.reg_id] = t; nExact++; return; }
    var set = byLastInit[l + '|' + f.charAt(0)];
    if (set) { var ts = Object.keys(set); if (ts.length === 1) { assign[r.reg_id] = ts[0]; nNear++; } }
  });

  var ash = SpreadsheetApp.getActive().getSheetByName(c.settings['annotations_tab'] || 'Annotations');
  var av = ash.getDataRange().getValues(), ah = av[0];
  var idC = ah.indexOf('reg_id'), ovC = ah.indexOf('team_override'),
      byC = ah.indexOf('team_override_by'), atC = ah.indexOf('team_override_at');
  if (ovC < 0) throw new Error('Annotations has no team_override column.');
  var now = new Date(), written = 0, skipped = 0;
  for (var j = 1; j < av.length; j++) {
    var id = String(av[j][idC]).trim(), t2 = assign[id];
    if (t2 === undefined) continue;
    if (String(av[j][ovC] || '').trim() === '') {
      av[j][ovC] = t2;
      if (byC >= 0) av[j][byC] = 'MASTER backfill';
      if (atC >= 0) av[j][atC] = now;
      written++;
    } else skipped++;
  }
  ash.getDataRange().setValues(av);

  SpreadsheetApp.getUi().alert(
    'Team backfill from MASTER\n\n' +
    'Exact name matches: ' + nExact + '\n' +
    'Near-misses (last name + initial): ' + nNear + '\n' +
    'Written to Annotations: ' + written +
    (skipped ? '\nSkipped (already had a team): ' + skipped : '') + '\n' +
    'Left unassigned: ' + (recs.length - nExact - nNear));
}

// Run this ONCE from the editor to grant the Drive permission the importer needs.
function authorizeDrive() { DriveApp.getRootFolder().getName(); }

/** ───────────────────────── Reports ───────────────────────── */

// Read the Raw tab into objects keyed by internal field name (via COLUMN_MAP).
function getRawRecords_(c, tabName) {
  var sh = SpreadsheetApp.getActive().getSheetByName(tabName || c.settings['raw_tab'] || 'Raw');
  if (!sh || sh.getLastRow() < 2) return [];   // empty/missing tab → no records
  var vals = sh.getDataRange().getValues(), header = vals[0], idx = {};
  for (var k in COLUMN_MAP) { var col = header.indexOf(COLUMN_MAP[k]); if (col !== -1) idx[k] = col; }
  return vals.slice(1).map(function (row) {
    var o = {};
    for (var k in idx) {
      var v = String(row[idx[k]] == null ? '' : row[idx[k]]).trim();
      o[k] = /^(null|na|n\/a)$/i.test(v) ? '' : v;   // GotSport emits literal "null" sometimes
    }
    return o;
  }).filter(function (o) { return o.reg_id; });
}

function sortLastFirst_(a, b) {
  var k = (a.last + ' ' + a.first).toLowerCase(), l = (b.last + ' ' + b.first).toLowerCase();
  return k < l ? -1 : k > l ? 1 : 0;
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Generic Avery engine. `items` are strings or {html, group}. opts.newSheetPerTeam
// starts a fresh sheet whenever the group (team) changes.
function labelSheetsHtml_(t, items, opts) {
  opts = opts || {};
  var list = items.map(function (it) { return (typeof it === 'string') ? { html: it, group: '' } : it; });

  // ROLL stock: 1-up, each label is its own page sized to the label.
  if (t.roll) {
    var rcss =
      '@page{size:' + t.labelW + 'in ' + t.labelH + 'in;margin:0;}' +
      'body{margin:0;font-family:Arial,Helvetica,sans-serif;}' +
      '.rl{width:' + t.labelW + 'in;height:' + t.labelH + 'in;overflow:hidden;box-sizing:border-box;' +
      'padding:0 0.12in;color:#111;display:flex;flex-direction:column;justify-content:center;' +
      'font-size:11pt;line-height:1.28;page-break-after:always;}' +
      '.rl .nm{font-weight:bold;}';
    var rhtml = '<html><head><meta charset="utf-8"><style>' + rcss + '</style></head><body>';
    list.forEach(function (it) { rhtml += '<div class="rl">' + it.html + '</div>'; });
    return rhtml + '</body></html>';
  }

  var per = t.cols * t.rows;

  // chunk into sheets
  var sheets = [], cur = [], lastGroup = null;
  list.forEach(function (it) {
    if (opts.newSheetPerTeam && lastGroup !== null && it.group !== lastGroup && cur.length) { sheets.push(cur); cur = []; }
    if (cur.length === per) { sheets.push(cur); cur = []; }
    cur.push(it.html);
    lastGroup = it.group;
  });
  if (cur.length) sheets.push(cur);

  var css =
    '@page{size:letter;margin:0;}' +
    'body{margin:0;font-family:Arial,Helvetica,sans-serif;}' +
    '.sheet{position:relative;width:8.5in;height:11in;page-break-after:always;}' +
    '.label{position:absolute;width:' + t.labelW + 'in;height:' + t.labelH + 'in;' +
    'overflow:hidden;box-sizing:border-box;padding:0 0.22in;color:#111;' +
    'display:flex;flex-direction:column;justify-content:center;' +
    'font-size:11pt;line-height:1.32;}' +
    '.label .nm{font-weight:bold;}';
  var html = '<html><head><meta charset="utf-8"><style>' + css + '</style></head><body>';
  sheets.forEach(function (slice) {
    html += '<div class="sheet">';
    for (var j = 0; j < slice.length; j++) {
      var col = j % t.cols, r = Math.floor(j / t.cols);
      var left = (t.left + col * t.pitchX).toFixed(4);
      var top = (t.top + r * t.pitchY).toFixed(4);
      html += '<div class="label" style="left:' + left + 'in;top:' + top + 'in;">' + slice[j] + '</div>';
    }
    html += '</div>';
  });
  return html + '</body></html>';
}

function reportsFolder_() {
  var name = 'TOPSoccer Reports';
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function showLink_(title, url) {
  var html = HtmlService.createHtmlOutput(
    '<p style="font:14px Arial">Your PDF is ready in the <b>TOPSoccer Reports</b> Drive folder.</p>' +
    '<p><a href="' + url + '" target="_blank" style="font:14px Arial">Open / download the PDF &raquo;</a></p>')
    .setWidth(380).setHeight(130);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}

// Menu entry points → open the stock picker (default stock + sort per report).
function reportAddressLabels() { openLabelPicker_('address', 'Address Labels', 'Avery 5160', 'last'); }
function reportNameTags()      { openLabelPicker_('nametags',    'Name Tags',       'Avery 5395', 'team'); }
function reportCoachTags()     { openLabelPicker_('coachtags',   'Coach Name Tags',  'Avery 5395', 'last'); }
function reportUniformTags()   { openLabelPicker_('uniformtags', 'Uniform Labels',   'Avery 5395', 'team'); }

function badgeHtml_(first, last, sub) {
  return '<div style="text-align:center;width:100%;color:#000000">' +
    '<div style="font-size:26pt;font-weight:bold;margin:0 0 2px">' + esc_(first) + '</div>' +
    (last ? '<div style="font-size:13pt;margin-bottom:4px">' + esc_(last) + '</div>' : '') +
    (sub ? '<div style="font-size:14pt;font-weight:bold">' + esc_(sub) + '</div>' : '') +
    '</div>';
}

// Uniform label: Team (top) / First Last (large) / Shirt Size (bottom).
function uniformBadgeHtml_(first, last, team, shirtSize) {
  return '<div style="text-align:center;width:100%;color:#000000">' +
    (team ? '<div style="font-size:11pt;font-weight:bold;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.04em">' + esc_(team) + '</div>' : '') +
    '<div style="font-size:22pt;font-weight:bold;line-height:1.1;margin-bottom:4px">' + esc_(first) + ' ' + esc_(last) + '</div>' +
    (shirtSize ? '<div style="font-size:13pt;margin-top:2px">Size: <b>' + esc_(shirtSize) + '</b></div>' : '') +
    '</div>';
}

// Sort records by 'last' (alphabetical) or 'team' (config order, then name).
function labelSort_(recs, sort, c) {
  if (sort === 'last') { recs.sort(sortLastFirst_); return; }
  var rank = teamRankMap_(c);
  recs.sort(function (a, b) {
    var ra = a.team ? (rank[a.team.toLowerCase()] || 5e5) : 1e9;
    var rb = b.team ? (rank[b.team.toLowerCase()] || 5e5) : 1e9;
    return (ra - rb) || sortLastFirst_(a, b);
  });
}

// Player name tags. sort = 'team' (default) | 'last'.
function nameTagItems_(c, sort) {
  var players = getRawRecords_(c, c.settings['raw_tab'] || 'Raw');
  applyTeam_(c, players);
  labelSort_(players, sort, c);
  var grp = sort !== 'last';
  return players.map(function (r) {
    return { html: badgeHtml_(r.first, r.last, r.team || ''), group: grp ? (r.team || 'Unassigned') : '' };
  });
}

// Coach name tags. sort = 'team' | 'last' (default). year auto-detected if omitted.
function coachTagItems_(c, sort, year) {
  if (year == null) year = getLatestCoachYear_();
  var coaches = getRawRecords_(c, resolveCoachRawTab_(c, year));
  applyTeam_(c, coaches, resolveCoachAnnTab_(c, year));
  labelSort_(coaches, sort, c);
  var grp = sort !== 'last';
  return coaches.map(function (r) {
    return { html: badgeHtml_(r.first, r.last, r.team ? r.team + ' Coach' : 'Coach'), group: grp ? (r.team || 'Coaches') : '' };
  });
}

// Uniform labels. sort = 'team' (default) | 'last'.
function uniformTagItems_(c, sort) {
  var players = getRawRecords_(c, c.settings['raw_tab'] || 'Raw');
  applyTeam_(c, players);
  labelSort_(players, sort, c);
  var grp = sort !== 'last';
  return players.map(function (r) {
    return { html: uniformBadgeHtml_(r.first, r.last, r.team || '', r.shirt_size || ''), group: grp ? (r.team || 'Unassigned') : '' };
  });
}

// Address-label contents from guardian addresses. sort = 'team' | 'last' (default).
function addressLabelItems_(c, sort) {
  var recs = getRawRecords_(c).filter(function (r) { return r.g1_addr && r.g1_city; });
  applyTeam_(c, recs);
  labelSort_(recs, sort, c);
  var grp = sort !== 'last';
  return recs.map(function (r) {
    var name = esc_((r.first + ' ' + r.last).replace(/\s+/g, ' ').trim());
    var street = esc_(r.g1_addr + (r.g1_addr2 ? ' ' + r.g1_addr2 : ''));
    var cityState = [r.g1_city, r.g1_state].filter(function (x) { return x; }).join(', ');
    var csz = esc_(((cityState + ' ' + r.g1_zip).replace(/\s+/g, ' ')).trim());
    var h = '<div class="nm">' + name + '</div>' +
            (street ? '<div>' + street + '</div>' : '') +
            (csz ? '<div>' + csz + '</div>' : '');
    return { html: h, group: grp ? (r.team || 'Unassigned') : '' };
  });
}

// Build label items for a report key + sort. Shared by menu + web app.
// year is passed through to coach reports; player reports use config/current tab.
function labelItemsFor_(c, reportKey, sort, year) {
  if (reportKey === 'address')     return { items: addressLabelItems_(c, sort),         base: 'Address Labels' };
  if (reportKey === 'nametags')    return { items: nameTagItems_(c, sort),              base: 'Name Tags' };
  if (reportKey === 'coachtags')   return { items: coachTagItems_(c, sort, year),       base: 'Coach Name Tags' };
  if (reportKey === 'uniformtags') return { items: uniformTagItems_(c, sort),           base: 'Uniform Labels' };
  throw new Error('Unknown report: ' + reportKey);
}

// Generate a label PDF (Sheets menu flavor → saves to Drive); returns {url,name,count}.
// year is optional; when omitted, coach reports auto-detect the latest coach year.
function runLabelReport(reportKey, templateName, sort, newSheet, year) {
  var c = getConfig_();
  var t = LABEL_TEMPLATES[templateName];
  if (!t) throw new Error('Unknown label stock: ' + templateName);
  sort = sort || 'team';
  var r = labelItemsFor_(c, reportKey, sort, year || null);
  if (!r.items.length) throw new Error('No records to print.');

  var html = labelSheetsHtml_(t, r.items, { newSheetPerTeam: !!newSheet && sort === 'team' });
  var pdf = Utilities.newBlob(html, 'text/html', 'labels.html').getAs('application/pdf');
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var file = reportsFolder_().createFile(pdf.setName(r.base + ' (' + templateName + ') — ' + stamp + '.pdf'));
  return { url: file.getUrl(), name: file.getName(), count: r.items.length };
}

// Modal stock + sort picker → calls runLabelReport.
function openLabelPicker_(reportKey, title, defaultTemplate, defaultSort) {
  defaultSort = defaultSort || 'team';
  var opts = Object.keys(LABEL_TEMPLATES).map(function (n) {
    return '<option value="' + n + '"' + (n === defaultTemplate ? ' selected' : '') + '>' + n + '</option>';
  }).join('');
  var sortOpts =
    '<option value="team"' + (defaultSort === 'team' ? ' selected' : '') + '>By team, then name</option>' +
    '<option value="last"' + (defaultSort === 'last' ? ' selected' : '') + '>By last name</option>';
  var html =
    '<div style="font:14px Arial,sans-serif">' +
      '<p style="margin:0 0 4px">Label / badge stock:</p>' +
      '<select id="tpl" style="font:14px Arial;padding:6px;width:100%;box-sizing:border-box">' + opts + '</select>' +
      '<p style="margin:10px 0 4px">Sort:</p>' +
      '<select id="sort" style="font:14px Arial;padding:6px;width:100%;box-sizing:border-box">' + sortOpts + '</select>' +
      '<label style="display:block;margin:10px 0 0"><input type="checkbox" id="nst"> Start each team on a new sheet</label>' +
      '<div style="margin-top:14px;text-align:right">' +
        '<button id="go" style="font:14px Arial;padding:7px 14px;cursor:pointer">Generate PDF</button>' +
      '</div>' +
      '<div id="out" style="margin-top:12px;min-height:18px"></div>' +
    '</div>' +
    '<script>' +
      'var go=document.getElementById("go"),out=document.getElementById("out");' +
      'go.onclick=function(){' +
        'var t=document.getElementById("tpl").value,s=document.getElementById("sort").value,n=document.getElementById("nst").checked;' +
        'go.disabled=true;go.textContent="Generating\\u2026";out.textContent="";' +
        'google.script.run' +
          '.withSuccessHandler(function(res){' +
            'go.disabled=false;go.textContent="Generate PDF";' +
            'out.innerHTML="\\u2713 "+res.count+" generated in <b>TOPSoccer Reports</b> \\u2014 <a href=\\""+res.url+"\\" target=\\"_blank\\">open the PDF</a>";' +
          '})' +
          '.withFailureHandler(function(e){go.disabled=false;go.textContent="Generate PDF";out.textContent="Error: "+(e&&e.message?e.message:e);})' +
          '.runLabelReport("' + reportKey + '",t,s,n);' +
      '};' +
    '<\/script>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(380).setHeight(300), title);
}

// Read Annotations into a map: reg_id -> { field: value }.
function readAnnotations_(c, tabName) {
  var sh = SpreadsheetApp.getActive().getSheetByName(tabName || c.settings['annotations_tab'] || 'Annotations');
  var map = {};
  if (!sh || sh.getLastRow() < 2) return map;
  var vals = sh.getDataRange().getValues(), hdr = vals[0];
  var tz = Session.getScriptTimeZone();
  for (var i = 1; i < vals.length; i++) {
    var id = String(vals[i][0]).trim();
    if (!id) continue;
    var o = {};
    for (var k = 0; k < hdr.length; k++) {
      var v = vals[i][k];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, 'M/d/yyyy h:mm a');
      o[hdr[k]] = String(v == null ? '' : v).trim();
    }
    map[id] = o;
  }
  return map;
}

// Resolve each record's team via the Source-of-Record dial (override always wins).
function applyTeam_(c, recs, annTabName) {
  var ann = readAnnotations_(c, annTabName);
  var source = (c.settings['team_source_of_record'] || 'sheets').toLowerCase();
  recs.forEach(function (r) {
    var ov = (ann[r.reg_id] || {})['team_override'] || '';
    var base = source === 'gotsport' ? r.team_gotsport : '';
    r.team = (ov || base || '').trim();
  });
}

function teamRankMap_(c) {
  var m = {};
  for (var name in c.teams) m[name.toLowerCase()] = Number(c.teams[name]) || 0;
  return m;
}

var SHIRT_ORDER = ['Youth S', 'Youth M', 'Youth L', 'Youth XL',
  'Adult S', 'Adult M', 'Adult L', 'Adult XL', 'Adult 2X', 'Adult 3X', 'Adult 4X'];

function reportCss_() {
  return '@page{size:letter;margin:0.6in 0.5in;}' +
    'body{font-family:Arial,Helvetica,sans-serif;color:#1f2733;font-size:10.5pt;margin:0;}' +
    'h1{font-size:18pt;color:#1f4e87;margin:0 0 2px;}' +
    '.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:8pt;font-weight:bold;color:#2a5fa0;}' +
    '.sub{color:#5a6473;font-size:9.5pt;margin:0 0 4px;}' +
    '.rule{border-bottom:2px solid #1f4e87;margin:8px 0 12px;}' +
    '.totals{margin:6px 0;}' +
    '.chip{display:inline-block;border:1px solid #c9d6e8;border-radius:10px;padding:2px 9px;margin:2px 4px 2px 0;font-size:9.5pt;}' +
    '.chip b{color:#1f4e87;}' +
    // table cells, not divs — the Drive PDF converter only fills <td>/<th>
    'table.grp{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10.5pt;margin-top:14px;}' +
    'td.teamhdr{background:#1f4e87;color:#ffffff;font-weight:bold;padding:6px 9px;font-size:11.5pt;}' +
    'table.grp th{text-align:left;font-family:Arial;font-size:8.5pt;letter-spacing:.06em;' +
      'text-transform:uppercase;color:#777777;padding:5px 9px;border-bottom:2px solid #1f4e87;}' +
    'table.grp td{padding:4px 9px;border-bottom:1px solid #eeeeee;word-wrap:break-word;}' +
    'table.grp tbody tr:nth-child(even) td{background:#eef3fa;}';
}

function savePdf_(name, html, dialogTitle, count) {
  var pdf = Utilities.newBlob(html, 'text/html', 'report.html').getAs('application/pdf');
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var file = reportsFolder_().createFile(pdf.setName(name + ' — ' + stamp + '.pdf'));
  showLink_(dialogTitle + ' (' + count + ')', file.getUrl());
}

// Uniform List — Last/First/Shirt grouped by team, with shirt-size totals.
function uniformListHtml_(c) {
  var recs = getRawRecords_(c);
  applyTeam_(c, recs);

  // shirt-size totals
  var counts = {};
  recs.forEach(function (r) { var s = r.shirt_size || '(none)'; counts[s] = (counts[s] || 0) + 1; });
  var ordered = SHIRT_ORDER.filter(function (s) { return counts[s]; })
    .concat(Object.keys(counts).filter(function (s) { return SHIRT_ORDER.indexOf(s) === -1; }));
  var chips = ordered.map(function (s) { return '<span class="chip">' + esc_(s) + ' <b>' + counts[s] + '</b></span>'; }).join('');

  // group by team, sorted by config order (Unassigned last)
  var rank = teamRankMap_(c), groups = {};
  recs.forEach(function (r) { var t = r.team || 'Unassigned'; (groups[t] = groups[t] || []).push(r); });
  var teams = Object.keys(groups).sort(function (a, b) {
    var ra = a === 'Unassigned' ? 1e9 : (rank[a.toLowerCase()] || 5e5);
    var rb = b === 'Unassigned' ? 1e9 : (rank[b.toLowerCase()] || 5e5);
    return ra - rb || (a < b ? -1 : 1);
  });

  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM d, yyyy");
  var body = '<div class="eyebrow">South Dayton TOPSoccer</div><h1>Uniform Distribution List</h1>' +
    '<div class="sub">As of ' + stamp + ' · ' + recs.length + ' players</div>' +
    '<div class="rule"></div>' +
    '<div class="totals"><b>Shirt totals:</b><br>' + chips + '</div>';

  teams.forEach(function (t) {
    var rows = groups[t].sort(sortLastFirst_);
    body += '<table class="grp"><colgroup><col style="width:34%"><col style="width:34%"><col></colgroup>' +
      '<thead><tr><td class="teamhdr" colspan="3">' + esc_(t) + ' (' + rows.length + ')</td></tr>' +
      '<tr><th>Last</th><th>First</th><th>Shirt</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      body += '<tr><td>' + esc_(r.last) + '</td><td>' + esc_(r.first) + '</td><td>' + esc_(r.shirt_size) + '</td></tr>';
    });
    body += '</tbody></table>';
  });

  return { html: '<html><head><meta charset="utf-8"><style>' + reportCss_() + '</style></head><body>' + body + '</body></html>', count: recs.length };
}

function reportUniformList() {
  var r = uniformListHtml_(getConfig_());
  if (!r.count) { SpreadsheetApp.getUi().alert('No players imported yet.'); return; }
  savePdf_('Uniform List', r.html, 'Uniform List ready', r.count + ' players');
}

function fmtPhone_(v) {
  if (!v) return '';
  var d = String(v).replace(/\D/g, '');
  if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
  return d.length === 10 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : String(v).trim();
}

// Coach Roster — simple table (Last/First/Phone/Email/Shirt). year auto-detected if omitted.
function coachRosterHtml_(c, year) {
  if (year == null) year = getLatestCoachYear_();
  var cy = resolveCoachYear_(year);
  var coaches = getRawRecords_(c, resolveCoachRawTab_(c, year));
  coaches.sort(sortLastFirst_);
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy');
  var yr = cy ? cy + ' season · ' : '';
  var body = '<div class="eyebrow">South Dayton TOPSoccer</div><h1>Coach Roster</h1>' +
    '<div class="sub">' + yr + 'As of ' + stamp + ' · ' + coaches.length + ' coaches</div><div class="rule"></div>' +
    '<table class="grp"><colgroup><col style="width:20%"><col style="width:20%"><col style="width:18%"><col style="width:30%"><col style="width:12%"></colgroup>' +
    '<thead><tr><th>Last</th><th>First</th><th>Phone</th><th>Email</th><th>Shirt</th></tr></thead><tbody>';
  coaches.forEach(function (r) {
    body += '<tr><td>' + esc_(r.last) + '</td><td>' + esc_(r.first) + '</td><td>' + esc_(fmtPhone_(r.phone)) +
      '</td><td>' + esc_(r.email) + '</td><td>' + esc_(r.shirt_size) + '</td></tr>';
  });
  body += '</tbody></table>';
  return { html: '<html><head><meta charset="utf-8"><style>' + reportCss_() + '</style></head><body>' + body + '</body></html>', count: coaches.length };
}

function reportCoachRoster() {
  var r = coachRosterHtml_(getConfig_());
  if (!r.count) { SpreadsheetApp.getUi().alert('No coaches imported yet — drop the coach export and run Import.'); return; }
  savePdf_('Coach Roster', r.html, 'Coach Roster ready', r.count + ' coaches');
}

// Config team names (config order, excludes Staff) — for the team picker.
function teamNamesList_(c) {
  var rank = teamRankMap_(c);
  var names = Object.keys(c.teams).filter(function (n) { return n.toLowerCase() !== 'staff'; });
  names.sort(function (a, b) { return (rank[a.toLowerCase()] || 0) - (rank[b.toLowerCase()] || 0); });
  return names;
}

// ── Team-roster columns (config-toggleable) ──
// The director controls which columns appear via a "ROSTER FIELDS" section in the
// Config sheet: one row per field key with TRUE/FALSE. Row order = column order.
// If the Config has no ROSTER FIELDS section (or none are TRUE), the default set
// below is used — so behavior is unchanged until the section is added.
var DEFAULT_ROSTER_FIELDS = ['last', 'first', 'age', 'guardian', 'phone', 'shirt', 'medical'];

// Registry of every column a roster can show. Add a field = add one row here.
// w = relative width weight (auto-normalized to 100% across the chosen columns).
var ROSTER_FIELDS = {
  last:       { label: 'Last',                w: 11, get: function (r) { return r.last; } },
  first:      { label: 'First',               w: 13, get: function (r) { return r.first; } },
  age:        { label: 'Age',                 w: 5,  nowrap: true, get: function (r) { return ageFromDob_(r.dob); } },
  dob:        { label: 'DOB',                 w: 9,  nowrap: true, get: function (r) { return rosterDob_(r.dob); } },
  gender:     { label: 'Gender',              w: 8,  get: function (r) { return r.gender; } },
  age_group:  { label: 'Age Group',           w: 10, nowrap: true, get: function (r) { return r.age_group; } },
  guardian:   { label: 'Guardian',            w: 18, get: function (r) { return (String(r.g1_first || '') + ' ' + String(r.g1_last || '')).replace(/\s+/g, ' ').trim(); } },
  phone:      { label: 'Phone',               w: 12, nowrap: true, get: function (r) { return fmtPhone_(r.phone); } },
  email:      { label: 'Email',               w: 20, get: function (r) { return r.email; } },
  shirt:      { label: 'Shirt',               w: 7,  nowrap: true, get: function (r) { return r.shirt_size; } },
  medical:    { label: 'Medical / Allergies', w: 24, get: function (r) { return [r.allergies, r.medical].filter(function (x) { return x; }).join('; '); } },
  allergies:  { label: 'Allergies',           w: 14, get: function (r) { return r.allergies; } },
  conditions: { label: 'Medical Conditions',  w: 14, get: function (r) { return r.medical; } },
  team:         { label: 'Team',                w: 10, get: function (r) { return r.team; } },
  paid:         { label: 'Paid',                w: 8,  nowrap: true, get: function (r) { return r.payment_status; } },
  chs_game:     { label: 'CHS Game',            w: 8,  nowrap: true, get: function (r) { return r.chs_game ? '✓' : ''; } },
  fall_classic: { label: 'Fall Classic',         w: 8,  nowrap: true, get: function (r) { return r.fall_classic ? '✓' : ''; } }
};

// Treat a TRUE/FALSE config cell (boolean or text) as on/off.
function rosterOn_(v) {
  if (v === true) return true;
  if (v === false || v == null) return false;
  var s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1' || s === 'x';
}

// DOB (ISO yyyy-mm-dd) → MM/dd/yyyy, no timezone drift.
function rosterDob_(v) {
  if (!v) return '';
  var m = String(v).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[2] + '/' + m[3] + '/' + m[1]) : String(v).trim();
}

// Resolve the ordered list of roster columns from config (or fall back to default).
function rosterColumns_(c) {
  var keys;
  if (c.rosterOrder && c.rosterOrder.length) {
    keys = c.rosterOrder.filter(function (k) { return ROSTER_FIELDS[k] && rosterOn_(c.roster[k]); });
  }
  if (!keys || !keys.length) keys = DEFAULT_ROSTER_FIELDS.slice();
  return keys.map(function (k) {
    var f = ROSTER_FIELDS[k];
    return { key: k, label: f.label, w: f.w, nowrap: !!f.nowrap, get: f.get };
  });
}

// One-click: (re)write the "ROSTER FIELDS" section in the Config tab with a real
// CHECKBOX per field. Defaults are pre-checked; check/uncheck to show/hide a
// column; drag rows up/down to reorder (top row = leftmost column). Re-running
// rebuilds the block in place. The reader (rosterOn_) accepts the TRUE/FALSE that
// checkboxes store, so no other change is needed.
function setupRosterFields() {
  var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID);
  var sh = ss.getSheetByName('Config');
  if (!sh) throw new Error('No "Config" tab in the membership Config sheet.');

  // Remove any existing ROSTER FIELDS block (its header through the next section).
  var vals = sh.getDataRange().getValues(), start = -1;
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toUpperCase().indexOf('ROSTER') === 0) { start = i; break; }
  }
  if (start !== -1) {
    var end = vals.length;
    for (var j = start + 1; j < vals.length; j++) {
      var up = String(vals[j][0]).trim().toUpperCase();
      if (up.indexOf('SETTINGS') === 0 || up.indexOf('TEAMS') === 0 || up.indexOf('NOTES') === 0) { end = j; break; }
    }
    sh.deleteRows(start + 1, end - start);  // delete header + its rows
  }

  // Order: defaults first (checked), then every other registered field (unchecked).
  var order = DEFAULT_ROSTER_FIELDS.slice();
  Object.keys(ROSTER_FIELDS).forEach(function (k) { if (order.indexOf(k) === -1) order.push(k); });

  var hdr = sh.getLastRow() + 2;  // blank spacer row before the section
  sh.getRange(hdr, 1).setValue('ROSTER FIELDS').setFontWeight('bold');
  sh.getRange(hdr, 3).setValue('check = show on Team Rosters · top-to-bottom = left-to-right')
    .setFontStyle('italic').setFontColor('#666666');

  var rows = order.map(function (k) {
    return [k, DEFAULT_ROSTER_FIELDS.indexOf(k) !== -1, ROSTER_FIELDS[k].label];
  });
  var r0 = hdr + 1;
  sh.getRange(r0, 1, rows.length, 3).setValues(rows);
  sh.getRange(r0, 2, rows.length, 1).insertCheckboxes();  // col B = checkbox

  SpreadsheetApp.getUi().alert(
    'Roster Fields ready',
    'A "ROSTER FIELDS" section with checkboxes is now in the Config tab.\n\n' +
    'Check the columns you want on Team Rosters, and drag rows to reorder ' +
    '(top row = leftmost column).',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

// Team Rosters — one page per team (coach handout). Columns come from config
// (ROSTER FIELDS section) or the default set.
// teamFilter: '' / 'all' = every team; otherwise just that team.
function teamRostersHtml_(c, teamFilter) {
  var recs = getRawRecords_(c);
  applyTeam_(c, recs);
  // Merge annotation fields (chs_game, fall_classic, etc.) into each record
  // so ROSTER_FIELDS get functions can access them.
  var ann = readAnnotations_(c);
  recs.forEach(function (r) {
    var a = ann[r.reg_id] || {};
    r.chs_game     = a.chs_game || '';
    r.fall_classic = a.fall_classic || '';
  });
  var rank = teamRankMap_(c), groups = {};
  recs.forEach(function (r) { var t = r.team || 'Unassigned'; (groups[t] = groups[t] || []).push(r); });
  var teams = Object.keys(groups).sort(function (a, b) {
    var ra = a === 'Unassigned' ? 1e9 : (rank[a.toLowerCase()] || 5e5);
    var rb = b === 'Unassigned' ? 1e9 : (rank[b.toLowerCase()] || 5e5);
    return ra - rb || (a < b ? -1 : 1);
  });
  if (teamFilter && teamFilter !== 'all') {
    teams = teams.filter(function (t) { return t.toLowerCase() === String(teamFilter).toLowerCase(); });
  }

  var cols = rosterColumns_(c);
  var totW = cols.reduce(function (a, col) { return a + col.w; }, 0) || 1;
  var colgroup = cols.map(function (col) { return '<col style="width:' + Math.round(col.w / totW * 100) + '%">'; }).join('');
  var thead = '<tr>' + cols.map(function (col) { return '<th>' + esc_(col.label) + '</th>'; }).join('') + '</tr>';

  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy');
  var body = '', count = 0;
  teams.forEach(function (t, idx) {
    var rows = groups[t].sort(sortLastFirst_);
    count += rows.length;
    body += '<div' + (idx > 0 ? ' style="page-break-before:always"' : '') + '>' +
      '<div class="eyebrow">South Dayton TOPSoccer · ' + stamp + '</div>' +
      '<h1>' + esc_(t) + ' — Team Roster</h1>' +
      '<div class="sub">' + rows.length + ' players</div><div class="rule"></div>' +
      '<table class="grp"><colgroup>' + colgroup + '</colgroup>' +
      '<thead>' + thead + '</thead><tbody>';
    rows.forEach(function (r) {
      body += '<tr>' + cols.map(function (col) {
        var v = col.get(r); v = (v == null) ? '' : v;
        return '<td' + (col.nowrap ? ' class="nw"' : '') + '>' + esc_(v) + '</td>';
      }).join('') + '</tr>';
    });
    body += '</tbody></table></div>';
  });

  var css = reportCss_() + '@page{size:letter landscape;margin:0.5in;}table.grp td{font-size:9.5pt;}td.nw{white-space:nowrap;}';
  return { html: '<html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' + body + '</body></html>', count: count };
}

// Sheets menu: pick a team (or all), then generate.
function reportTeamRosters() {
  var names = ['all'].concat(teamNamesList_(getConfig_()));
  var opts = names.map(function (n) {
    return '<option value="' + n + '">' + (n === 'all' ? 'All teams' : n) + '</option>';
  }).join('');
  var html =
    '<div style="font:14px Arial,sans-serif">' +
      '<p style="margin:0 0 8px">Team:</p>' +
      '<select id="tm" style="font:14px Arial;padding:6px;width:100%;box-sizing:border-box">' + opts + '</select>' +
      '<div style="margin-top:14px;text-align:right"><button id="go" style="font:14px Arial;padding:7px 14px;cursor:pointer">Generate PDF</button></div>' +
      '<div id="out" style="margin-top:12px;min-height:18px"></div>' +
    '</div>' +
    '<script>' +
      'var go=document.getElementById("go"),out=document.getElementById("out");' +
      'go.onclick=function(){var t=document.getElementById("tm").value;go.disabled=true;go.textContent="Generating\\u2026";out.textContent="";' +
        'google.script.run.withSuccessHandler(function(res){go.disabled=false;go.textContent="Generate PDF";' +
          'out.innerHTML="\\u2713 "+res.count+" in <b>TOPSoccer Reports</b> \\u2014 <a href=\\""+res.url+"\\" target=\\"_blank\\">open the PDF</a>";})' +
        '.withFailureHandler(function(e){go.disabled=false;go.textContent="Generate PDF";out.textContent="Error: "+(e&&e.message?e.message:e);})' +
        '.runTeamRoster(t);};' +
    '<\/script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(360).setHeight(200), 'Team Rosters');
}

function runTeamRoster(team) {
  var r = teamRostersHtml_(getConfig_(), team);
  if (!r.count) throw new Error('No players for ' + (team && team !== 'all' ? team : 'any team') + '.');
  var pdf = Utilities.newBlob(r.html, 'text/html', 'roster.html').getAs('application/pdf');
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var label = (team && team !== 'all') ? team : 'All teams';
  var file = reportsFolder_().createFile(pdf.setName('Team Roster — ' + label + ' — ' + stamp + '.pdf'));
  return { url: file.getUrl(), name: file.getName(), count: r.count };
}

// CSV export — same columns as the Team Rosters PDF, gated by csv_roster = true in Config.
function reportTeamRostersCsv() {
  var names = ['all'].concat(teamNamesList_(getConfig_()));
  var opts = names.map(function (n) {
    return '<option value="' + n + '">' + (n === 'all' ? 'All teams' : n) + '</option>';
  }).join('');
  var html =
    '<div style="font:14px Arial,sans-serif">' +
      '<p style="margin:0 0 8px">Team:</p>' +
      '<select id="tm" style="font:14px Arial;padding:6px;width:100%;box-sizing:border-box">' + opts + '</select>' +
      '<div style="margin-top:14px;text-align:right"><button id="go" style="font:14px Arial;padding:7px 14px;cursor:pointer">Generate CSV</button></div>' +
      '<div id="out" style="margin-top:12px;min-height:18px"></div>' +
    '</div>' +
    '<script>' +
      'var go=document.getElementById("go"),out=document.getElementById("out");' +
      'go.onclick=function(){var t=document.getElementById("tm").value;go.disabled=true;go.textContent="Generating…";out.textContent="";' +
        'google.script.run.withSuccessHandler(function(res){go.disabled=false;go.textContent="Generate CSV";' +
          'out.innerHTML="✓ "+res.count+" players — <a href=\\""+res.url+"\\" target=\\"_blank\\">open the CSV in Drive</a>";})' +
        '.withFailureHandler(function(e){go.disabled=false;go.textContent="Generate CSV";out.textContent="Error: "+(e&&e.message?e.message:e);})' +
        '.runTeamRosterCsv(t);};' +
    '<\/script>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(360).setHeight(200), 'Team Rosters CSV');
}

function runTeamRosterCsv(team) {
  var c = getConfig_();
  var recs = getRawRecords_(c);
  applyTeam_(c, recs);
  var ann = readAnnotations_(c);
  recs.forEach(function (r) {
    var a = ann[r.reg_id] || {};
    r.chs_game     = a.chs_game || '';
    r.fall_classic = a.fall_classic || '';
  });
  var rank = teamRankMap_(c), groups = {};
  recs.forEach(function (r) { var t = r.team || 'Unassigned'; (groups[t] = groups[t] || []).push(r); });
  var teams = Object.keys(groups).sort(function (a, b) {
    var ra = a === 'Unassigned' ? 1e9 : (rank[a.toLowerCase()] || 5e5);
    var rb = b === 'Unassigned' ? 1e9 : (rank[b.toLowerCase()] || 5e5);
    return ra - rb || (a < b ? -1 : 1);
  });
  if (team && team !== 'all') {
    teams = teams.filter(function (t) { return t.toLowerCase() === String(team).toLowerCase(); });
  }
  if (!teams.length) throw new Error('No players for ' + (team && team !== 'all' ? team : 'any team') + '.');

  var cols = rosterColumns_(c);
  // Build CSV rows: Team column first, then roster columns.
  function csvCell_(v) {
    var s = String(v == null ? '' : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  var lines = [['Team'].concat(cols.map(function (col) { return col.label; })).map(csvCell_).join(',')];
  var count = 0;
  teams.forEach(function (t) {
    groups[t].sort(sortLastFirst_).forEach(function (r) {
      var row = [t].concat(cols.map(function (col) { return col.get(r) || ''; }));
      lines.push(row.map(csvCell_).join(','));
      count++;
    });
  });

  var csv = lines.join('\n');
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var label = (team && team !== 'all') ? team : 'All teams';
  var file = reportsFolder_().createFile(
    Utilities.newBlob(csv, 'text/csv', 'Team Roster — ' + label + ' — ' + stamp + '.csv'));
  return { url: file.getUrl(), name: file.getName(), count: count };
}

// Web-app entry: build any report as a downloadable PDF (gated by the coach code).
// Returns { name, b64 }. reportKey: address|nametags|coachtags|uniforms|coachroster.
function genReportPdf(reportKey, templateName, code, sort, newSheet, team, year) {
  if (!checkCoachCode(code)) throw new Error('Wrong code.');
  var c = getConfig_(), html, base;
  if (year) {
    c.settings['raw_tab'] = 'Raw_' + year;
    c.settings['annotations_tab'] = 'Annotations_' + year;
    c.settings['raw_coaches_tab'] = 'Raw_Coaches_' + year;
    c.settings['annotations_coaches_tab'] = 'Annotations_Coaches_' + year;
  }
  if (reportKey === 'address' || reportKey === 'nametags' || reportKey === 'coachtags' || reportKey === 'uniformtags') {
    var t = LABEL_TEMPLATES[templateName] || LABEL_TEMPLATES['Avery 5160'];
    sort = sort || 'team';
    var r = labelItemsFor_(c, reportKey, sort);
    if (!r.items.length) throw new Error('No records for this report.');
    html = labelSheetsHtml_(t, r.items, { newSheetPerTeam: !!newSheet && sort === 'team' });
    base = r.base + ' (' + templateName + ')';
  } else if (reportKey === 'uniforms') {
    var u = uniformListHtml_(c); if (!u.count) throw new Error('No players imported.'); html = u.html; base = 'Uniform List';
  } else if (reportKey === 'coachroster') {
    var cr = coachRosterHtml_(c, year || null); if (!cr.count) throw new Error('No coaches imported.'); html = cr.html; base = 'Coach Roster';
  } else if (reportKey === 'teamrosters') {
    var tr = teamRostersHtml_(c, team); if (!tr.count) throw new Error('No players for that team.'); html = tr.html;
    base = 'Team Roster — ' + (team && team !== 'all' ? team : 'All teams');
  } else throw new Error('Unknown report: ' + reportKey);

  var pdf = Utilities.newBlob(html, 'text/html', 'r.html').getAs('application/pdf');
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return { name: base + ' — ' + stamp + '.pdf', b64: Utilities.base64Encode(pdf.getBytes()) };
}

// Label stock names for the web-app picker.
function getLabelStocks() { return Object.keys(LABEL_TEMPLATES); }

function showConfigCheck() {
  var c = getConfig_();
  SpreadsheetApp.getUi().alert(
    'Config loaded ✓\n' +
    'team_source_of_record: ' + c.settings['team_source_of_record'] + '\n' +
    'teams: ' + Object.keys(c.teams).length + '\n' +
    'column-map fields (in code): ' + Object.keys(COLUMN_MAP).length + '\n' +
    'drop_folder_id set: ' + (c.settings['drop_folder_id'] ? 'yes' : 'NO — set it'));
}
