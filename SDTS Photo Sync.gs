/**
 * SDTS Photo Sync
 * Version: 1.3
 * ------------------------------------------------------------
 * Drop photos into a Google Drive folder, run this, and it will:
 *   1. Share every image in that folder publicly (Anyone with link: Viewer)
 *   2. Rewrite the Photos tab of the Config sheet with displayable links
 *      (Image | Caption | File). The File column is the Drive filename, so you
 *      can tell which row is which photo — handy for pruning. Add "?ids" to the
 *      site URL to see each photo's filename overlaid on the gallery.
 *
 * HEIC (iPhone) photos work — the link used serves a Google-made JPEG,
 * so the browser can show them.
 *
 * INSTALL
 *   Open the SDTS Site Config sheet → Extensions → Apps Script →
 *   paste this in → Save. Reload the sheet. A "Photos Sync" menu appears.
 *   First run asks for permission (Drive + Sheets) — approve it.
 *
 * USE
 *   Photos Sync → "Sync photos from Drive folder"   (run it whenever you add photos)
 *   Photos Sync → "Turn on hourly auto-sync"         (optional: do it automatically)
 *
 * CAPTIONS (optional)
 *   A photo's caption lives in its Drive file DESCRIPTION (that's the
 *   "source of truth"). You can set it three ways:
 *     - the Photo Captioner script (AI-written), or
 *     - right-click the file in Drive → File information → add a description, or
 *     - just type it into the Caption column of the Photos tab.
 *
 *   IMPORTANT: editing the Caption column only sticks if you've run
 *   "Make caption edits stick (one-time)" from the Photos Sync menu once.
 *   That installs a small trigger so a caption you type in the sheet is
 *   written back to the photo's Drive description — otherwise the next
 *   auto-sync rewrites the column from Drive and your edit is lost.
 */

/* ---------------- config ---------------- */
var PHOTO_FOLDER_ID = '1cWYWSGpGRm-ijcla_rLGZA7moKU3nDjm';  // the "PHOTOS" Drive folder
var PHOTOS_TAB = 'Photos';
var ARCHIVE_NAME = 'Archive';                              // subfolder of removed photos (skipped)

/* ----------------------------------------------------------------
 * SEASONS: make a subfolder inside the PHOTOS folder for each season
 * (e.g. "Fall 2025", "Fall 2026") and drop that season's photos in it.
 * The subfolder NAME becomes the season label on the website. Photos left
 * loose in the main folder show up under "Other". The "Archive" subfolder
 * (used by the Photo Manager) is ignored.
 * ---------------------------------------------------------------- */

/* ---------------- menu ---------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Photos Sync')
    .addItem('Sync photos from Drive folder', 'syncPhotos')
    .addItem('Turn on hourly auto-sync', 'installHourlyTrigger')
    .addItem('Turn off auto-sync', 'removeTriggers')
    .addSeparator()
    .addItem('Make caption edits stick (one-time)', 'installCaptionEditSync')
    .addToUi();
}

/* ---------------- main ---------------- */
function syncPhotos() {
  var rows = collectAllPhotos_(DriveApp.getFolderById(PHOTO_FOLDER_ID));

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PHOTOS_TAB) || ss.insertSheet(PHOTOS_TAB);
  sh.getRange(1, 1, 1, 4).setValues([['Image', 'Caption', 'File', 'Season']]);
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 4).clearContent();
  if (rows.length) {
    sh.getRange(2, 1, rows.length, 4).setValues(rows.map(function (r) {
      return [r.url, r.caption, r.file, r.season];
    }));
  }

  alert_('Synced ' + rows.length + ' photo(s) from the Drive folder to the Photos tab. ' +
         'The website updates within a few minutes.');
}

/* ---------------- auto-sync triggers ---------------- */
function installHourlyTrigger() {
  removeTriggers();
  ScriptApp.newTrigger('syncPhotos').timeBased().everyHours(1).create();
  alert_('Auto-sync is ON. Photos you add to the Drive folder will appear on the site within ~1 hour.');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncPhotos') ScriptApp.deleteTrigger(t);
  });
}

/* ----------------------------------------------------------------
 * KEEP CAPTION EDITS: an installable edit-trigger so that typing a
 * caption into the Photos tab is written back to that photo's Drive
 * DESCRIPTION (the source of truth). Without this, the next auto-sync
 * rewrites the Caption column from Drive and your hand-edit is lost.
 * Run "Make caption edits stick (one-time)" from the menu once.
 * ---------------------------------------------------------------- */
function installCaptionEditSync() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {       // avoid duplicates
    if (t.getHandlerFunction() === 'onPhotoEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onPhotoEdit').forSpreadsheet(ss).onEdit().create();
  alert_('Done. From now on, caption edits you make in the Photos tab are saved ' +
         'back to the photo and will survive the next sync.');
}

// Fires on every sheet edit. Only acts on a single-cell change in the Caption
// column (col 2) of the Photos tab: pushes the new text to the matching photo's
// Drive description, found via the file ID embedded in the Image URL (col 1).
function onPhotoEdit(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (sh.getName() !== PHOTOS_TAB) return;
    var row = e.range.getRow(), col = e.range.getColumn();
    if (row < 2 || col !== 2) return;                          // header / not Caption col
    if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;  // single cell only
    var caption = (e.value == null ? '' : String(e.value)).trim();
    var id = extractFileId_(sh.getRange(row, 1).getValue());   // Image URL → file ID
    if (id) DriveApp.getFileById(id).setDescription(caption);
  } catch (err) { /* never block the user's edit */ }
}

function extractFileId_(url) {
  var m = String(url || '').match(/[-\w]{25,}/);               // Drive IDs are 25+ chars
  return m ? m[0] : '';
}

/* ---------------- shared collector ---------------- */
// Gathers images from each season subfolder (label = folder name) plus any
// loose images in the main folder (label = "Other"). Skips the Archive folder.
// Shares each image publicly. Returns rows {url, caption, file, season, created},
// season subfolders first (newest year first), each season newest-photo first.
function collectAllPhotos_(parent) {
  var rows = [];
  var subs = [];
  var fit = parent.getFolders();
  while (fit.hasNext()) { var fo = fit.next(); if (fo.getName() !== ARCHIVE_NAME) subs.push(fo); }
  subs.sort(function (a, b) {                 // newest year first, else name desc
    var ya = seasonYear_(a.getName()), yb = seasonYear_(b.getName());
    if (yb !== ya) return yb - ya;
    return a.getName() < b.getName() ? 1 : -1;
  });
  subs.forEach(function (fo) { pushImages_(fo, fo.getName(), rows); });
  pushImages_(parent, 'Other', rows);         // loose photos last
  return rows;
}

function pushImages_(folder, season, rows) {
  var it = folder.getFiles(), batch = [];
  while (it.hasNext()) {
    var f = it.next();
    if ((f.getMimeType() || '').indexOf('image/') !== 0) continue;
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    batch.push({ url: f.getUrl(), caption: (f.getDescription() || '').trim(),
                 file: f.getName(), season: season, created: f.getDateCreated() });
  }
  batch.sort(function (a, b) { return b.created - a.created; });   // newest first
  batch.forEach(function (r) { rows.push(r); });
}

function seasonYear_(name) { var m = String(name).match(/(20\d\d)/); return m ? +m[1] : 0; }

/* ---------------- helper ---------------- */
// Alert only when run from the menu (a time-trigger run has no UI).
function alert_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}
