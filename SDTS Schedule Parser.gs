/**
 * SDTS Schedule Parser
 * Version: 1.0
 * ------------------------------------------------------------
 * Parses the free-text "SDTS Calendar" sheet into a clean, structured
 * table, and (optionally) creates Google Calendar events from it.
 *
 * INSTALL
 *   Open the SDTS Calendar sheet → Extensions → Apps Script →
 *   paste this in → Save. Reload the sheet. A "TOPSoccer Schedule"
 *   menu appears.
 *
 * USE
 *   • TOPSoccer Schedule → Parse to "Schedule (parsed)" tab
 *       Reads the messy text and writes tidy columns:
 *       Date | Event | Time | Location | Notes | Check
 *       (Columns A–E are website-ready: copy them into the Config
 *        sheet's "Schedule" tab. Column F = review flags only.)
 *   • TOPSoccer Schedule → Create Google Calendar events
 *       Adds the events to a calendar named below (created if missing).
 *
 * "MOSTLY" RIGHT
 *   Free text can't be parsed perfectly. Anything ambiguous (AM/PM
 *   guesses, a weekday that doesn't match its date) is marked in the
 *   "Check" column so a human can verify. Fix the source sheet and
 *   re-run anytime.
 */

/* ---------------- config ---------------- */
var YEAR = 2026;                                  // season year (the sheet title is cut off)
var TZ = 'America/New_York';
var SOURCE_SHEET = '';                            // '' = first tab; or a tab name
var OUTPUT_SHEET = 'Schedule (parsed)';
var CALENDAR_NAME = 'South Dayton TOPSoccer';     // calendar to create events in

var MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
var VENUES = ['Oak Grove Park', 'CHS Alumni Field', 'Hope Church', 'Presidential Banquet Center'];

/* ---------------- menu ---------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('TOPSoccer Schedule')
    .addItem('Parse to "Schedule (parsed)" tab', 'parseToTab')
    .addItem('Create Google Calendar events', 'createCalendarEvents')
    .addToUi();
}

/* ---------------- parse → tab ---------------- */
function parseToTab() {
  var events = parseAll_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = ss.getSheetByName(OUTPUT_SHEET) || ss.insertSheet(OUTPUT_SHEET);
  out.clear();

  var header = ['Date', 'Event', 'Time', 'Location', 'Notes', 'Check'];
  var rows = events.map(function (e) {
    return [
      Utilities.formatDate(e.date, TZ, 'EEE, MMM d'),
      e.event,
      e.timeText,
      e.location,
      e.notes.join('; '),
      e.flags.join('; ')
    ];
  });

  out.getRange(1, 1, 1, header.length).setValues([header])
     .setFontWeight('bold').setBackground('#1a3c6e').setFontColor('#ffffff');
  if (rows.length) out.getRange(2, 1, rows.length, header.length).setValues(rows);
  out.setFrozenRows(1);
  out.autoResizeColumns(1, header.length);

  SpreadsheetApp.getUi().alert('Parsed ' + events.length + ' entries into "' + OUTPUT_SHEET +
    '".\n\nColumns A–E are ready to copy into the website Config sheet’s Schedule tab. ' +
    'Check column F for anything that needs a human eye.');
}

/* ---------------- parse → calendar ---------------- */
function createCalendarEvents() {
  var events = parseAll_();
  var cal = CalendarApp.getCalendarsByName(CALENDAR_NAME)[0] ||
            CalendarApp.createCalendar(CALENDAR_NAME);

  var added = 0, skipped = 0;
  events.forEach(function (e) {
    var title = 'TOPSoccer: ' + e.event + (e.notes.length ? ' (' + e.notes.join('; ') + ')' : '');
    // de-dupe: skip if an event with this title already exists that day
    var existing = cal.getEventsForDay(e.date).some(function (ev) { return ev.getTitle() === title; });
    if (existing) { skipped++; return; }

    var opts = { location: e.location, description: e.notes.join('\n') };
    if (e.allDay) cal.createAllDayEvent(title, e.date, opts);
    else cal.createEvent(title, e.start, e.end, opts);
    added++;
  });

  SpreadsheetApp.getUi().alert('Calendar "' + CALENDAR_NAME + '": added ' + added +
    ' event(s), skipped ' + skipped + ' already there.');
}

/* ---------------- core parsing ---------------- */
function parseAll_() {
  var sh = SOURCE_SHEET ? SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOURCE_SHEET)
                        : SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var values = sh.getDataRange().getValues();

  // Flatten each row into one text line (handles data in one column or several).
  var lines = values.map(function (r) {
    return r.map(function (c) { return c == null ? '' : String(c).trim(); })
            .filter(String).join('  ').trim();
  });

  var events = [];
  lines.forEach(function (line) {
    if (!line) return;
    var date = parseDate_(line);
    if (date) {
      events.push(buildEvent_(line, date));
    } else if (events.length) {
      attachExtra_(events[events.length - 1], line);   // continuation note/location
    }
  });
  return events;
}

function parseDate_(line) {
  var m = line.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?,?\s+([a-z]{3,9})\.?\s+(\d{1,2})\b/i);
  if (!m) return null;
  var mon = MONTHS[m[2].toLowerCase().slice(0, 3)];
  if (mon == null) return null;
  return { date: new Date(YEAR, mon, parseInt(m[3], 10)), statedDay: m[1].toLowerCase() };
}

function buildEvent_(line, d) {
  var e = { date: d.date, event: '', timeText: '', location: '', notes: [], flags: [],
            start: null, end: null, allDay: true };

  // Event type
  if (/no practice|no game/i.test(line)) e.event = 'No practice or game';
  else if (/topsoccer night/i.test(line)) e.event = 'TOPSoccer Night';
  else if (/fall classic/i.test(line)) e.event = 'Fall Classic';
  else if (/banquet/i.test(line)) e.event = 'End of season banquet';
  else if (/\bgame\b/i.test(line)) e.event = 'Game';
  else if (/\bpractice\b/i.test(line)) e.event = 'Practice';
  else e.event = line.replace(/^[a-z]+\.?,?\s+[a-z]+\.?\s+\d{1,2}\s*/i, '').trim() || 'Event';

  // Times
  var t = parseTimes_(line, d.date);
  e.timeText = t.timeText; e.start = t.start; e.end = t.end; e.allDay = t.allDay;
  if (t.inferred) e.flags.push('verify AM/PM');

  // Location
  e.location = findVenue_(line);

  // Notes embedded on the same line
  if (/picture day/i.test(line)) {
    var pd = line.match(/picture day[^,;]*/i); e.notes.push(titleCase_(pd ? pd[0] : 'Picture Day'));
  }
  var due = line.match(/due to ([^.;]+)/i); if (due) e.notes.push('Due to ' + due[1].trim());
  if (/labor day weekend/i.test(line)) e.notes.push('Labor Day weekend');

  // Weekday sanity check
  var computed = Utilities.formatDate(d.date, TZ, 'EEE').toLowerCase().slice(0, 3);
  if (d.statedDay && computed !== d.statedDay.slice(0, 3)) {
    e.flags.push('date/day mismatch — sheet says ' + d.statedDay);
  }
  return e;
}

function attachExtra_(e, line) {
  var v = findVenue_(line);
  if (v && !e.location) { e.location = v; return; }
  if (/picture day/i.test(line)) { e.notes.push(titleCase_(line)); return; }
  var note = line.replace(/^note:\s*/i, '').trim();
  if (note) e.notes.push(note);
}

function parseTimes_(line, dateObj) {
  var m = line.match(/(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return { timeText: '', start: null, end: null, allDay: true, inferred: false };

  var sh = +m[1], sm = +(m[2] || 0), eh = +m[3], em = +(m[4] || 0);
  var mer = (m[5] || '').toLowerCase();
  var inferred = !mer;
  var endPM = mer ? (mer === 'pm') : true;            // default afternoon/evening
  // start period: if start hour reads later than end hour on a clock, it's the earlier half (AM)
  var startPM = (sh > eh) ? false : endPM;

  var start = new Date(dateObj); start.setHours(to24_(sh, startPM), sm, 0, 0);
  var end = new Date(dateObj);   end.setHours(to24_(eh, endPM), em, 0, 0);
  var timeText = fmt_(start) + '–' + fmt_(end);
  return { timeText: timeText, start: start, end: end, allDay: false, inferred: inferred };
}

/* ---------------- helpers ---------------- */
function to24_(h, pm) { h = h % 12; return pm ? h + 12 : h; }
function fmt_(d) { return Utilities.formatDate(d, TZ, 'h:mm a'); }

function findVenue_(line) {
  for (var i = 0; i < VENUES.length; i++) {
    if (line.toLowerCase().indexOf(VENUES[i].toLowerCase()) !== -1) {
      if (VENUES[i] === 'Hope Church') return 'Hope Church, Mason';
      if (VENUES[i] === 'Presidential Banquet Center') return 'Presidential Banquet Center, Kettering';
      return VENUES[i];
    }
  }
  return '';
}

function titleCase_(s) {
  return s.replace(/\w\S*/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); });
}
