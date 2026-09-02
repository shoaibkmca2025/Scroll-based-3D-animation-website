// All page copy lives here so the section components stay markup-only.

export const problems = [
  {
    n: '01',
    title: 'Notices scroll away',
    body: 'A group chat where the AGM notice sits under forty forwards by evening.'
  },
  {
    n: '02',
    title: 'A register nobody can read',
    body: 'Visitor names written by hand at the gate, unsearchable the moment they are needed.'
  },
  {
    n: '03',
    title: 'Maintenance chased by phone',
    body: 'The treasurer calling flat by flat, keeping the tally in a personal notebook.'
  },
  {
    n: '04',
    title: 'No record of who came in',
    body: 'When it matters there is no entry log — and no attendance record for household staff.'
  }
];

export const gateSteps = [
  {
    n: '1',
    title: 'Resident generates a pass',
    body: 'A QR for the guest, with an expiry. Household staff get a monthly one instead.'
  },
  {
    n: '2',
    title: 'Shares it on WhatsApp',
    body: 'The guest needs nothing installed. The pass arrives where they already are.'
  },
  {
    n: '3',
    title: 'The guard scans, it is logged',
    body: "Entry and exit recorded. For staff, the same scan doubles as the day's attendance."
  }
];

export const gateNotes = [
  {
    title: 'WhatsApp OTP, not SMS',
    body: 'Verification arrives where Indian users already are — no SMS deliverability problems.'
  },
  {
    title: 'Call Security Desk',
    body: "Rings whoever is actually on duty, resolved from that guard's attendance — not a number printed in the app."
  },
  {
    title: 'SOS to the gate',
    body: "A panic button that raises an alert on the guard's screen."
  }
];

export const audiences = [
  {
    variant: 'res',
    kicker: 'Residents',
    kickerTone: 'accent',
    title: 'Owners & tenants',
    items: [
      'Visitor gate passes with a QR the guard scans',
      'Register household staff for a monthly pass',
      'Dues, receipts and community fund drives',
      'Amenity booking, complaints, notices and RSVPs'
    ],
    img: 'shots/home',
    alt: 'Resident home screen'
  },
  {
    variant: 'com',
    kicker: 'Committee',
    kickerTone: 'sage',
    title: 'Secretary, chairman, treasurer',
    items: [
      'Approve registrations and profile changes',
      'Set the maintenance amount, date and reminders',
      "Record expenses and the society's UPI details",
      'Register guards, approve staff, issue gate passes'
    ],
    img: 'shots/maintenance',
    alt: 'Maintenance controls for the committee'
  },
  {
    variant: 'sec',
    kicker: 'Security',
    kickerTone: 'light',
    title: 'The guard at the gate',
    items: [
      'Scan visitor and staff passes to log entry and exit',
      'See who is expected today',
      'Respond to SOS alerts from residents',
      'Mark their own attendance — which is how the app knows who is on duty'
    ],
    img: 'shots/members',
    alt: 'Society members and approvals'
  },
  {
    variant: 'stf',
    kicker: 'Household staff',
    kickerTone: 'accent',
    title: 'Maids, cooks and drivers',
    items: [
      'A monthly pass instead of a signature at every visit',
      'Registered by the household, approved by the secretary',
      'One scan at the gate records entry, exit and attendance',
      'Nothing for them to install, and no app to learn'
    ],
    img: 'shots/search',
    alt: 'Staff and member lookup'
  }
];

export const amenityChips = ['Clubhouse', 'Garden', 'Gymnasium', 'Swimming pool'];

export const everyday = [
  {
    title: 'Parking, mapped',
    body: 'The slot map, occupied against free, your allotted slot, and a lookup for whose car that is.'
  },
  {
    title: 'Complaints with a timeline',
    body: 'Raised, seen, in progress, closed — so nobody has to ask what happened to it.'
  },
  {
    title: 'Security status',
    body: 'At Home, Away or Do Not Disturb, for a fixed duration, with a standing instruction for the guard. Auto-reverts when the time is up.'
  },
  {
    title: 'Nearby services',
    body: 'Local pharmacies, clinics and shops we onboard, surfaced to the societies near them. Tap to call.'
  }
];

export const roleColumns = ['Office', 'The books', 'Operations', 'Gate & staff', 'Appoint others'];

// `true` renders in the sage "granted" tone, `false` in the muted "no" tone.
export const roleRows = [
  ['Secretary', ['Full', true], ['Full', true], ['Full', true], ['Only office that can', true]],
  ['Chairman', ['Oversight', true], ['Oversight', true], ['Oversight', true], ['No', false]],
  ['Treasurer', ['Maintenance, expenses, funds', true], ['No', false], ['No', false], ['No', false]],
  [
    'Committee member',
    ['No', false],
    ['Amenities, parking, complaints, events', true],
    ['Gate staff', true],
    ['No', false]
  ]
];

export const railScreens = [
  {
    img: 'shots/home',
    title: 'Home',
    body: 'Urgent notices, the committee tools, and everything a resident reaches for.'
  },
  {
    img: 'shots/maintenance',
    title: 'Maintenance Hub',
    body: 'What is owed this month, who has paid, and what has been collected.'
  },
  {
    img: 'shots/finance',
    title: 'Payment History',
    body: 'Every month against its receipt, paid and unpaid side by side.'
  },
  {
    img: 'shots/members',
    title: 'Society Members',
    body: 'Neighbours by wing and flat, with pending approvals up top.'
  },
  {
    img: 'shots/search',
    title: 'Member Lookup',
    body: 'Find anyone by name or unit without leaving the directory.'
  }
];

export const features = [
  { tag: 'Gate', title: 'Visitor gate passes', body: 'Generate a QR for a guest, share it, the guard scans it. Entry and exit logged, passes expire.' },
  { tag: 'Gate', title: 'Household staff passes', body: 'Register your maid, cook, milkman or driver. The secretary approves and issues a monthly pass.' },
  { tag: 'Gate', title: 'Staff attendance', body: 'The daily scan of a staff pass doubles as the attendance record the family can see.' },
  { tag: 'Safety', title: 'SOS panic button', body: 'Raises an alert to the gate, on the screen of the guard who is on duty.' },
  { tag: 'Safety', title: 'Security status', body: 'At Home, Away or Do Not Disturb, optionally for a fixed duration, with a standing instruction for the guard.' },
  { tag: 'Money', title: 'Maintenance dues', body: 'What is owed, due dates, payment history and downloadable receipts.' },
  { tag: 'Money', title: 'UPI collection', body: 'The society sets its UPI details; the treasurer verifies receipt. No card or netbanking payment in the app.' },
  { tag: 'Money', title: 'Community funds', body: 'Contribute to fund drives and see the contributor wall.' },
  { tag: 'Money', title: 'Expenses', body: 'The treasurer records what the society spent, against the balance residents can see.' },
  { tag: 'Community', title: 'Amenity booking', body: 'Clubhouse, pool and gym, with conflict detection and approval where required.' },
  { tag: 'Community', title: 'Complaints', body: 'Raised and tracked through a status timeline.' },
  { tag: 'Community', title: 'Notices & events', body: 'Announcements, event RSVPs and paid events.' },
  { tag: 'Community', title: 'Member directory', body: 'Neighbours by wing and flat, with committee offices marked.' },
  { tag: 'Community', title: 'Nearby services', body: 'Pharmacies, clinics and shops near the society. Tap to call.' },
  { tag: 'Admin', title: 'Parking map', body: 'Occupied against free slots, your allotment, and a vehicle-number lookup.' },
  { tag: 'Admin', title: 'Profile approvals', body: 'Edits go to the secretary for approval, including tenant to owner conversion.' }
];

export const onboarding = [
  {
    n: '01',
    title: 'We register the society',
    body: 'A salesperson takes your details and creates the society in the admin portal.'
  },
  {
    n: '02',
    title: 'Wings, floors and flats',
    body: 'Your building structure is built out once, so every flat number already exists.'
  },
  {
    n: '03',
    title: 'Your first secretary',
    body: 'We appoint the secretary, who then appoints the chairman, treasurer and members.'
  },
  {
    n: '04',
    title: 'Residents join with a code',
    body: 'They register against a 6-digit society code, pick wing, floor and flat, and the secretary approves.'
  }
];

export const faqs = [
  {
    q: 'What do residents have to install?',
    a: 'One mobile app, Android or mobile web. Guards use the same app with a guard login. Visitors install nothing — their pass arrives as a QR on WhatsApp.'
  },
  {
    q: 'How is a resident verified?',
    a: 'They register against your society’s 6-digit code, pick their wing, floor and flat, and verify their mobile number by OTP over WhatsApp. Your secretary then approves them.'
  },
  {
    q: 'Can residents pay maintenance inside the app?',
    a: 'Collection is by UPI to the society’s own details, with the treasurer confirming receipt. There is no card or netbanking payment inside the app.'
  },
  {
    q: 'Who can see the society’s money?',
    a: 'The treasurer keeps the books, the chairman and secretary have oversight, and committee members handling operations do not get access to them at all.'
  },
  {
    q: 'What happens to the paper visitor register?',
    a: 'The scan at the gate becomes the record. Every entry and exit is timestamped against a pass that a named resident issued.'
  },
  {
    q: 'How long does setup take?',
    a: 'Our team registers the society, builds out the wings, floors and flats, and appoints your first secretary. Residents join with the code from that point on.'
  }
];

export const formFields = [
  { placeholder: 'Society name', required: true },
  { placeholder: 'City', required: true },
  { placeholder: 'Number of flats', required: false },
  { placeholder: 'Your name and mobile number', required: true }
];
