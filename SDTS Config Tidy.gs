/**
 * SDTS Config Tidy
 * Version: 1.0
 * ------------------------------------------------------------
 * Reorganizes the Config tab into labeled, color-coded sections and tidies the
 * formatting. SAFE: it preserves every Key, Value, and Note — it only reorders
 * the rows into logical groups and restyles. Re-run anytime you add new keys;
 * anything it doesn't recognize is parked under an "Other" section at the end.
 *
 * It also re-applies the TRUE/FALSE dropdowns on registration_open & alert_active.
 *
 * HOW TO RUN
 *   1. Open the SDTS Site Config sheet → Extensions → Apps Script.
 *   2. Add a new script file, paste this in → Save.
 *   3. In the function dropdown choose  tidyConfig  → click Run.
 *      (First run asks for permission — approve it.)
 *   4. Back on the sheet, the Config tab is now grouped and formatted.
 *      (Edit → Undo reverts it if you ever want to.)
 *
 * TIP: it only touches a tab named exactly "Config". Nothing else is affected.
 * The website reads keys by name and ignores order, so reordering changes nothing
 * about how the site looks — it just makes the sheet easier for humans.
 */

var CONFIG_TAB = 'Config';

// Section title  →  the keys that belong in it, in the order you want them.
var SECTIONS = [
  ['Identity & branding',     ['org_name', 'tagline', 'logo_url', 'logo_height']],
  ['Hero — top of page',      ['hero_headline', 'hero_subtext']],
  ['Contact',                 ['hotline_phone', 'phone_label', 'contact_email', 'email_label', 'mailing_address']],
  ['Registration',            ['registration_open', 'registration_url', 'registration_window']],
  ['About & season',          ['about_text', 'season_info', 'season_year']],
  ['Where we play',           ['location_name', 'location_address', 'location_maps_url']],
  ['Schedule & calendar',     ['schedule_heading', 'calendar_url']],
  ['Volunteer teams',         ['volunteers_heading', 'volunteers_intro']],
  ['Photos',                  ['photos_url']],
  ['Donate',                  ['donate_url', 'donate_text']],
  ['Social links',            ['facebook_url', 'instagram_url']],
  ['Alerts & announcements',  ['alert_active', 'alert_message', 'announcement']]
];

var BOOL_KEYS = ['registration_open', 'alert_active'];   // get a TRUE/FALSE dropdown

var NAVY = '#14294a', SECTION_BG = '#1f3a5f', KEY_BG = '#f5f5f7',
    NOTE_COL = '#8a929b', LINE = '#e0e4ea';

function tidyConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG_TAB);
  if (!sh) { alert_('No tab named "' + CONFIG_TAB + '" was found.'); return; }

  // 1) Read existing rows (below the header). Keep only real keys (lower_snake_case),
  //    which automatically ignores any old section-header rows on a re-run.
  var maxR = sh.getMaxRows(), maxC = Math.max(sh.getMaxColumns(), 3);
  var body = sh.getRange(2, 1, Math.max(maxR - 1, 1), 3).getValues();
  var map = {}, seen = [];
  body.forEach(function (r) {
    var k = String(r[0] == null ? '' : r[0]).trim();
    if (!/^[a-z][a-z0-9_]*$/.test(k)) return;          // skip blanks + section labels
    if (!(k in map)) { map[k] = { value: r[1], note: r[2] }; seen.push(k); }
  });

  // 2) Build the new ordered layout.
  var rows = [], kind = [], used = {};
  SECTIONS.forEach(function (sec) {
    var keys = sec[1].filter(function (k) { return k in map; });
    if (!keys.length) return;
    rows.push([sec[0], '', '']); kind.push('section');
    keys.forEach(function (k) {
      rows.push([k, map[k].value, map[k].note]); kind.push('data'); used[k] = true;
    });
  });
  var extra = seen.filter(function (k) { return !used[k]; });
  if (extra.length) {
    rows.push(['Other', '', '']); kind.push('section');
    extra.forEach(function (k) { rows.push([k, map[k].value, map[k].note]); kind.push('data'); });
  }

  // 3) Reset the body (unmerge, clear formats/validation/content) and write fresh.
  var bodyRange = sh.getRange(2, 1, maxR - 1, maxC);
  bodyRange.breakApart();
  bodyRange.clearDataValidations();
  bodyRange.clear();
  sh.getRange(2, 1, rows.length, 3).setValues(rows);

  // 4) Header row + sizing.
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground(NAVY).setFontColor('#ffffff');
  sh.setColumnWidth(1, 200); sh.setColumnWidth(2, 520); sh.setColumnWidth(3, 340);

  // 5) Style each row.
  for (var i = 0; i < rows.length; i++) {
    var row = i + 2, rng = sh.getRange(row, 1, 1, 3);
    if (kind[i] === 'section') {
      rng.merge();
      sh.getRange(row, 1).setValue(rows[i][0].toUpperCase())
        .setBackground(SECTION_BG).setFontColor('#ffffff').setFontWeight('bold')
        .setFontSize(11).setVerticalAlignment('middle');
      sh.setRowHeight(row, 30);
    } else {
      rng.setBackground('#ffffff').setFontColor('#000000').setFontWeight('normal')
         .setVerticalAlignment('top').setWrap(true);
      sh.getRange(row, 1).setFontWeight('bold').setBackground(KEY_BG);   // Key cell
      sh.getRange(row, 3).setFontColor(NOTE_COL).setFontStyle('italic'); // Note cell
    }
  }

  // 6) Re-add TRUE/FALSE dropdowns on the boolean value cells.
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(['TRUE', 'FALSE'], true).build();
  for (var j = 0; j < rows.length; j++) {
    if (kind[j] === 'data' && BOOL_KEYS.indexOf(rows[j][0]) !== -1) {
      sh.getRange(j + 2, 2).setDataValidation(rule);
    }
  }

  // 7) Light gridlines across the whole block.
  sh.getRange(1, 1, rows.length + 1, 3)
    .setBorder(true, true, true, true, false, true, LINE, SpreadsheetApp.BorderStyle.SOLID);

  alert_('Config tidied — ' + seen.length + ' settings grouped into sections. ' +
         '(Edit → Undo reverts it.)');
}

function alert_(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) {} }
