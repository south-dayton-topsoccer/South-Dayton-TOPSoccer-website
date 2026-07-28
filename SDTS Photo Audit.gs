/**
 * SDTS Photo Audit
 * Version: 1.1
 * ------------------------------------------------------------
 * One-off helper to see WHAT is in the PHOTOS folder, WHERE (which season
 * subfolder, or loose in the main folder), WHEN it was added, and WHO uploaded
 * it. Useful for reconciling uploads — e.g. spotting photos Jess dropped into
 * the main folder that haven't been filed into a season yet.
 *
 * It writes a temporary "Photo Audit" tab in the Config sheet (newest first).
 * Read it, then delete the tab whenever you're done — it has no effect on the
 * website or the Photos tab.
 *
 * RUN: paste into the SDTS Config Scripts project → Save → choose auditPhotos
 *      in the function dropdown → Run.
 */

var AUDIT_FOLDER_ID = '1cWYWSGpGRm-ijcla_rLGZA7moKU3nDjm';  // the PHOTOS folder
var AUDIT_TAB = 'Photo Audit';
var SUMMARY_TAB = 'Photo Audit — Summary';

function auditPhotos() {
  var parent = DriveApp.getFolderById(AUDIT_FOLDER_ID);
  var rows = [];

  // Main folder (loose photos)
  scanAudit_(parent, '(main folder)', rows);
  // Every subfolder, including Archive (so nothing is hidden)
  var fit = parent.getFolders();
  while (fit.hasNext()) { var fo = fit.next(); scanAudit_(fo, fo.getName(), rows); }

  // Newest first by created date
  rows.sort(function (a, b) { return b.created - a.created; });

  var tz = Session.getScriptTimeZone();
  var fmt = function (d) { return d ? Utilities.formatDate(d, tz, 'EEE MMM d, yyyy  h:mm a') : ''; };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(AUDIT_TAB) || ss.insertSheet(AUDIT_TAB);
  sh.clear();
  sh.getRange(1, 1, 1, 6).setValues([['Where (folder / season)', 'File name', 'Created (uploaded)', 'Last modified', 'Owner / uploader', 'Link']])
    .setFontWeight('bold').setBackground('#14294a').setFontColor('#ffffff');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, 6).setValues(rows.map(function (r) {
      return [r.where, r.name, fmt(r.created), fmt(r.modified), r.owner, r.url];
    }));
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 5);

  // ---- Summary: count of photos per folder (the current, real folder list) ----
  var counts = {};
  rows.forEach(function (r) { counts[r.where] = (counts[r.where] || 0) + 1; });
  var names = Object.keys(counts).sort();
  var sumRows = names.map(function (n) { return [n, counts[n]]; });

  var sumSh = ss.getSheetByName(SUMMARY_TAB) || ss.insertSheet(SUMMARY_TAB);
  sumSh.clear();
  sumSh.getRange(1, 1, 1, 2).setValues([['Folder / season (as it exists now)', 'Photos']])
    .setFontWeight('bold').setBackground('#14294a').setFontColor('#ffffff');
  if (sumRows.length) sumSh.getRange(2, 1, sumRows.length, 2).setValues(sumRows);
  sumSh.getRange(sumRows.length + 2, 1).setValue('TOTAL');
  sumSh.getRange(sumRows.length + 2, 2).setValue(rows.length);
  sumSh.getRange(sumRows.length + 2, 1, 1, 2).setFontWeight('bold');
  sumSh.setColumnWidth(1, 320);

  var msg = 'Folders found right now:\n\n' +
            names.map(function (n) { return '  • ' + n + ':  ' + counts[n]; }).join('\n') +
            '\n\nTotal: ' + rows.length + ' image(s).\n' +
            'See the "' + SUMMARY_TAB + '" and "' + AUDIT_TAB + '" tabs.';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

function scanAudit_(folder, where, rows) {
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if ((f.getMimeType() || '').indexOf('image/') !== 0) continue;
    var owner = '';
    try { var o = f.getOwner(); owner = o ? o.getEmail() : ''; } catch (e) {}
    rows.push({
      where: where, name: f.getName(),
      created: f.getDateCreated(), modified: f.getLastUpdated(),
      owner: owner, url: f.getUrl()
    });
  }
}
