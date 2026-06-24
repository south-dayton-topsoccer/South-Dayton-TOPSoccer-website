/* =============================================================
   South Dayton TOPSoccer — site configuration
   Version: 1.6
   -------------------------------------------------------------
   This is the ONLY file you edit on the site itself, and you
   really only touch ONE line: SHEET_ID.

   Everything else about the site (schedule, alerts, phone,
   email, registration link, announcements, sponsors, FAQs) is
   edited in the Google Sheet — no code changes needed.

   HOW TO CONNECT YOUR SHEET
   1. Build the "SDTS Site Config" Google Sheet (see README).
   2. File → Share → General access → "Anyone with the link: Viewer".
   3. Copy the Sheet ID from its URL:
        docs.google.com/spreadsheets/d/THIS_PART/edit
   4. Paste it between the quotes on the SHEET_ID line below.

   Leave SHEET_ID = '' to preview the site with the built-in
   sample content (SAMPLE, at the bottom of this file).
   ============================================================= */

window.SDTS_CONFIG = {

  SHEET_ID: '1Xw8ZtnVGdbjjEkQ4AYLCv7q-8owpdyVmmblo6fimkAo',   // live SDTS Site Config sheet

  // Tab (sheet) names inside that workbook. Change only if you rename tabs.
  TABS: {
    config:   'Config',
    stats:    'Stats',
    schedule: 'Schedule',
    faqs:     'FAQs',
    sponsors: 'Sponsors',
    contacts: 'Contacts',
    photos:   'Photos'
  },

  // -----------------------------------------------------------
  // Built-in fallback content. Used when SHEET_ID is empty or the
  // sheet can't be reached. Mirror of what the Sheet provides, so
  // the site always shows something sensible.
  // -----------------------------------------------------------
  SAMPLE: {
    config: {
      org_name: 'South Dayton TOPSoccer',
      tagline: 'The Outreach Program for Soccer',
      logo_url: '',        // optional logo image (Drive link or URL); blank = built-in ball mark
      logo_height: '',     // optional nav logo height in px (e.g. 48); blank = sensible default
      hero_headline: 'Soccer for *every* child and young adult.',
      hero_subtext: 'An all-volunteer program for kids and adults with disabilities — built around fun and participation, not winning.',
      hotline_phone: '(937) 815-1548',
      contact_email: 'SDTSAdmin@gmail.com',
      registration_open: 'TRUE',
      registration_url: 'https://www.southdaytontopsoccer.com/signup.html',
      registration_window: 'Registration for the fall season runs mid-July through early August.',
      calendar_url: '',   // webcal://…/exec from the SDTS Calendar Feed script (Subscribe button)
      volunteer_url: 'https://www.southdaytontopsoccer.com/volunteer.html',
      donate_url: '',
      facebook_url: '',
      instagram_url: '',
      schedule_heading: '',   // optional schedule section heading; blank = "This season's schedule"
      season_info: 'Our season runs August through October. All practices and games are played Wednesday evenings and Sunday afternoons at Oak Grove Park in Centerville.',
      about_text: 'TOPSoccer is a national US Youth Soccer program for children and young adults with disabilities. Any child or young adult ages 5 and up who is not able to compete effectively in a local recreational league — for any reason — is welcome to play. Coaches provide equal opportunity for all children, regardless of ability. While we are based in the Centerville/Washington Township area, children from all areas are invited to play.',
      location_name: 'Oak Grove Park',
      location_address: 'Centerville, OH',
      location_maps_url: 'https://www.google.com/maps/search/?api=1&query=Oak+Grove+Park+Centerville+OH',
      photos_url: 'https://photos.google.com/u/2/album/AF1QipOT5vRxAi-qLImFiA9s20hxb-LJ7wgpmL7ckDGh',
      mailing_address: 'South Dayton TOPSoccer, P.O. Box 750252, Dayton, OH 45475',
      donate_text: 'To make a personal or business donation, please make checks payable to South Dayton TOPSoccer and mail to the address above. We are a 501(c)(3) non-profit organization.',
      // Banner controls — flip alert_active to TRUE for rain-outs / field closings
      alert_active: 'FALSE',
      alert_message: '',
      // General announcement card (leave blank to hide)
      announcement: ''
    },
    schedule: [
      { Date: 'Wednesdays', Event: 'Practice & games', Time: 'Evening', Location: 'Oak Grove Park', Notes: 'August–October' },
      { Date: 'Sundays',    Event: 'Practice & games', Time: 'Afternoon', Location: 'Oak Grove Park', Notes: 'August–October' }
    ],
    faqs: [
      { Question: 'Who can play?', Answer: 'Any child or young adult ages 5 and up with a disability or special need. Players of all abilities are welcome.' },
      { Question: 'How much does it cost?', Answer: 'South Dayton TOPSoccer is an all-volunteer program. See the registration page for current details.' },
      { Question: 'Where are practices and games?', Answer: 'Oak Grove Park in Centerville, on Wednesday evenings and Sunday afternoons.' },
      { Question: 'Is there a program closer to North Dayton?', Answer: 'Yes. For the Vandalia/North Dayton area program, call Amber Robinson at (937) 286-9514. Players are welcome at either location.' }
    ],
    sponsors: [
      { Name: 'Your sponsor here', URL: '', Level: 'Sponsor' }
    ],
    contacts: [
      { Name: 'TOPSoccer Hotline', Role: 'South Dayton program', Email: '', Phone: '(937) 815-1548' },
      { Name: 'Amber Robinson', Role: 'North Dayton / Vandalia program', Email: '', Phone: '(937) 286-9514' }
    ],
    stats: [
      { Number: '150+', Label: 'Athletes each year' },
      { Number: 'Ages 5+', Label: 'All ages welcome' },
      { Number: '100%', Label: 'Volunteer-run' },
      { Number: 'Since 2013', Label: 'Serving South Dayton' }
    ],
    // Photos: paste a shareable Google Drive image link (or any direct image URL)
    // in Image, plus an optional Caption. (These previews are placeholders.)
    photos: [
      { Image: 'https://picsum.photos/seed/sdts1/800/600', Caption: 'Game day at Oak Grove Park' },
      { Image: 'https://picsum.photos/seed/sdts2/800/600', Caption: 'Players and their buddies' },
      { Image: 'https://picsum.photos/seed/sdts3/800/600', Caption: 'Team huddle' },
      { Image: 'https://picsum.photos/seed/sdts4/800/600', Caption: 'Celebrating a goal' }
    ]
  }
};
