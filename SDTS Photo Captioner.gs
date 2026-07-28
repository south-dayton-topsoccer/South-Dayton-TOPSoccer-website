/**
 * SDTS Photo Captioner
 * Version: 1.7
 * ------------------------------------------------------------
 * Looks at each photo in the Drive folder and uses Claude (vision) to write a
 * fun, 3–8 word caption describing the action/moment, then saves it as the
 * file's Drive DESCRIPTION. Photo Sync and the Photo Manager already read the
 * description as the gallery caption, so captions appear on the site after the
 * next sync. You can hand-edit any caption later in the Photo Manager.
 *
 * SAFE BY DEFAULT: it only captions photos that have NO description yet, so it
 * never clobbers a caption you wrote. Set FORCE = true to re-caption everything.
 *
 * SETUP (one time)
 *   1. This belongs in the SAME project as SDTS Photo Sync (the Config sheet's
 *      Apps Script). Add a new script file, paste this in → Save.
 *   2. Add your Anthropic key: Project Settings (gear) → Script Properties →
 *      add  CLAUDE_API_KEY  =  (your key). (Same key you use elsewhere.)
 *   3. In the function dropdown choose  captionPhotos  → Run. Approve permissions.
 *      When it finishes, it re-syncs the Photos tab automatically.
 *
 * NOTE: captions are an AI's best guess from the picture — skim them and tweak
 * any that miss in the Photo Manager. The prompt is tuned to celebrate the
 * action/joy and to avoid describing disabilities or naming individuals.
 */

/* ---------------- config ---------------- */
var PHOTO_FOLDER_ID = '1cWYWSGpGRm-ijcla_rLGZA7moKU3nDjm';   // same "PHOTOS" folder as Photo Sync
var MODEL = 'claude-haiku-4-5';     // a vision-capable Claude model (fast + cheap)
var FORCE = false;                  // true = re-caption photos that already have a caption
var THUMB_W = 640;                  // px width fetched for analysis (smaller = faster/cheaper)
var SLEEP_MS = 150;                 // pause between photos (raise if you ever hit rate limits)
var TIME_BUDGET_MS = 280000;        // stop after ~4m40s so we exit cleanly under the 6-min cap

var PROMPT =
  'Write ONE short photo caption (3 to 8 words) for a youth soccer program photo. ' +
  'Describe what is SPECIFICALLY happening or what stands out in THIS exact image — ' +
  'for example: a team posing by the goal net, players kneeling in the front row, ' +
  'a high-five tunnel, someone holding the ball up, a team sign or banner, a coach ' +
  'with the group, kids mid-cheer. Be concrete and observational, and vary the ' +
  'wording and sentence shape so it does not sound like every other caption. ' +
  'WHO IS WHO: the ONLY reliable cue is that the program\'s own athletes wear ' +
  'MAROON (dark red) "South Dayton TOPSoccer" jerseys. Everyone else — coaches, ' +
  'buddies, and visiting volunteer teams — may wear ANY colors, often their own ' +
  'team uniform, so do NOT assume a shirt color means someone is a volunteer or ' +
  'coach. If you are unsure of anyone\'s role, just describe the scene without ' +
  'labeling who is a player vs. a volunteer. ' +
  'STRICT: do NOT use any of these worn-out words — "team spirit", "spirit", ' +
  '"shine", "shines", "bright", "together", "joy", "fun". ' +
  'Keep it warm and respectful. Do NOT mention or describe disabilities, medical ' +
  'equipment, or wheelchairs. Do NOT name individuals. Use sentence case (capitalize ' +
  'only the first word and names). No quotation marks, no ending period. ' +
  'Reply with ONLY the caption text.';

/* ---------------- main ---------------- */
function captionPhotos() {
  var key = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!key) { alert_('No CLAUDE_API_KEY set. Add it in Project Settings → Script Properties.'); return; }

  var files = allImageFiles_();           // main folder + every season subfolder (not Archive)
  var done = 0, skipped = 0, failed = 0, ranOut = false;
  var start = Date.now();

  for (var n = 0; n < files.length; n++) {
    if (Date.now() - start > TIME_BUDGET_MS) { ranOut = true; break; }   // bail before the 6-min cap
    var f = files[n];
    if (!FORCE && (f.getDescription() || '').trim()) { skipped++; continue; }

    try {
      var blob = imageBlob_(f);
      var caption = claudeCaption_(key, Utilities.base64Encode(blob.getBytes()), blob.getContentType());
      if (caption) { f.setDescription(caption); done++; }
      else { failed++; }
    } catch (e) { failed++; }
    Utilities.sleep(SLEEP_MS);            // be gentle on the API
  }

  // Refresh the Photos tab so the new captions show on the site.
  try { if (typeof syncPhotos === 'function') syncPhotos(); } catch (e) {}

  alert_('Captioned ' + done + ' photo(s). Skipped ' + skipped +
         ' (already had captions)' + (failed ? ', ' + failed + ' failed' : '') + '.' +
         (ranOut ? '\n\nStopped early to stay under the time limit — run captionPhotos again to continue the rest.'
                 : '\n\nAll done. Review/tweak any in the Photo Manager.'));
}

/* ---------------- auto-caption trigger ---------------- */
// Run this ONCE from the editor to auto-caption new photos every hour.
// (Only blank photos are captioned, so most hourly runs do nothing — cheap.)
function installCaptionTrigger() {
  removeCaptionTrigger();
  ScriptApp.newTrigger('captionPhotos').timeBased().everyHours(1).create();
  alert_('Auto-caption is ON. New photos will be captioned within ~1 hour.');
}

function removeCaptionTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'captionPhotos') ScriptApp.deleteTrigger(t);
  });
}

/* ---------------- undo ---------------- */
// One-click "undo": blanks the caption (Drive description) on EVERY photo and
// re-syncs, putting the gallery back to plain photos with no captions.
// Run this function from the editor if you (or Jess) want them all gone.
function clearAllCaptions() {
  var files = allImageFiles_(), cleared = 0;
  for (var n = 0; n < files.length; n++) {
    if ((files[n].getDescription() || '').trim()) { files[n].setDescription(''); cleared++; }
  }
  try { if (typeof syncPhotos === 'function') syncPhotos(); } catch (e) {}
  alert_('Cleared captions on ' + cleared + ' photo(s). The gallery is back to plain photos.');
}

/* ---------------- helpers ---------------- */
// Every image in the main PHOTOS folder PLUS each season subfolder, skipping the
// Archive subfolder. So captions also reach photos filed under a season.
function allImageFiles_() {
  var parent = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  var out = [];
  collectImages_(parent, out);
  var fit = parent.getFolders();
  while (fit.hasNext()) {
    var fo = fit.next();
    if (fo.getName() !== 'Archive') collectImages_(fo, out);
  }
  return out;
}
function collectImages_(folder, out) {
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if ((f.getMimeType() || '').indexOf('image/') === 0) out.push(f);
  }
}

// Fetch a modestly-sized JPEG of the photo (Drive's thumbnail endpoint). Falls
// back to the original file if the thumbnail can't be fetched.
// Fetch a modestly-sized JPEG of the photo (Drive's thumbnail endpoint). Falls
// back to the original file if the thumbnail can't be fetched.
function imageBlob_(file) {
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  var url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w' + THUMB_W;
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() === 200) {
    var b = res.getBlob();
    if ((b.getContentType() || '').indexOf('image/') === 0 && b.getBytes().length > 1000) return b;
  }
  return file.getBlob();                  // fallback: original
}

function claudeCaption_(key, b64, mime) {
  if (mime !== 'image/jpeg' && mime !== 'image/png' && mime !== 'image/gif' && mime !== 'image/webp') {
    mime = 'image/jpeg';
  }
  var payload = {
    model: MODEL,
    max_tokens: 32,
    temperature: 1,                       // more variety, less stock phrasing
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
        { type: 'text', text: PROMPT }
      ]
    }]
  };
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return '';
  var data = JSON.parse(res.getContentText());
  var text = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : '';
  return cleanCaption_(text);
}

// Trim quotes/punctuation/whitespace and cap at 8 words.
function cleanCaption_(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^["'“”‘’]+|["'“”‘’.]+$/g, '').trim();
  var words = s.split(' ');
  if (words.length > 8) s = words.slice(0, 8).join(' ');
  return s;
}

function alert_(msg) { try { SpreadsheetApp.getUi().alert(msg); } catch (e) {} }
