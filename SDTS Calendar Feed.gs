/**
 * SDTS Calendar Feed (iCalendar subscription)
 * Version: 1.1
 * ------------------------------------------------------------
 * Serves the season schedule as a live .ics feed people can SUBSCRIBE to
 * in Google Calendar, Apple Calendar, or Outlook. It reads the SAME
 * "Schedule" tab the website uses, so there's one source of truth — edit
 * the sheet and everyone's subscribed calendar updates automatically.
 *
 * INSTALL
 *   Open the SDTS Site Config sheet → Extensions → Apps Script →
 *   add a new script file, paste this in → Save.
 *   Deploy → New deployment → type "Web app":
 *       Execute as: Me
 *       Who has access: Anyone
 *   Copy the web-app URL (ends in /exec). That URL is the calendar feed.
 *
 * HOW PEOPLE SUBSCRIBE
 *   - Apple Calendar / Outlook / phones: use webcal://… (swap https:// for
 *     webcal:// in the /exec URL) — it offers to subscribe.
 *   - Google Calendar: Other calendars → "+" → From URL → paste the /exec URL.
 *   Put the webcal:// version into the Config sheet's `calendar_url` cell and
 *   the website shows a "Subscribe to the schedule" button automatically.
 */

/* ---------------- config ---------------- */
var YEAR = 2026;                         // season year (Schedule dates have no year)
var TZ = 'America/New_York';
var EDT_OFFSET = 4;                      // Aug–Oct are EDT (UTC-4)
var SCHEDULE_TAB = 'Schedule';
var CAL_NAME = 'South Dayton TOPSoccer';

var MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

/* ---------------- web app ---------------- */
function doGet() {
  return ContentService.createTextOutput(buildIcs_())
    .setMimeType(ContentService.MimeType.ICAL);
}

function buildIcs_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCHEDULE_TAB);
  var values = sh ? sh.getDataRange().getValues() : [];
  var stamp = Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'");

  var out = ['BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//South Dayton TOPSoccer//Schedule//EN', 'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH', 'X-WR-CALNAME:' + CAL_NAME, 'X-WR-TIMEZONE:' + TZ,
    'X-PUBLISHED-TTL:PT12H', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H'];

  for (var i = 1; i < values.length; i++) {     // row 1 = header
    var row = values[i];
    var dateStr = String(row[0] == null ? '' : row[0]).trim();
    var date = parseDate_(dateStr);
    if (!date) continue;
    var event = String(row[1] == null ? '' : row[1]).trim() || 'Event';
    var time  = parseTime_(String(row[2] == null ? '' : row[2]).trim(), date);
    var locRaw = String(row[3] == null ? '' : row[3]).trim();
    var loc   = locText_(locRaw);                 // strip any [text](url) to plain text
    var mapUrl = locLink_(locRaw);                // pull the URL out, if any
    var notes = String(row[4] == null ? '' : row[4]).trim();
    if (mapUrl) notes = (notes ? notes + '\n' : '') + 'Map: ' + mapUrl;

    out.push('BEGIN:VEVENT');
    out.push('UID:sdts-' + Utilities.formatDate(date, TZ, 'yyyyMMdd') + '-' + slug_(event) + '@southdaytontopsoccer.com');
    out.push('DTSTAMP:' + stamp);
    if (time.allDay) {
      out.push('DTSTART;VALUE=DATE:' + Utilities.formatDate(date, TZ, 'yyyyMMdd'));
      out.push('DTEND;VALUE=DATE:' + Utilities.formatDate(addDays_(date, 1), TZ, 'yyyyMMdd'));
    } else {
      out.push('DTSTART:' + utc_(time.start));
      out.push('DTEND:' + utc_(time.end));
    }
    out.push('SUMMARY:' + esc_('TOPSoccer: ' + event));
    if (loc) out.push('LOCATION:' + esc_(loc));
    if (notes) out.push('DESCRIPTION:' + esc_(notes));
    out.push('END:VEVENT');
  }
  out.push('END:VCALENDAR');
  return out.join('\r\n') + '\r\n';
}

/* ---------------- helpers ---------------- */
function parseDate_(s) {
  var m = s.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})/);
  if (!m) return null;
  var mon = MONTHS[m[1].slice(0, 3)];
  if (mon == null) return null;
  return new Date(YEAR, mon, parseInt(m[2], 10));
}

// Time text like "3:30 PM–5:00 PM" (or "9:00 AM–2:30 PM"). Blank = all-day.
function parseTime_(s, d) {
  var m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return { allDay: true };
  var y = d.getFullYear(), mo = d.getMonth(), da = d.getDate();
  var start = new Date(Date.UTC(y, mo, da, to24_(+m[1], m[3]) + EDT_OFFSET, +m[2]));
  var end   = new Date(Date.UTC(y, mo, da, to24_(+m[4], m[6]) + EDT_OFFSET, +m[5]));
  return { allDay: false, start: start, end: end };
}

// A Location cell may be "Hope Church, Mason" or "[Hope Church, Mason](https://…)".
function locText_(s) { return s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1'); }
function locLink_(s) { var m = s.match(/\]\((https?:\/\/[^\s)]+)\)/); return m ? m[1] : ''; }

function to24_(h, mer) { h = h % 12; return /pm/i.test(mer) ? h + 12 : h; }
function utc_(d) { return Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'"); }
function addDays_(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function slug_(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function esc_(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
