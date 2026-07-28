/**
 * SDTS Photo Manager
 * Version: 1.6
 * ------------------------------------------------------------
 * A private, password-protected web page for managing the website's photo
 * gallery. Shows every photo in the Drive folder as a grid. Each photo has:
 *   - "Remove" — MOVES the file into an "Archive" subfolder (never deleted, so
 *     it's fully reversible).
 *   - "Edit caption" — type a new caption right on the card. It's saved to the
 *     photo's Drive description (the source of truth) and the site updates within
 *     a few minutes. This is the place to fix captions — edits here always stick.
 * Both actions immediately rewrite the Photos tab, so the website follows along.
 *
 * You can also flip to "Archived" to see removed photos and Restore any of them.
 *
 * WHY A SEPARATE PROJECT
 *   This is its own standalone Apps Script project (NOT the Config-sheet
 *   project) because an Apps Script project may only have one doGet, and the
 *   Calendar Feed already uses one. Keeping this separate avoids the clash.
 *
 * INSTALL
 *   1. Go to script.google.com (signed in as SDTSAdmin) → New project.
 *   2. Paste this file in. Save.
 *   3. Set your password: Project Settings (gear) → Script Properties →
 *      Add property:  ADMIN_KEY  =  (a password you choose)
 *      — OR run the setAdminKey() helper once (see bottom), then delete the key
 *        from the code.
 *   4. Deploy → New deployment → type "Web app":
 *        Execute as: Me (SDTSAdmin)
 *        Who has access: Anyone
 *      Approve the Drive + Sheets permissions on first run.
 *   5. Open the web-app URL, enter your password — that's your Photo Manager.
 *      Bookmark it. Don't share the URL or password publicly.
 *
 * NOTE: This uses the SAME folder and Photos tab as the SDTS Photo Sync script,
 * and writes the same columns (Image | Caption | File), so the two stay in sync.
 */

/* ---------------- config ---------------- */
var PHOTO_FOLDER_ID = '1cWYWSGpGRm-ijcla_rLGZA7moKU3nDjm';                 // the "PHOTOS" Drive folder
var CONFIG_SHEET_ID = '1Xw8ZtnVGdbjjEkQ4AYLCv7q-8owpdyVmmblo6fimkAo';      // SDTS Site Config sheet
var PHOTOS_TAB      = 'Photos';
var ARCHIVE_NAME    = 'Archive';                                          // subfolder for removed photos

/* ---------------- web app entry ---------------- */
function doGet() {
  return HtmlService.createHtmlOutput(PAGE_HTML_())
    .setTitle('SDTS Photo Manager')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------------- auth ---------------- */
function checkKey_(key) {
  var want = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!want) throw new Error('No ADMIN_KEY is set. Add it in Project Settings → Script Properties.');
  if (String(key) !== String(want)) throw new Error('Wrong password.');
  return true;
}

/* ---------------- listing ---------------- */
// Live photos = main folder ("Other") + each season subfolder (label = name),
// skipping Archive. Season subfolders first (newest year), each newest-first.
function listPhotos(key) {
  checkKey_(key);
  var parent = DriveApp.getFolderById(PHOTO_FOLDER_ID), out = [];
  var subs = seasonFolders_(parent);
  subs.forEach(function (fo) { collectFolder_(fo, fo.getName(), out); });
  collectFolder_(parent, 'Other', out);
  return out;
}

function listArchived(key) {     // removed photos (Archive subfolder)
  checkKey_(key);
  var arch = getArchiveFolder_(false);
  return arch ? collectFolder_(arch, 'Archived', []) : [];
}

function collectFolder_(folder, season, out) {
  out = out || [];
  var it = folder.getFiles(), batch = [];
  while (it.hasNext()) {
    var f = it.next();
    if ((f.getMimeType() || '').indexOf('image/') !== 0) continue;
    batch.push({
      id: f.getId(), name: f.getName(), season: season,
      caption: (f.getDescription() || '').trim(),
      thumb: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w600',
      created: f.getDateCreated().getTime()
    });
  }
  batch.sort(function (a, b) { return b.created - a.created; });   // newest first
  batch.forEach(function (r) { out.push(r); });
  return out;
}

// Season subfolders (everything except Archive), newest year first.
function seasonFolders_(parent) {
  var subs = [], fit = parent.getFolders();
  while (fit.hasNext()) { var fo = fit.next(); if (fo.getName() !== ARCHIVE_NAME) subs.push(fo); }
  subs.sort(function (a, b) {
    var ya = syear_(a.getName()), yb = syear_(b.getName());
    if (yb !== ya) return yb - ya;
    return a.getName() < b.getName() ? 1 : -1;
  });
  return subs;
}
function syear_(n) { var m = String(n).match(/(20\d\d)/); return m ? +m[1] : 0; }

/* ---------------- actions ---------------- */
function archivePhoto(key, fileId) {       // remove from site (reversible)
  checkKey_(key);
  var f = DriveApp.getFileById(fileId);
  f.moveTo(getArchiveFolder_(true));
  resync_();
  return listPhotos(key);
}

function restorePhoto(key, fileId) {       // put a removed photo back
  checkKey_(key);
  var f = DriveApp.getFileById(fileId);
  f.moveTo(DriveApp.getFolderById(PHOTO_FOLDER_ID));
  resync_();
  return listArchived(key);
}

function saveCaption(key, fileId, caption) {   // edit a photo's caption (Drive description)
  checkKey_(key);
  DriveApp.getFileById(fileId).setDescription(String(caption || '').trim());
  resync_();
  return true;
}

/* ---------------- helpers ---------------- */
function getArchiveFolder_(createIfMissing) {
  var parent = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  var it = parent.getFoldersByName(ARCHIVE_NAME);
  if (it.hasNext()) return it.next();
  return createIfMissing ? parent.createFolder(ARCHIVE_NAME) : null;
}

// Rewrite the Photos tab (Image|Caption|File|Season) from the main folder plus
// each season subfolder (mirrors SDTS Photo Sync v1.2). Archive is skipped.
function resync_() {
  var parent = DriveApp.getFolderById(PHOTO_FOLDER_ID), rows = [];
  seasonFolders_(parent).forEach(function (fo) { pushRows_(fo, fo.getName(), rows); });
  pushRows_(parent, 'Other', rows);
  var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID);
  var sh = ss.getSheetByName(PHOTOS_TAB) || ss.insertSheet(PHOTOS_TAB);
  sh.getRange(1, 1, 1, 4).setValues([['Image', 'Caption', 'File', 'Season']]);
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 4).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, 4)
    .setValues(rows.map(function (r) { return [r.url, r.caption, r.file, r.season]; }));
}

function pushRows_(folder, season, rows) {
  var it = folder.getFiles(), batch = [];
  while (it.hasNext()) {
    var f = it.next();
    if ((f.getMimeType() || '').indexOf('image/') !== 0) continue;
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    batch.push({ url: f.getUrl(), caption: (f.getDescription() || '').trim(),
                 file: f.getName(), season: season, created: f.getDateCreated() });
  }
  batch.sort(function (a, b) { return b.created - a.created; });
  batch.forEach(function (r) { rows.push(r); });
}

// One-time convenience: set the editor, run this once, then clear the argument.
function setAdminKey() {
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', 'CHANGE_ME');
}

/* ---------------- the page (HTML/CSS/JS in one string) ---------------- */
function PAGE_HTML_() {
  return '' +
'<!doctype html><html><head><meta charset="utf-8">' +
'<style>' +
'  :root{--navy:#14294a;--red:#a32533;--line:#e3e6ea;--muted:#6b7480}' +
'  *{box-sizing:border-box}' +
'  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;color:#1d1d1f;background:#f5f5f7}' +
'  header{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--line);padding:14px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}' +
'  header h1{font-size:1.05rem;margin:0;color:var(--navy)}' +
'  .tab{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 14px;font-size:.85rem;cursor:pointer}' +
'  .tab.on{background:var(--navy);color:#fff;border-color:var(--navy)}' +
'  .seasonsel{border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:.85rem;background:#fff;cursor:pointer}' +
'  .sp{flex:1}' +
'  .count{color:var(--muted);font-size:.85rem}' +
'  main{padding:20px;max-width:1100px;margin:0 auto}' +
'  .gate{max-width:340px;margin:80px auto;background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px;text-align:center}' +
'  .gate input{width:100%;padding:10px;font-size:1rem;border:1px solid var(--line);border-radius:8px;margin:12px 0}' +
'  button.go{background:var(--navy);color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:.95rem;cursor:pointer}' +
'  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}' +
'  .card{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}' +
'  .card img{width:100%;height:160px;object-fit:cover;object-position:center top;background:#eee;display:block}' +
'  .card .meta{padding:10px 12px;font-size:.8rem}' +
'  .card .fn{font-weight:600;word-break:break-all;color:var(--navy)}' +
'  .card .cap{color:var(--muted);margin-top:4px}' +
'  .card .cap.capempty{font-style:italic;opacity:.65}' +
'  .card .capedit{margin-top:6px}' +
'  .card .capin{width:100%;padding:6px 8px;font-size:.8rem;border:1px solid var(--line);border-radius:6px;font-family:inherit}' +
'  .card .caprow{display:flex;gap:6px;margin-top:6px}' +
'  .card .caprow .btn{padding:6px}' +
'  .card .caprow .btn:disabled{opacity:.6;cursor:default}' +
'  .card .seasontag{display:inline-block;margin-top:6px;font-size:.72rem;font-weight:600;color:var(--navy);background:#eef2f7;border-radius:999px;padding:3px 9px}' +
'  .card .row{display:flex;gap:8px;padding:0 12px 12px}' +
'  .btn{flex:1;border:1px solid var(--line);background:#fff;border-radius:8px;padding:8px;font-size:.82rem;cursor:pointer}' +
'  .btn.danger{color:var(--red);border-color:#f2c9ce}' +
'  .btn.primary{background:var(--navy);color:#fff;border-color:var(--navy)}' +
'  .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1d1d1f;color:#fff;padding:10px 16px;border-radius:10px;font-size:.85rem;opacity:0;transition:opacity .2s;pointer-events:none}' +
'  .toast.show{opacity:1}' +
'  .empty{color:var(--muted);text-align:center;padding:60px 0}' +
'</style></head><body>' +

'<div id="gateWrap"><div class="gate">' +
'  <h1 style="color:#14294a;margin:0 0 4px">SDTS Photo Manager</h1>' +
'  <p style="color:#6b7480;font-size:.85rem;margin:0">Enter the manager password.</p>' +
'  <input id="pw" type="password" placeholder="Password" autocomplete="current-password">' +
'  <button class="go" onclick="unlock()">Unlock</button>' +
'  <div id="gateErr" style="color:#a32533;font-size:.85rem;margin-top:10px"></div>' +
'</div></div>' +

'<div id="app" style="display:none">' +
'  <header>' +
'    <h1>Photo Manager</h1>' +
'    <button class="tab on" id="tabActive" onclick="show(\'active\')">Live gallery</button>' +
'    <button class="tab" id="tabArch" onclick="show(\'archived\')">Archived</button>' +
'    <select id="seasonSel" class="seasonsel" style="display:none" onchange="applyFilter()"></select>' +
'    <span class="sp"></span>' +
'    <span class="count" id="count"></span>' +
'  </header>' +
'  <main><div class="grid" id="grid"></div><div class="empty" id="empty" style="display:none"></div></main>' +
'</div>' +
'<div class="toast" id="toast"></div>' +

'<script>' +
'  var KEY="", MODE="active", CAPS={};' +
'  function toast(m){var t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(function(){t.classList.remove("show")},1800);}' +
'  function unlock(){' +
'    var pw=document.getElementById("pw").value;' +
'    document.getElementById("gateErr").textContent="Checking…";' +
'    google.script.run.withSuccessHandler(function(list){KEY=pw;sessionStorage.setItem("sdts_pk",pw);document.getElementById("gateWrap").style.display="none";document.getElementById("app").style.display="block";paint(list);})' +
'      .withFailureHandler(function(e){document.getElementById("gateErr").textContent=e.message;}).listPhotos(pw);' +
'  }' +
'  function show(mode){MODE=mode;' +
'    document.getElementById("tabActive").className="tab"+(mode==="active"?" on":"");' +
'    document.getElementById("tabArch").className="tab"+(mode==="archived"?" on":"");' +
'    var r=google.script.run.withSuccessHandler(paint).withFailureHandler(function(e){toast(e.message)});' +
'    if(mode==="active"){r.listPhotos(KEY);}else{r.listArchived(KEY);}' +
'  }' +
'  function syear(s){var m=String(s).match(/(20\\d\\d)/);return m?+m[1]:0;}' +
'  function paint(list){' +
'    var g=document.getElementById("grid"),e=document.getElementById("empty"),sel=document.getElementById("seasonSel");' +
'    if(!list.length){g.innerHTML="";document.getElementById("count").textContent="0 photos";e.style.display="block";e.textContent=MODE==="active"?"No photos in the folder.":"Nothing archived.";sel.style.display="none";return;}' +
'    e.style.display="none";' +
'    g.innerHTML=list.map(function(p){' +
'      CAPS[p.id]=p.caption||"";' +
'      var capTxt=p.caption?esc(p.caption):"(no caption)";' +
'      var capView=\'<div class="capview"><div class="cap \'+(p.caption?"":"capempty")+\'">\'+capTxt+\'</div></div><div class="capedit"></div>\';' +
'      var btns=MODE==="active"' +
'        ? \'<button class="btn" onclick="editCap(\\\'\'+p.id+\'\\\')">Edit caption</button><button class="btn danger" onclick="archive(\\\'\'+p.id+\'\\\',\\\'\'+esc(p.name)+\'\\\')">Remove</button>\'' +
'        : \'<button class="btn primary" onclick="restore(\\\'\'+p.id+\'\\\')">Restore</button>\';' +
'      var capBlock=MODE==="active"?capView:(p.caption?\'<div class="cap">\'+esc(p.caption)+\'</div>\':"");' +
'      return \'<div class="card" id="card_\'+p.id+\'" data-season="\'+esc(p.season||"")+\'"><img loading="lazy" src="\'+p.thumb+\'">\'+' +
'        \'<div class="meta"><div class="fn">\'+esc(p.name)+\'</div>\'+capBlock+((p.season&&MODE==="active")?\'<span class="seasontag">\'+esc(p.season)+\'</span>\':"")+\'</div>\'+' +
'        \'<div class="row">\'+btns+\'</div></div>\';' +
'    }).join("");' +
'    var seasons=[];list.forEach(function(p){var s=p.season||"Other";if(seasons.indexOf(s)<0)seasons.push(s);});' +
'    seasons.sort(function(a,b){if(a==="Other")return 1;if(b==="Other")return -1;var ya=syear(a),yb=syear(b);return yb!==ya?yb-ya:(a<b?-1:1);});' +
'    if(MODE==="active"&&seasons.length>1){' +
'      var keep=sel.value;' +
'      sel.innerHTML=\'<option value="__all">All seasons</option>\'+seasons.map(function(s){return \'<option value="\'+esc(s)+\'">\'+esc(s)+\'</option>\';}).join("");' +
'      sel.value=(keep&&(keep==="__all"||seasons.indexOf(keep)>=0))?keep:"__all";' +
'      sel.style.display="";' +
'    } else { sel.style.display="none"; sel.value="__all"; }' +
'    applyFilter();' +
'  }' +
'  function applyFilter(){' +
'    var sel=document.getElementById("seasonSel"),v=sel.value||"__all",cards=document.querySelectorAll("#grid .card"),shown=0;' +
'    for(var i=0;i<cards.length;i++){var ok=(v==="__all"||cards[i].getAttribute("data-season")===v);cards[i].style.display=ok?"":"none";if(ok)shown++;}' +
'    document.getElementById("count").textContent=shown+" photo"+(shown===1?"":"s")+(v!=="__all"?" in "+v:"");' +
'  }' +
'  function archive(id,name){' +
'    if(!confirm("Remove \\""+name+"\\" from the website?\\n\\nIt moves to the Archive folder — you can restore it anytime."))return;' +
'    toast("Removing…");' +
'    google.script.run.withSuccessHandler(function(list){paint(list);toast("Removed.");})' +
'      .withFailureHandler(function(e){toast(e.message)}).archivePhoto(KEY,id);' +
'  }' +
'  function restore(id){toast("Restoring…");' +
'    google.script.run.withSuccessHandler(function(list){paint(list);toast("Restored.");})' +
'      .withFailureHandler(function(e){toast(e.message)}).restorePhoto(KEY,id);' +
'  }' +
'  function editCap(id){' +
'    var card=document.getElementById("card_"+id);if(!card)return;' +
'    card.querySelector(".capview").style.display="none";' +
'    var holder=card.querySelector(".capedit");' +
'    holder.innerHTML=\'<input class="capin" type="text" maxlength="120" value="\'+esc(CAPS[id]||"")+\'">\'+' +
'      \'<div class="caprow"><button class="btn primary" onclick="saveCap(\\\'\'+id+\'\\\')">Save</button>\'+' +
'      \'<button class="btn" onclick="cancelCap(\\\'\'+id+\'\\\')">Cancel</button></div>\';' +
'    var inp=holder.querySelector(".capin");inp.focus();inp.select();' +
'    inp.addEventListener("keydown",function(ev){if(ev.key==="Enter"){ev.preventDefault();saveCap(id);}else if(ev.key==="Escape"){cancelCap(id);}});' +
'  }' +
'  function saveCap(id){' +
'    var card=document.getElementById("card_"+id),inp=card.querySelector(".capin");if(!inp)return;' +
'    var val=inp.value;' +
'    var btns=card.querySelectorAll(".caprow .btn"),save=card.querySelector(".caprow .btn.primary");' +
'    for(var i=0;i<btns.length;i++){btns[i].disabled=true;btns[i].blur();}' +
'    if(save)save.textContent="Saving…";' +
'    google.script.run.withSuccessHandler(function(){CAPS[id]=String(val).trim();renderCapView(id);toast("Caption saved.");})' +
'      .withFailureHandler(function(e){for(var i=0;i<btns.length;i++)btns[i].disabled=false;if(save)save.textContent="Save";toast(e.message);}).saveCaption(KEY,id,val);' +
'  }' +
'  function cancelCap(id){renderCapView(id);}' +
'  function renderCapView(id){' +
'    var card=document.getElementById("card_"+id);if(!card)return;' +
'    card.querySelector(".capedit").innerHTML="";' +
'    var view=card.querySelector(".capview");view.style.display="";' +
'    var cap=CAPS[id]||"",d=view.querySelector(".cap");' +
'    d.textContent=cap||"(no caption)";d.className="cap"+(cap?"":" capempty");' +
'  }' +
'  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\'/g,"&#39;");}' +
'  (function(){var s=sessionStorage.getItem("sdts_pk");if(s){document.getElementById("pw").value=s;}})();' +
'</script></body></html>';
}
