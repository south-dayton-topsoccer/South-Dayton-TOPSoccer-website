/**
 * SDTS Photo Cleanup
 * Version: 1.0
 * ------------------------------------------------------------
 * One-time fix for the duplicate situation: the ~200 originals are loose in the
 * main PHOTOS folder, and a near-identical "Copy of …" set was copied into the
 * 2025 Season folder. This consolidates everything into 2025 Season with no
 * duplicates and no Archive clutter.
 *
 * WHAT consolidate2025() DOES (safe + re-runnable):
 *   For each loose image in the MAIN folder:
 *     • if a copy already exists in 2025 Season  -> send the loose one to Drive
 *       Trash (recoverable ~30 days, then auto-clears; NOT your Archive folder).
 *     • if it has NO copy in 2025 Season          -> MOVE it into 2025 Season
 *       (so a genuine "gap" photo is never lost).
 *   Then it re-syncs the Photos tab.
 *   Archive, 2023 Season, and 2024 Season are left untouched.
 *
 * tidyCopyNames() (optional, run after): strips the "Copy of " prefix from files
 * in 2025 Season so the filenames are clean. Filenames don't show on the site,
 * so this is purely cosmetic.
 *
 * RUN: paste into the SDTS Config Scripts project → Save → pick the function in
 *      the dropdown → Run. (It uses syncPhotos from that same project.)
 */

var CLEAN_FOLDER_ID = '1cWYWSGpGRm-ijcla_rLGZA7moKU3nDjm';   // the PHOTOS folder
var TARGET_SEASON   = '2025 Season';
var TIME_GUARD_MS   = 280000;                               // stay under the 6-min cap

function consolidate2025() {
  var parent = DriveApp.getFolderById(CLEAN_FOLDER_ID);
  var season = subByName_(parent, TARGET_SEASON);
  if (!season) { alertC_('No "' + TARGET_SEASON + '" subfolder found in PHOTOS.'); return; }

  // 1) Base names already present in 2025 Season (strip any "Copy of " prefix).
  var inSeason = {};
  var sit = season.getFiles();
  while (sit.hasNext()) {
    var sf = sit.next();
    if ((sf.getMimeType() || '').indexOf('image/') !== 0) continue;
    inSeason[stripCopy_(sf.getName())] = true;
  }

  // 2) Collect the loose main-folder images first (don't mutate while iterating).
  var loose = [];
  var it = parent.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if ((f.getMimeType() || '').indexOf('image/') === 0) loose.push(f);
  }

  // 3) Trash the duplicates; move the genuine gaps into the season folder.
  var trashed = 0, moved = 0, ranOut = false;
  var start = Date.now();
  for (var i = 0; i < loose.length; i++) {
    if (Date.now() - start > TIME_GUARD_MS) { ranOut = true; break; }
    var file = loose[i];
    if (inSeason[stripCopy_(file.getName())]) { file.setTrashed(true); trashed++; }
    else { file.moveTo(season); inSeason[stripCopy_(file.getName())] = true; moved++; }
  }

  try { if (typeof syncPhotos === 'function') syncPhotos(); } catch (e) {}

  alertC_('Cleanup done.\n\n' +
    '• ' + trashed + ' duplicate(s) sent to Drive Trash (recoverable ~30 days).\n' +
    '• ' + moved + ' un-duplicated photo(s) moved into ' + TARGET_SEASON + '.\n' +
    (ranOut ? '\nStopped early to stay under the time limit — run consolidate2025 again to finish the rest.'
            : '\nThe main folder should now be empty. Run tidyCopyNames() if you want to drop the "Copy of " prefixes.'));
}

// Optional cosmetic pass: rename "Copy of X" -> "X" in 2025 Season (skips if X exists).
function tidyCopyNames() {
  var parent = DriveApp.getFolderById(CLEAN_FOLDER_ID);
  var season = subByName_(parent, TARGET_SEASON);
  if (!season) { alertC_('No "' + TARGET_SEASON + '" subfolder found.'); return; }

  var present = {};
  var it1 = season.getFiles();
  while (it1.hasNext()) { var p = it1.next(); present[p.getName()] = true; }

  var renamed = 0, start = Date.now();
  var it2 = season.getFiles();
  while (it2.hasNext()) {
    if (Date.now() - start > TIME_GUARD_MS) break;
    var f = it2.next();
    var nm = f.getName();
    if (nm.indexOf('Copy of ') === 0) {
      var clean = nm.substring(8);
      if (!present[clean]) { f.setName(clean); present[clean] = true; renamed++; }
    }
  }
  try { if (typeof syncPhotos === 'function') syncPhotos(); } catch (e) {}
  alertC_('Renamed ' + renamed + ' file(s) to drop the "Copy of " prefix.');
}

/* ---------------- helpers ---------------- */
function subByName_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : null;
}
function stripCopy_(name) { return name.indexOf('Copy of ') === 0 ? name.substring(8) : name; }
function alertC_(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) {} }
