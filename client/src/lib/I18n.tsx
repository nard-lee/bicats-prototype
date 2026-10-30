import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "tl";

// English is the source of truth. Tagalog must have the same keys (TypeScript checks this).
const en = {
  // header / nav / footer
  republic: "Republic of the Philippines",
  city: "City of Baguio",
  navHome: "Home",
  navFile: "File a Complaint",
  navTrack: "Track Complaint",
  navStaff: "Staff Dashboard",
  adminPanel: "Staff Panel",
  adminOverview: "Overview",
  adminComplaints: "Complaints",
  adminNotices: "Notices",
  adminAccounts: "Staff Accounts",
  adminAudit: "Audit Logs",
  roleSecretary: "Secretary",
  roleLupon: "Lupon Member",
  themeLight: "Switch to light mode",
  themeDark: "Switch to dark mode",
  auditSubtitle: "A record of who did what and when.",
  auditEmpty: "No activity recorded yet.",
  auditWhen: "When",
  auditWho: "Who",
  auditAction: "Action",
  auditTarget: "Target",
  auditDetails: "Details",
  auditIp: "IP",
  auditSearchPlaceholder: "Search details or staff…",
  auditAllTypes: "All activity",
  ovSubtitle: "A snapshot of complaints, mediation and notices.",
  ovStatTotal: "Total",
  ovStatOpen: "Open",
  ovStatNotices: "Notices",
  ovRecent: "Recent Complaints",
  ovViewAll: "View all",
  ovUpcoming: "Upcoming Mediation",
  ovByStatus: "By Status",
  ovNoComplaints: "No complaints filed yet.",
  ovNoMediation: "No mediation scheduled.",
  adminAnalytics: "Analytics & Reports",
  adminHearings: "Mediation",
  anTypes: "Most Common Complaints",
  anTrends: "Case Filing Trends",
  anHotspots: "Top Affected Areas (Purok)",
  anSubtitle:
    "A plain-language snapshot of how many complaints come in, what they are about, and where they come from.",
  anTotal: "Total Complaints",
  anThisMonth: "Filed This Month",
  anTopType: "Most Reported Issue",
  anTopPurok: "Most Affected Purok",
  anNoData: "No data to show yet.",
  anBasedOn: "Based on all complaints on record.",
  anTypesDesc:
    "Every complaint is tagged to a category. A bigger slice means that issue is reported more often.",
  anTrendsDesc:
    "How many complaints were filed each month. A rising line means more reports over time.",
  anHotspotsDesc:
    "The 10 puroks with the most complaints. A taller bar means more cases from that area.",
  anStatusTitle: "Case Status Breakdown",
  anAllTime: "All time",
  anScope: "Scope",
  anExportCsv: "Export CSV",
  anPrint: "Print",
  anGroupMonths: "Single month",
  anGroupRanges: "Range",
  anGroupYears: "Year",
  anLast: "Last",
  anMonthsUnit: "months",
  anYearsUnit: "years",
  anThisYear: "This year",
  anStatusDesc:
    "Where cases stand today. Pending, Summoned, Mediation and Conciliation are still open; the rest are closed.",
  anDigest: "Monthly Digest",
  anDigestDesc: "The numbers the council needs for the chosen month, in one view.",
  anDigestFiled: "Filed",
  anDigestFailed:
    "The report couldn't be loaded. Check the connection and try again.",
  anRetry: "Try again",
  anDigestResolved: "Resolved",
  anDigestAvgTime: "Avg. Resolution Time",
  anDigestSessions: "Sessions Held",
  anDigestNoShow: "No-Shows",
  anDigestOpen: "Open Now",
  anDigestOverdue: "Overdue",
  anDigestByType: "Filed by type",
  anDigestDays: "days",
  adminCreate: "Create Account",
  adminSection: "Administration",
  viewSite: "View public site",
  logout: "Log out",
  login: "Login",
  register: "Register",
  contact: "Contact",
  officeHours: "Office Hours",
  monFri: "Mon–Fri 8:00 AM – 5:00 PM",
  luponHearings: "Lupon mediation every Saturday, 9:00 AM",
  tagline: "Honest service, for everyone.",

  // home
  eyebrow: "Barangay Justice System · Honest Service",
  heroTitle: "Online Complaint Desk of Barangay Kabayanihan",
  heroText:
    "Report your concerns to your barangay without having to line up. Every submission is recorded in the barangay blotter and endorsed to the Lupong Tagapamayapa when mediation is required.",
  btnFile: "File a Complaint",
  btnTrack: "Track My Complaint",
  hallAddress: "Address",
  hallHotline: "Hotline",
  refHint: "You will be given a reference like 26-10-0042 to follow the case.",
  doorStart: "Start here",
  doorFileHint:
    "The form takes a few minutes. Attach photos or documents if you have them.",
  officialsLead:
    "The Punong Barangay and the Barangay Secretary sign the notices, summonses and settlements this desk issues.",
  luponTitle: "Lupon Tagapamayapa members",
  luponNote:
    "When a case reaches conciliation, the Pangkat that hears it is picked from these members.",
  noticesLatest: "newest first",
  hallHours:
    "Monday–Friday, 8:00 AM – 5:00 PM. Barangay Tanod desk open 24/7 for emergencies",
  howTitle: "How a complaint works",
  step1Title: "Submit the complaint",
  step1Text:
    "Fill out the complaint form with the details of the incident and the party complained of.",
  step2Title: "Blotter entry",
  step2Text:
    "The Barangay Secretary records the entry and issues your reference number.",
  step3Title: "Summons and mediation",
  step3Text:
    "Both parties are summoned for mediation before the Punong Barangay or the Lupon.",
  step4Title: "Settlement or endorsement",
  step4Text:
    "Settled through amicable settlement, or issued a Certificate to File Action.",
  noticesTitle: "Notice Board",
  noticesEmpty: "No announcements at the moment.",
  n1Date: "10 Aug 2026",
  n1Title: "Lupon mediation schedule moved to Saturdays",
  n1Text:
    "Mediation sessions are now held every Saturday, 9:00 AM at the Barangay Session Hall.",
  n2Date: "04 Aug 2026",
  n2Title: "Segregated garbage collection",
  n2Text:
    "Biodegradable waste is collected Mondays and Thursdays. Violators will be issued a citation.",
  n3Date: "28 Jul 2026",
  n3Title: "Curfew for minors reinstated",
  n3Text:
    "Ordinance No. 2026-11 sets curfew from 10:00 PM to 4:00 AM for residents below 18 years old.",
  typesTitle: "Accepted complaints",
  typesNote:
    "Note: Criminal cases punishable by imprisonment exceeding one year, or cases where parties reside in different cities/municipalities, are generally outside the authority of the Lupong Tagapamayapa and are endorsed to the proper agency.",

  // home · about
  aboutTitle: "About this desk",
  aboutText:
    "The barangay is where a dispute between neighbours is settled first. This online desk is the intake channel for that process: it records your complaint, issues a reference number, and keeps you informed of the schedule instead of leaving you to go back to the hall to ask.",
  about1Title: "What it handles",
  about1Text:
    "Complaints between residents of the barangay — noise, sanitation, boundary disputes, altercations, threats, unpaid obligations, ordinance violations. The Secretary records the blotter entry and the case is set for mediation.",
  about2Title: "Who hears it",
  about2Text:
    "Mediation is conducted by the Punong Barangay. If mediation does not settle the case, conciliation is held before the Pangkat, a panel of three members taken from the Lupong Tagapamayapa.",
  about3Title: "What it cannot take up",
  about3Text:
    "Criminal cases punishable by imprisonment of more than one year, disputes where the parties live in different cities or municipalities, and complaints by one barangay against a private person. These are endorsed to the proper agency.",

  // home · faq
  faqTitle: "Frequently asked questions",
  faq1Q: "Do I have to go to the barangay hall to file?",
  faq1A:
    "No. File through this desk and the entry is recorded the same way as a walk-in blotter entry. You will be called for mediation if the complaint proceeds.",
  faq2Q: "What should I prepare before filing?",
  faq2A:
    "Your own contact number, the name and address of the party complained of, when and where the incident happened, and any evidence such as photos or documents. The contact number is also what you will use to track the case later.",
  faq3Q: "How do I follow my case?",
  faq3A:
    "Open the track page and enter your reference number together with the contact number you filed with. Both have to match, so nobody else can read your case with the number alone.",
  faq4Q: "What happens after I file?",
  faq4A:
    "The Secretary records the complaint and issues your reference number. The party complained of is then summoned, and mediation is set before the Punong Barangay. You are notified at each of these steps.",
  faq5Q: "Is there a fee?",
  faq5A:
    "Filing a complaint is free. Not appearing at scheduled hearings without valid cause, however, is dealt with under the Barangay Justice System Act.",
  faq6Q: "What if we settle, or if we do not?",
  faq6A:
    "A settlement is written, signed, and becomes enforceable after ten days if no one appeals. If no settlement is reached, the barangay issues a Certificate to File Action so the case can be brought to the city or municipal court.",

  // complaint types (used on Home and in the form)
  type1: "Noise disturbance",
  type2: "Garbage & sanitation",
  type3: "Stray animals",
  type4: "Boundary or property dispute",
  type5: "Physical injury / altercation",
  type6: "Verbal abuse or threats",
  type7: "Theft / missing property",
  type8: "Unpaid debt",
  type9: "VAWC referral (RA 9262)",
  type10: "Illegal construction",
  type11: "Curfew / ordinance violation",
  type12: "Others",

  // complaint form
  fcTitle: "Complaint Form",
  fcIntro:
    "Fill in all required information. Incorrect information may be grounds for dismissal of the complaint.",
  s1Title: "Complainant details",
  s1Sub: "Person filing the complaint",
  s2Title: "Respondent",
  s2Sub: "Person or party complained of",
  s3Title: "Incident details",
  s3Sub: "What happened",
  fullName: "Full name",
  age: "Age",
  purok: "Purok / Sitio",
  selectPurok: "Select purok",
  contactNumber: "Contact number",
  address: "Complete address",
  emailHint: "We'll send updates here too, if you add one.",
  respName: "Name of respondent",
  phRespName: "Name or 'Unknown'",
  respAddress: "Respondent's purok / address",
  respAddressOptional: "Respondent's purok / address (optional)",
  relationship: "Relationship to you",
  relationshipOptional: "Relationship to you (optional)",
  relHint: "For example: neighbor, relative, unrelated.",
  phRel: "Neighbor",
  complaintType: "Type of complaint",
  selectType: "Select type",
  otherType: "Describe the complaint type",
  otherTypeHint: "You picked Others. Tell us briefly what this complaint is about.",
  phOtherType: "For example: videoke noise after 10 PM",
  incidentAt: "Date and time of incident",
  place: "Place of incident",
  phPlace: "For example: Purok 2 covered court",
  narrative: "Statement",
  narrHint:
    "Describe what happened in your own words. Include any witnesses.",
  phNarr: "On the night of...",
  evidence: "Evidence",
  evOpen: "Open",
  asFiled: "As filed",
  historyBy: "updated by",
  evHint: "Photos, videos, receipts, or documents. Up to 5 files, 10 MB each.",
  dropFiles: "Drag files here or browse",
  clearFiles: "Clear files",
  consentA: "I understand that this complaint must first go through ",
  consentC:
    " (mediation and conciliation) before it can be brought to court, and that everything I have stated is true to the best of my knowledge.",
  submitComplaint: "Submit complaint",
  submitting: "Submitting...",
  refNote: "A reference number will be issued upon submission.",
  errComplaint: "Your complaint could not be submitted. Please try again.",
  errUnavailable: "We couldn't reach the server. Check your connection and try again.",

  // eligibility screening at intake
  eligTitle: "Check if the barangay can handle your complaint",
  eligIntro:
    "The barangay can only act on disputes allowed under the Katarungang Pambarangay. Answer these questions first.",
  eligResidencyQ: "Where does the respondent live?",
  eligResSameBarangay: "Same barangay",
  eligResSameCity: "Same city, different barangay",
  eligResDifferentCity: "Different city or municipality",
  eligAdjoiningQ:
    "Do the two barangays share a boundary, and do both of you agree to settle the case at the barangay?",
  eligGovernmentQ:
    "Is the complaint against the government, or against a public officer or employee because of their official work?",
  eligOffenseQ:
    "Is this a VAWC case or a serious criminal offense that may be punished by more than one year in prison?",
  eligPropertyQ:
    "Does the dispute involve land or property located in another city or municipality?",
  eligPropertyAgreementQ:
    "Do both of you agree to settle the property dispute at the barangay?",
  eligYes: "Yes",
  eligNo: "No",
  eligUnsure: "Not sure",
  eligNa: "Not applicable",
  eligEligible: "This looks covered by the barangay. You can continue below.",
  eligNeedsReview:
    "Some answers need staff review. You can still file, and the barangay will check eligibility.",
  eligOutside:
    "This complaint appears to be outside the barangay's authority. Please file it with the proper court or agency.",
  eligSuccessReview:
    "Some screening answers need staff review. The barangay will contact you if the case must be referred.",

  // file complaint success
  fcSuccessTitle: "Complaint submitted",
  fcSuccessText:
    "Thank you. Keep your reference number safe — you'll need it to track your complaint.",
  fcSuccessNote:
    "Write it down or take a screenshot. For your privacy, keep it to yourself.",
  fcViewComplaint: "View complaint",
  fcFileAnother: "File another complaint",

  // login
  loginTitle: "Barangay Staff Sign In",
  staffOnly: "For officials and staff only",
  loginIdentifier: "Email, username, or phone number",
  username: "Username",
  password: "Password",
  remember: "Remember this device",
  signIn: "Sign in",
  signingIn: "Signing in...",
  forgot: "Forgot your password? See the Barangay Secretary at the hall.",
  noAccount: "No account yet?",
  registeredNote:
    "Registration submitted. You can sign in once the Punong Barangay approves your account.",
  backPublic: "Back to public site",
  errInvalid: "Wrong username or password.",
  errPending:
    "Your account isn't activated yet. Wait for the Punong Barangay's approval.",
  errServer: "Server problem. Please try again.",

  // register
  regTitle: "Barangay Staff Registration",
  regSub: "For officials and staff only — approved by the Punong Barangay",
  position: "Position",
  email: "Email address",
  emailOptional: "Email address (optional)",
  confirm: "Confirm",
  agree:
    "I agree to the system's terms and understand that my account will be reviewed by the Punong Barangay before it is activated.",
  registerBtn: "Register",
  registering: "Submitting...",
  haveAccount: "Already have an account?",
  signInHere: "Sign in here",
  errShort: "Password must be at least 8 characters.",
  errMismatch: "Password and confirmation don't match.",
  errTaken: "That username or email is already in use.",
  errFailed: "Registration failed. Please try again.",

  // admin: create account
  phone: "Phone number",
  role: "Role",
  roleAdmin: "Admin",
  roleStaff: "Staff",
  createAccount: "Create account",
  creating: "Creating...",
  accountCreated: "Account created.",

  // admin: my profile
  myProfile: "My Profile",
  profileSub: "Update your own account details and password.",
  saveChanges: "Save changes",
  saving: "Saving...",
  profileSaved: "Profile updated.",
  newPassword: "New password",
  newPasswordHint: "Leave blank to keep your current password.",
  accountInfo: "Account details",
  changePassword: "Change password",
  memberSince: "Member since",
  reviewFields: "Please review the highlighted fields below.",

  // admin: barangay settings
  adminSettings: "Barangay Settings",
  settingsSub: "Official barangay details used on printed documents and notices.",
  barangayProfile: "Barangay profile",
  settingsLetterhead:
    "This info appears on the letterhead and signatories of printable case documents.",
  settingsSaved: "Settings saved.",
  settingsViewOnly: "Only administrators can change these settings.",
  barangayName: "Barangay name",
  cityLabel: "City / Municipality",
  province: "Province",
  punongBarangay: "Punong Barangay",
  secretaryName: "Barangay Secretary",
  settingsIdentity: "Barangay identity",
  settingsContact: "Contact and office",
  settingsSignatories: "Signatories",
  settingsSignatoriesDesc:
    "The Punong Barangay chairs the Lupong Tagapamayapa by law, so one official carries both titles. The Pangkat chairman is elected per case and is recorded on the case page.",
  settingsBranding: "Logo and branding",
  settingsDeadlines: "Katarungang Pambarangay deadlines",
  settingsNavDeadlines: "Deadlines",
  settingsNotifications: "Complainant notifications",
  settingsNavNotifications: "Notifications",
  settingsSections: "Settings sections",
  settingsPreview: "Letterhead preview",
  settingsChannels: "Message channels",
  logoLabel: "Barangay logo",
  logoHint: "PNG, JPG, or WEBP up to 2 MB. Shown in the sidebar and printed letterhead.",
  signatureLabel: "Signature",
  uploadImage: "Upload image",
  replaceImage: "Replace",
  removeImage: "Remove",
  hotlineLabel: "Office hotline",
  tanodLabel: "Tanod hotline",
  punongTitleLabel: "Punong Barangay title",
  secretaryTitleLabel: "Secretary title",
  settingsPuroks: "Puroks",
  puroksHint:
    "These are the purok choices offered by the public complaint form.",
  puroksLabel: "Purok list",
  noPuroks: "No puroks yet. Add the first one below.",
  addPurok: "Add purok",
  removePurok: "Remove purok",
  puroksNote:
    "Complaints store the purok name, so renaming an entry only affects new filings.",
  settingsOfficials: "Barangay officials",
  officialsHint: "The people the public site lists as serving in the council.",
  officialsLabel: "Published roster",
  noOfficials: "No officials listed yet. Add the first one below.",
  addOfficial: "Add official",
  removeOfficial: "Remove official",
  officialsNote:
    "Shown in this order. Leave the list empty to hide the roster from the site.",
  officeLineLabel: "Office line on documents",
  officeLineHint:
    "Printed under the barangay name on summons, notices, and settlements.",
  deadlineReceivedLabel: "Days to summon the respondent",
  deadlineSummonedLabel: "Days to hold mediation",
  deadlineMediationLabel: "Days to conclude mediation",
  deadlineConciliationLabel: "Days to conclude conciliation",
  riskWindowLabel: "Due-soon warning window (days)",
  daysSuffix: "days",
  notifyIntakeEvent: "Complaint received (receipt)",
  notifyStatusEvent: "Case status updates",
  notifyMediationEvent: "Mediation scheduled or moved",
  notifyCancelledEvent: "Mediation cancelled",
  channelSms: "SMS",
  channelEmail: "Email",
  smsConfigured: "SMS is configured and enabled.",
  smsMissing: "SMS is not configured (UniSMS keys are missing).",
  emailConfigured: "Email is configured and enabled.",
  emailMissing: "Email is not configured (Brevo key is missing).",
  lastUpdated: "Last updated",
  unsavedChanges: "You have unsaved changes.",
  resetChanges: "Reset",
  settingsReset: "Changes reset.",
  imageUploaded: "Image uploaded.",
  notificationsHint:
    "Choose which messages are sent to complainants automatically. Channels without provider keys are skipped.",
  settingsScheduling: "Session scheduling",
  settingsSchedulingHint:
    "Defaults and guardrails applied when staff book mediation, conciliation, or arbitration sessions.",
  defaultVenueLabel: "Default session venue",
  defaultVenuePlaceholder: "e.g. Barangay Hall Session Room",
  sessionLengthLabel: "Session length (minutes)",
  sessionLengthHint:
    "Used to check for overlapping bookings and office-hour limits.",
  hearingGraceLabel: "Missed-session grace period (hours)",
  hearingGraceHint:
    "How long after the start time before a session is flagged as missed.",
  enforceOfficeHoursLabel: "Enforce office hours when scheduling",
  enforceOfficeHoursHint:
    "Reject session times that fall outside the opening and closing hours below.",
  officeOpensLabel: "Office opens",
  officeClosesLabel: "Office closes",
  workingDaysLabel: "Count deadlines in working days",
  workingDaysHint:
    "Skip weekends and the listed holidays when computing the next KP deadline.",
  holidaysLabel: "Holidays",
  noHolidays: "No holidays added.",
  addHoliday: "Add holiday",
  removeHoliday: "Remove",
  holidaysHint: "Only used when deadlines are counted in working days.",
  reminderLeadLabel: "Pre-session reminder lead time (hours)",
  reminderLeadHint:
    "Staff and complainants are reminded when a session is this close. The scan runs every 30 minutes.",

  // track
  trackTitle: "Track My Complaint",
  trackIntro:
    "Enter your reference number and the contact number you used when filing.",
  refNumber: "Reference number",
  phoneUsed: "Contact number used",
  trackBtn: "Track",
  tracking: "Searching...",
  trackHelp: "Lost your reference number? Visit the barangay hall.",
  trackRecent: "Recent references",
  trackClearRecent: "Clear",
  downloadRef: "Download reference",
  download: "Download",
  downloadTrackAt: "Track your complaint at:",
  downloadKeep:
    "Keep this reference number and the contact number you used when filing.",
  errNotFound: "No matching complaint found.",
  errTooMany: "Too many attempts. Please try again later.",
  errTrack: "Something went wrong. Please try again.",
  currentStatus: "Current status",
  history: "History",
  hearing: "Mediation",
  st_received: "Pending",
  st_summoned: "Respondent summoned",
  st_mediation: "Under mediation",
  st_conciliation: "Under conciliation (Lupon)",
  st_settled: "Settled",
  st_certified: "Certified to file action",
  st_dismissed: "Dismissed",
  dueDate: "Next deadline",
  overdue: "Overdue",
  overdueOnly: "Overdue only",
  openOnly: "Open cases only",
  dueSoon: "Due soon",
  dueSoonOnly: "Due soon only",
  anyDue: "Any due date",
  noDeadline: "No pending deadline",
  caseClosed: "Case closed",
  needsAttention: "Needs Attention",
  allClear: "All caught up. No cases need attention right now.",
  notifications: "Notifications",
  noNotifications: "You're all caught up.",
  markAllRead: "Mark all read",
  notifMarkFailed: "Couldn't update your notifications.",
  notifLoadFailed:
    "Couldn't load your notifications. Close this and tap the bell again.",
  notifNew: "New",
  trackPhase: "Where your case is now",
  ph_received:
    "Your complaint is on record in the barangay blotter. The Punong Barangay will summon the respondent within 3 days.",
  ph_summoned:
    "The respondent has been summoned. A mediation session will be called within 7–15 days of filing.",
  ph_mediation:
    "Mediation is ongoing before the Punong Barangay. If both parties agree, the case is closed with an amicable settlement.",
  ph_conciliation:
    "The case was endorsed to the Lupong Tagapamayapa. The Pangkat has 15 days to help the parties reach a settlement.",
  ph_settled:
    "The case was settled. Both parties reached an amicable settlement.",
  ph_certified:
    "No settlement was reached, so a Certificate to File Action was issued. The complainant may now bring the case to court.",
  ph_dismissed: "The case was dismissed by the barangay.",

  // case update flow (advance stage / add note)
  updAdvance: "Advance stage",
  updAddNote: "Add note",
  updStageTitle: "Record the next step",
  updStageDesc:
    "Choose what actually happened. Only the steps allowed for the current stage are shown.",
  updCurrentStage: "Current stage",
  updNextSession: "Schedule next session",
  updOptional: "optional",
  updNextSessionHint: "Leave empty to keep the schedule unchanged.",
  updClosingNote:
    "Closing the case cancels its scheduled sessions and clears its deadline.",
  updPublicNote: "Public note (visible in case history)",
  updPublicNotePh:
    "e.g., Parties reached an amicable settlement regarding the boundary dispute.",
  updInternalNote: "Internal note (staff only)",
  updInternalNotePh:
    "e.g., Respondent failed to appear during the first mediation.",
  updNoteTitle: "Add note",
  updNoteDesc:
    "Adds a note to the case history without changing the stage or the deadline.",
  updNeedNote: "Write at least one note before saving.",
  updSaved: "Case updated.",
  updSaveFailed: "Failed to update the case.",
  updCancel: "Cancel",
  actTo_summoned: "Issue summons",
  actTo_summonedDesc:
    "The barangay summons the respondent to appear at mediation.",
  actTo_mediation: "Begin mediation",
  actTo_mediationDesc: "The case enters mediation before the lupon.",
  actTo_settled: "Record settlement",
  actTo_settledDesc:
    "The parties reached an amicable settlement. The case closes.",
  actTo_conciliation: "Escalate to conciliation",
  actTo_conciliationDesc:
    "Mediation did not settle the case. It moves to the Lupon for conciliation.",
  actTo_certified: "Issue certificate to file action",
  actTo_certifiedDesc:
    "Conciliation failed. The parties receive a certificate to bring the case to court.",
  actTo_dismissed: "Dismiss case",
  actTo_dismissedDesc: "Close the case without a settlement.",

  // privacy policy
  privacyTitle: "Privacy Policy",
  privacyUpdated: "Last updated: October 23, 2026",
  privacyIntro:
    "This policy explains what personal information the Online Complaint Desk collects, why we collect it, and the choices you have. It follows Republic Act No. 10173, the Data Privacy Act of 2012.",
  privacyWhoTitle: "Who runs this site",
  privacyWhoText:
    "This complaint desk is operated by the barangay named in the header, through the Office of the Punong Barangay and the Lupong Tagapamayapa.",
  privacyCollectTitle: "Information we collect",
  privacyCollectText:
    "When you file a complaint, we collect your name, age, purok or address, contact number, optional email address, the details of the incident, information about the respondent, and any photos, documents, or videos you attach. When you track a complaint, we need the reference number and the contact number you used. Staff accounts include a name, username, email address, phone number, and role.",
  privacyUseTitle: "How we use it",
  privacyUseText:
    "We use this information to record and process your complaint, contact you about summonses, mediation, and the status of your case, prepare official barangay documents, and keep an audit trail for accountability. We do not sell personal information.",
  privacyShareTitle: "Who can see it",
  privacyShareText:
    "Only authorized barangay staff can open complaint records. As part of the Katarungang Pambarangay process, the respondent receives a summons that includes the details needed to answer the complaint. Our hosting, database, and messaging providers process data on our behalf so the service can run.",
  privacyCookiesTitle: "Cookies and advertising",
  privacyCookiesText:
    "Staff sign-in uses essential cookies that keep the session secure; they are not used for advertising. Public pages may show ads served by Google AdSense. Google and its partners may use cookies to show ads based on earlier visits to this or other sites. You can turn off personalized advertising in Google Ads Settings (adssettings.google.com) or learn about opting out at aboutads.info. Blocking cookies does not affect filing a complaint, but staff cannot sign in without them.",
  privacyRetentionTitle: "How long we keep it",
  privacyRetentionText:
    "Complaint records are kept according to barangay records rules and the deadlines of the Katarungang Pambarangay. Sign-in credentials are stored as hashes and access is limited by role. No system is completely secure, but we take reasonable steps to protect what you send us.",
  privacyRightsTitle: "Your rights",
  privacyRightsText:
    "Under the Data Privacy Act you can ask to be informed, to access, correct, or object to the processing of your personal information, and to have it erased or blocked where the law allows. You may also file a complaint with the National Privacy Commission (privacy.gov.ph). To make a request, contact the barangay using the details in the footer.",
  privacyChangesTitle: "Changes to this policy",
  privacyChangesText:
    "We may update this policy when the service or the law changes. The date at the top shows the latest revision.",

  // complaints list
  clSubtitle:
    "Every complaint on record. Filter, search, and open a case to work on it.",
  clFiled: "Filed",
  clStatus: "Status",
  clAllStatuses: "All statuses",
  clAllTypes: "All types",
  clReload: "Reload",
  clClear: "Clear",
  clFilters: "Filters",
  clSelected: "selected",
  clApplyStatus: "Apply status",
  clApplying: "Applying...",
  clNoMatches: "No complaints match your filters.",
  clNoComplaints: "No complaints yet.",
  clSearchPlaceholder: "Search complaints...",
  clRecentSearches: "Recent searches",
  clSearching: "Searching...",
  clNoSearchMatches: "No matches found.",
  clSelectAll: "Select all",
  clSelectRow: "Select",

  // complaint view/detail page
  complaintDetails: "Complaint Details",
  backToList: "Back to List",
  prevCase: "Previous case",
  nextCase: "Next case",
  partiesInvolved: "Parties Involved",
  complainant: "Complainant",
  respondent: "Respondent",
  assignedTo: "Assigned To",
  complaintInfo: "Complaint Information",
  filedDate: "Filed Date",
  description: "Description",
  statusHistory: "Status History",
  historyPage: "Page {page} of {pages}",
  historyEvents: "{total} events",
  prevPage: "Prev",
  nextPage: "Next",
  notes: "Notes",

  // eligibility review (staff)
  eligStaffTitle: "KP Eligibility",
  eligStaffDesc: "Intake screening and staff decision.",
  eligNotScreened: "Not screened",
  eligStatusEligible: "Eligible",
  eligStatusNeedsReview: "Needs review",
  eligStatusOutside: "Outside KP",
  eligStatusRejected: "Rejected",
  eligReview: "Review eligibility",
  eligReviewTitle: "Review KP eligibility",
  eligReviewDesc:
    "Confirm whether this complaint falls under the barangay's authority.",
  eligClosed: "This case is closed. Eligibility can no longer be changed.",
  eligReviewStatus: "Decision",
  eligNotes: "Review notes",
  eligNotesHint:
    "Explain the decision, especially if you are overriding the intake result.",
  eligSaveReview: "Save review",
  eligSaving: "Saving...",
  eligSaved: "Eligibility updated.",
  eligSaveFailed: "Could not update eligibility.",
  eligReviewed: "Reviewed",
  eligIntakeAnswers: "Intake answers",
  eligAnsResidency: "Respondent's residence",
  eligAnsAdjoining: "Adjoining barangays agreed",
  eligAnsGovernment: "Government / public officer",
  eligAnsOffense: "VAWC / serious offense",
  eligAnsProperty: "Property in another city",
  eligAnsPropertyAgreement: "Property settlement agreed",
  eligNoAnswers: "No intake answers were recorded for this case.",
  eligPendingFlag: "Pending eligibility review",
  eligUnscreenedFlag: "Awaiting eligibility screening",
  eligDismissWarning:
    "Saving this decision dismisses the case, clears its deadline, and notifies the complainant. Only do this when the complaint is clearly outside the barangay's authority.",
  eligSavedDismissed: "Eligibility updated. The case was dismissed.",
  eligReason: "Reason for rejection",
  eligReasonHint:
    "This is shown to the complainant and recorded in the case history.",
  eligReasonPlaceholder: "e.g., The complaint was withdrawn by the complainant.",
  eligRejectWarning:
    "Saving this decision dismisses the case, clears its deadline, and notifies the complainant with this reason.",
  eligRejectionReason: "Rejection reason",

  // proof of service
  serviceTitle: "Proof of service",
  serviceDesc: "Record how and when the summons was served.",
  serviceRecord: "Record service",
  serviceHistoryLabel: "Proof of service",
  serviceEmpty: "No proof of service recorded yet.",
  serviceClosed: "This case is closed. Proof of service can no longer be recorded.",
  serviceModalTitle: "Record proof of service",
  serviceModalDesc: "Log the result of serving the summons.",
  serviceServer: "Served by",
  serviceServerPlaceholder: "Name of the server / barangay staff",
  serviceDate: "Date and time served",
  serviceDatePlaceholder: "Select date & time",
  serviceResult: "Result",
  serviceResultPlaceholder: "Select the result",
  serviceReceived: "Received",
  serviceRefused: "Refused",
  serviceNotFound: "Not found",
  serviceDateTime: "Served",
  serviceNotes: "Notes (optional)",
  serviceNotesPlaceholder:
    "e.g., Left the summons with the respondent's spouse.",
  serviceSave: "Save record",
  serviceSaving: "Saving...",
  serviceSaved: "Proof of service recorded.",
  serviceSavedDeadline:
    "Proof of service recorded. The mediation deadline now starts from the service date.",
  serviceSaveFailed: "Could not record proof of service.",
  serviceDeadlineHint:
    "A received summons restarts the mediation deadline from the date served.",
  serviceLoggedBy: "Recorded by",

  // documents
  documents: "Case Documents",
  documentsDesc:
    "Generate the official Katarungang Pambarangay paperwork for this case.",
  printDoc: "Print / Save as PDF",
  backToCase: "Back to case",
  doc_summons: "Summons",
  doc_notice: "Notice of Mediation",
  doc_settlement: "Amicable Settlement",
  doc_cfa: "Certificate to File Action",
  lblPunongBarangay: "Punong Barangay",
  lblPangkatChairman: "Chairman, Pangkat ng Tagapagkasundo",
  lblSecretary: "Barangay Secretary",
  lblWitnessedBy: "Signed in the presence of",
  cfaCertifiedBy: "Certified by",
  cfaAttestedBy: "Attested by",
  lblComplainant: "Complainant",
  lblRespondent: "Respondent",
  lblAttestedBy: "Attested by",

  // Pangkat ng Tagapagkasundo (RA 7160 §412)
  pangkatTitle: "Pangkat ng Tagapagkasundo",
  pangkatDesc: "The panel that conciliates when mediation does not settle the case.",
  pangkatEmpty: "No Pangkat has been constituted for this case yet.",
  pangkatChairmanLabel: "Pangkat chairman",
  pangkatChairmanPick: "Choose the chairman",
  pangkatChairmanBadge: "Chairman",
  pangkatPanelLabel: "Members",
  pangkatPanelHint:
    "The parties choose three members from the Lupong Tagapamayapa, and those three elect one of their own as chairman.",
  pangkatNeedRoster:
    "The barangay needs at least three active Lupon members before a Pangkat can be formed.",
  pangkatOpenSettings: "Manage Lupon members",
  pangkatPickThree: "Select exactly three members.",
  pangkatPanelReady: "Three selected. Choose who chairs the panel.",
  pangkatLoading: "Loading members…",
  pangkatRosterFailed: "Could not load the Lupon roster. Try again.",
  pangkatRecordPanel: "Form Pangkat",
  pangkatEditPanel: "Change Pangkat",
  pangkatModalTitle: "Pangkat ng Tagapagkasundo",
  pangkatSavePanel: "Save Pangkat",
  pangkatSaving: "Saving…",
  pangkatPanelSaved: "Pangkat panel recorded.",
  pangkatPanelSaveFailed: "Could not save the Pangkat panel.",
  pangkatCancel: "Cancel",

  // Lupong Tagapamayapa roster (settings)
  luponSectionTitle: "Lupong Tagapamayapa",
  luponSectionDesc:
    "Members who can be assigned to a Pangkat when a case reaches conciliation.",
  luponAdd: "Add member",
  luponEmpty: "No Lupon members yet.",
  luponLoading: "Loading members…",
  luponNoContact: "No contact number",
  luponInactive: "Inactive",
  luponEdit: "Edit member",
  luponRemove: "Remove member",
  luponRemoveConfirm:
    "Remove this member from the roster? Cases already handled keep their recorded panel.",
  luponRemoveFailed: "Could not remove the member.",
  luponRemoved: "Member removed.",
  luponSaved: "Member updated.",
  luponAdded: "Member added.",
  luponSaveFailed: "Could not save the member.",
  luponSave: "Save member",
  luponSaving: "Saving…",
  luponCancel: "Cancel",
  luponModalAddTitle: "Add Lupon member",
  luponModalEditTitle: "Edit Lupon member",
  luponModalDesc:
    "Only active members can be picked for a case. Cases keep their recorded panel even if a member is later removed.",
  luponNameLabel: "Full name",
  luponNamePlaceholder: "e.g., Hon. Ana Mendoza",
  luponContactLabel: "Contact number (optional)",
  luponActiveLabel: "Active and available for assignment",
  luponInstantHint:
    "Roster changes save immediately; they are not part of the settings form.",
  luponAdminOnly: "Only an administrator can change the roster.",

  // 404
  nfTitle: "Page not found",
  nfText: "The page you're looking for doesn't exist or has been moved.",
  goHome: "Go home",
} as const;

export type Key = keyof typeof en;

const tl: Record<Key, string> = {
  republic: "Republika ng Pilipinas",
  city: "Lungsod ng Baguio",
  navHome: "Home",
  navFile: "Maghain ng Reklamo",
  navTrack: "Subaybayan ang Reklamo",
  navStaff: "Dashboard ng Kawani",
  adminPanel: "Panel ng Kawani",
  adminOverview: "Buod",
  adminComplaints: "Mga Reklamo",
  adminNotices: "Mga Paskil",
  adminAccounts: "Mga Account ng Kawani",
  adminAudit: "Talaan ng Gawain",
  roleSecretary: "Kalihim",
  roleLupon: "Kagawad ng Lupon",
  themeLight: "Lumipat sa maliwanag na tema",
  themeDark: "Lumipat sa madilim na tema",
  auditSubtitle: "Talaan kung sino ang gumawa ng ano at kailan.",
  auditEmpty: "Wala pang naitalang gawain.",
  auditWhen: "Kailan",
  auditWho: "Sino",
  auditAction: "Galaw",
  auditTarget: "Puntirya",
  auditDetails: "Detalye",
  auditIp: "IP",
  auditSearchPlaceholder: "Maghanap ng detalye o kawani…",
  auditAllTypes: "Lahat ng gawain",
  ovSubtitle: "Maikling tingin sa mga reklamo, mediatasyon at anunsyo.",
  ovStatTotal: "Kabuuan",
  ovStatOpen: "Bukas",
  ovStatNotices: "Anunsyo",
  ovRecent: "Mga Kamakailang Reklamo",
  ovViewAll: "Tingnan lahat",
  ovUpcoming: "Darating na Mediatasyon",
  ovByStatus: "Ayon sa Status",
  ovNoComplaints: "Wala pang isinumiteng reklamo.",
  ovNoMediation: "Walang nakatakdang mediatasyon.",
  adminAnalytics: "Mga Ulat at Analitiks",
  adminHearings: "Mediatasyon",
  anTypes: "Pinakakaraniwang Reklamo",
  anTrends: "Takbo ng Paghahain ng Kaso",
  anHotspots: "Mga Pinaka-apektadong Lugar (Purok)",
  anSubtitle:
    "Simpleng buod kung ilan ang dumarating na reklamo, tungkol saan ang mga ito, at saan galing.",
  anTotal: "Kabuuang Reklamo",
  anThisMonth: "Naitala Ngayong Buwan",
  anTopType: "Pinakamadalas na Ireklamo",
  anTopPurok: "Pinakaapektadong Purok",
  anNoData: "Wala pang datos na maipapakita.",
  anBasedOn: "Batay sa lahat ng reklamong naitala.",
  anTypesDesc:
    "Bawat reklamo ay may kategorya. Mas malaking bahagi, mas madalas ireklamo ang isyung iyon.",
  anTrendsDesc:
    "Ilan ang reklamong naisampa kada buwan. Tumataas na linya, dumarami ang ulat sa paglipas ng panahon.",
  anHotspotsDesc:
    "Ang 10 purok na may pinakamaraming reklamo. Mas mataas na bar, mas maraming kaso mula sa lugar na iyon.",
  anStatusTitle: "Kalagayan ng mga Kaso",
  anAllTime: "Kailanman",
  anScope: "Saklaw",
  anExportCsv: "I-export ang CSV",
  anPrint: "I-print",
  anGroupMonths: "Isang buwan",
  anGroupRanges: "Saklaw ng panahon",
  anGroupYears: "Taon",
  anLast: "Nakaraang",
  anMonthsUnit: "buwan",
  anYearsUnit: "taon",
  anThisYear: "Ngayong taon",
  anStatusDesc:
    "Kung saan na ang mga kaso ngayon. Nakabinbin, Pinatawag, Mediation at Conciliation ay bukas pa; sarado na ang iba.",
  anDigest: "Buwanang Buod",
  anDigestDesc: "Mga numerong kailangan ng konseho sa napiling buwan, sa iisang tingin.",
  anDigestFiled: "Naihain",
  anDigestFailed:
    "Hindi ma-load ang ulat. Suriin ang koneksyon at subukang muli.",
  anRetry: "Subukang muli",
  anDigestResolved: "Naresolba",
  anDigestAvgTime: "Karaniwang Panahon ng Pagresolba",
  anDigestSessions: "Mga Sesyong Naganap",
  anDigestNoShow: "Hindi Dumalo",
  anDigestOpen: "Bukas Pa Ngayon",
  anDigestOverdue: "Lagpas Na ng Deadline",
  anDigestByType: "Naihain ayon sa Uri",
  anDigestDays: "araw",
  adminCreate: "Gumawa ng Account",
  adminSection: "Pangangasiwa",
  viewSite: "Tingnan ang public site",
  logout: "Mag-log out",
  login: "Mag-sign in",
  register: "Magrehistro",
  contact: "Makipag-ugnayan",
  officeHours: "Oras ng Opisina",
  monFri: "Lun–Biy 8:00 AM – 5:00 PM",
  luponHearings: "Mediatasyon ng Lupon tuwing Sabado, 9:00 AM",
  tagline: "Serbisyong totoo, para sa lahat.",

  eyebrow: "Katarungang Pambarangay · Serbisyong Totoo",
  heroTitle: "Online Complaint Desk ng Barangay Kabayanihan",
  heroText:
    "Isumbong ang alalahanin sa inyong barangay nang hindi na kailangang pumila. Ang bawat isinumite ay itinatala sa blotter ng barangay at ipinapasa sa Lupong Tagapamayapa kapag kailangan ng mediation.",
  btnFile: "Maghain ng Reklamo",
  btnTrack: "Subaybayan ang Reklamo Ko",
  hallAddress: "Address",
  hallHotline: "Hotline",
  refHint:
    "Makakakuha ka ng reference number na katulad ng 26-10-0042 para masubaybayan ang kaso.",
  doorStart: "Magsimula dito",
  doorFileHint:
    "Ilang minuto lang ang pormularyo. Maglakip ng larawan o dokumento kung mayroon ka.",
  officialsLead:
    "Ang Punong Barangay at ang Kalihim ng Barangay ang pumipirma ng mga paskil, kasulatan ng patawag at kasunduan na inilalabas ng desk na ito.",
  luponTitle: "Mga miyembro ng Lupong Tagapamayapa",
  luponNote:
    "Kapag dumaan sa conciliation ang isang kaso, ang Pangkat na mamamahala ay pinili mula sa mga miyembrong ito.",
  noticesLatest: "pinakabago muna",
  hallHours:
    "Lunes–Biyernes, 8:00 AM – 5:00 PM. Bukas 24/7 ang Barangay Tanod desk para sa mga emergency",
  howTitle: "Paano gumagana ang reklamo",
  step1Title: "Isumite ang reklamo",
  step1Text: "Punan ang form ng detalye ng insidente at ng inirereklamo.",
  step2Title: "Blotter entry",
  step2Text:
    "Itatala ng Barangay Secretary ang reklamo at ibibigay ang inyong reference number.",
  step3Title: "Summons at mediation",
  step3Text:
    "Ipapatawag ang magkabilang panig para sa mediation sa harap ng Punong Barangay o ng Lupon.",
  step4Title: "Kasunduan o endorsement",
  step4Text:
    "Maaayos sa pamamagitan ng amicable settlement, o bibigyan ng Certificate to File Action.",
  noticesTitle: "Mga Paskil / Notice Board",
  noticesEmpty: "Walang anunsyo sa ngayon.",
  n1Date: "10 Ago 2026",
  n1Title: "Inilipat sa Sabado ang iskedyul ng mediatasyon ng Lupon",
  n1Text:
    "Ang mga mediation ay idinaraos na tuwing Sabado, 9:00 AM sa Barangay Session Hall.",
  n2Date: "04 Ago 2026",
  n2Title: "May hiwalay na koleksyon ng basura",
  n2Text:
    "Kinokolekta ang nabubulok na basura tuwing Lunes at Huwebes. Ang lalabag ay bibigyan ng citation.",
  n3Date: "28 Hul 2026",
  n3Title: "Ibinalik ang curfew para sa mga menor de edad",
  n3Text:
    "Itinatakda ng Ordinance No. 2026-11 ang curfew mula 10:00 PM hanggang 4:00 AM para sa mga residenteng wala pang 18 taong gulang.",
  typesTitle: "Mga tinatanggap na reklamo",
  typesNote:
    "Paalala: Ang mga kasong kriminal na may parusang pagkakakulong na higit sa isang taon, o mga kasong nakatira sa magkaibang lungsod/munisipalidad ang magkabilang panig, ay karaniwang labas sa kapangyarihan ng Lupong Tagapamayapa at ipinapasa sa tamang ahensya.",

  aboutTitle: "Tungkol sa desk na ito",
  aboutText:
    "Ang barangay ang unang dadaanin ng away sa pagitan ng mga kapitbahay. Ang online desk na ito ang channel ng pagsasampa: itinatala ang reklamo, may reference number, at nalalaman kung kailan ang hearing sa halip na umuwi sa hall para magtanong.",
  about1Title: "Ano ang hawak nito",
  about1Text:
    "Mga reklamo sa pagitan ng mga residenteng nakatira sa barangay — ingay, kalinisahan, alitan sa hangganan, awayan, banta, hindi nabayarang utang, paglabag sa ordinansa. Itinatala ng Secretary sa blotter at ididinaog ang mediatasyon.",
  about2Title: "Sino ang naghihiliza",
  about2Text:
    "Ang Punong Barangay ang nagdadaog ng mediatasyon. Kung hindi ito may kasunduan, ang conciliation ay sa harap ng Pangkat — tatlong miyembro ng Lupong Tagapamayapa.",
  about3Title: "Ano ang hindi nito mahahawakan",
  about3Text:
    "Mga kasong kriminal na may parusang higit sa isang taon, alitan ng mga panig na nakatira sa magkaibang lungsod o munisipalidad, at reklamo ng isang barangay laban sa pribadong tao. Ipinapasa ang mga ito sa tamang ahensya.",

  faqTitle: "Mga madalas itanong",
  faq1Q: "Kailangan ba pumunta sa barangay hall para magfile?",
  faq1A:
    "Hindi. Magfile rito at ganoon din ang pagtatala katulad ng direkta sa blotter. Papatawagin lamang kayo kung may mediatasyon ang reklamo.",
  faq2Q: "Ano ang dapat ihanda bago magfile?",
  faq2A:
    "Ang inyong contact number, pangalan at tirahan ng inirereklamo, kailan at saan nangyari ang insidente, at anumang ebidensya tulad ng larawan o dokumento. Ang contact number rin ang gagamitin ninyo sa pagsubaybay.",
  faq3Q: "Paano ko masusubaybayan ang kaso ko?",
  faq3A:
    "Buksan ang tracking page at ilagay ang reference number kasama ang contact number na ginamit ninyo sa pagfile. Kailangang tumugma ang dalawa, kaya hindi ito mabubuksan ng iba sa reference number lamang.",
  faq4Q: "Ano ang susunod matapos magfile?",
  faq4A:
    "Itatala ng Barangay Secretary ang reklamo at ibibigay ang reference number. Papatawagin ang inirereklamo, at ididinaog ang mediatasyon sa harap ng Punong Barangay. Abayan kayo sa bawat ginagawa.",
  faq5Q: "May bayad ba?",
  faq5A:
    "Walang bayad ang pagsasampa ng reklamo. Ang hindi pagdating sa nakatakdang hearing nang may walang dahilan ay hinaharap sa ilalim ng Katarungang Pambarangay.",
  faq6Q: "Paano kung may kasunduan, o kung wala?",
  faq6A:
    "Ang kasunduan ay isusulat at pipirmahan, at magkakaroon ng bisa pagkalipas ng sampung araw kung walang mag-aapela. Kung walang kasunduan, naglalabas ang barangay ng Certificate to File Action para maidala ang kaso sa court.",

  type1: "Ingay",
  type2: "Basura at kalinisan",
  type3: "Pakalat-kalat na hayop",
  type4: "Alitan sa hangganan o ari-arian",
  type5: "Pisikal na pananakit / away",
  type6: "Pagmumura o pagbabanta",
  type7: "Pagnanakaw / nawawalang ari-arian",
  type8: "Hindi nabayarang utang",
  type9: "Referral sa VAWC (RA 9262)",
  type10: "Ilegal na konstruksyon",
  type11: "Paglabag sa curfew / ordinansa",
  type12: "Iba pa",

  fcTitle: "Reklamo Form",
  fcIntro:
    "Punan ang lahat ng kinakailangang impormasyon. Ang mga maling impormasyon ay maaaring maging dahilan ng pagbasura ng reklamo.",
  s1Title: "Impormasyon ng nagrereklamo",
  s1Sub: "Ang naghahain ng reklamo",
  s2Title: "Inirereklamo",
  s2Sub: "Taong o panig na inirereklamo",
  s3Title: "Detalye ng insidente",
  s3Sub: "Ang nangyari",
  fullName: "Buong pangalan",
  age: "Edad",
  purok: "Purok / Sitio",
  selectPurok: "Piliin ang purok",
  contactNumber: "Contact number",
  address: "Kumpletong address",
  emailHint: "Dito rin namin ipapadala ang mga update, kung maglalagay ka.",
  respName: "Pangalan ng inirereklamo",
  phRespName: "Pangalan o 'Hindi kilala'",
  respAddress: "Purok / address ng inirereklamo",
  respAddressOptional: "Purok / address ng inirereklamo (opsyonal)",
  relationship: "Relasyon sa inyo",
  relationshipOptional: "Relasyon sa inyo (opsyonal)",
  relHint: "Halimbawa: kapitbahay, kamag-anak, walang kaugnayan.",
  phRel: "Kapitbahay",
  complaintType: "Uri ng reklamo",
  selectType: "Piliin ang uri",
  otherType: "Ilarawan ang uri ng reklamo",
  otherTypeHint: "Pinili mo ang Iba pa. Sabihin nang maikli kung tungkol saan ito.",
  phOtherType: "Halimbawa: videoke pagkatapos ng 10 PM",
  incidentAt: "Petsa at oras ng insidente",
  place: "Lugar ng pangyayari",
  phPlace: "Halimbawa: Purok 2 covered court",
  narrative: "Salaysay",
  narrHint:
    "Isalaysay ang nangyari sa sarili ninyong pananalita. Isama ang mga saksi kung mayroon.",
  phNarr: "Noong gabi ng...",
  evidence: "Ebidensya",
  evOpen: "Buksan",
  asFiled: "Gaya ng isinampa",
  historyBy: "ina-update ni",
  evHint: "Mga larawan, video, resibo, o dokumento. Hanggang 5 files, 10 MB bawat isa.",
  dropFiles: "I-drag ang files dito o mag-browse",
  clearFiles: "Alisin ang mga file",
  consentA: "Nauunawaan ko na ang reklamong ito ay dadaan muna sa ",
  consentC:
    " (mediation at conciliation) bago maaaring iakyat sa korte, at ang lahat ng aking isinaad ay totoo sa abot ng aking kaalaman.",
  submitComplaint: "Isumite ang Reklamo",
  submitting: "Isinusumite...",
  refNote: "Bibigyan kayo ng reference number pagkatapos isumite.",
  errComplaint: "Hindi naisumite ang reklamo. Subukan muli.",
  errUnavailable: "Hindi maabot ang server. Suriin ang koneksyon at subukang muli.",

  // eligibility screening at intake
  eligTitle: "Suriin kung kaya ng barangay ang reklamo mo",
  eligIntro:
    "Ang barangay ay may kapangyarihan lamang sa mga hindi pagkakaunawaan na sakop ng Katarungang Pambarangay. Sagutin muna ang mga tanong na ito.",
  eligResidencyQ: "Saan nakatira ang inirereklamo?",
  eligResSameBarangay: "Kaparehong barangay",
  eligResSameCity: "Kaparehong lungsod, ibang barangay",
  eligResDifferentCity: "Ibang lungsod o munisipalidad",
  eligAdjoiningQ:
    "Magkadikit ba ang dalawang barangay, at pareho ba kayong pumapayag na dito ayusin ang kaso?",
  eligGovernmentQ:
    "Ang reklamo ba ay laban sa gobyerno, o laban sa isang pampublikong opisyal o empleyado dahil sa kanyang tungkulin?",
  eligOffenseQ:
    "Ito ba ay kaso ng VAWC o isang mabigat na krimen na maaaring parusahan ng mahigit isang taon sa kulungan?",
  eligPropertyQ:
    "May kinalaman ba ang kaso sa lupa o ari-arian na nasa ibang lungsod o munisipalidad?",
  eligPropertyAgreementQ:
    "Pareho ba kayong pumapayag na dito sa barangay ayusin ang usapin sa ari-arian?",
  eligYes: "Oo",
  eligNo: "Hindi",
  eligUnsure: "Hindi sigurado",
  eligNa: "Walang kinalaman",
  eligEligible: "Mukhang sakop ito ng barangay. Maaari kang magpatuloy sa ibaba.",
  eligNeedsReview:
    "May mga sagot na kailangang suriin ng staff. Maaari ka pa ring maghain, at titingnan ng barangay ang pagiging karapat-dapat.",
  eligOutside:
    "Mukhang wala ito sa kapangyarihan ng barangay. Mangyaring ihain ito sa tamang hukuman o ahensya.",
  eligSuccessReview:
    "May mga sagot sa screening na kailangang suriin ng staff. Kokontakin ka ng barangay kung kailangang i-refer ang kaso.",

  // file complaint success
  fcSuccessTitle: "Naisumite ang reklamo",
  fcSuccessText:
    "Salamat. Itago ang iyong reference number — kakailanganin mo ito upang masubaybayan ang reklamo.",
  fcSuccessNote:
    "Isulat o i-screenshot ito. Para sa iyong privacy, huwag ipakita sa iba.",
  fcViewComplaint: "Tingnan ang reklamo",
  fcFileAnother: "Mag-file ng panibagong reklamo",

  loginTitle: "Pag-sign in ng Kawani ng Barangay",
  staffOnly: "Para sa mga opisyal at kawani lamang",
  loginIdentifier: "Email, username, o numero ng telepono",
  username: "Username",
  password: "Password",
  remember: "Alalahanin ang device na ito",
  signIn: "Mag-sign in",
  signingIn: "Nag-sa-sign in...",
  forgot: "Nakalimutan ang password? Lapitan ang Barangay Secretary sa hall.",
  noAccount: "Wala pang account?",
  registeredNote:
    "Naipasa na ang registration. Maaari ka nang mag-sign in kapag naaprubahan na ng Punong Barangay ang account mo.",
  backPublic: "Bumalik sa public site",
  errInvalid: "Mali ang username o password.",
  errPending:
    "Hindi pa naa-activate ang account. Hintayin ang approval ng Punong Barangay.",
  errServer: "May problema sa server. Subukan muli.",

  regTitle: "Pagrehistro ng Kawani ng Barangay",
  regSub: "Para sa mga opisyal at kawani lamang — aprubado ng Punong Barangay",
  position: "Posisyon",
  email: "Email address",
  emailOptional: "Email address (opsyonal)",
  confirm: "Kumpirmahin",
  agree:
    "Sumasang-ayon ako sa mga tuntunin ng system at kinikilala na ang aking account ay susuriin ng Punong Barangay bago ma-activate.",
  registerBtn: "Magrehistro",
  registering: "Nagpapasa...",
  haveAccount: "May account na?",
  signInHere: "Mag-sign in dito",
  errShort: "Dapat hindi bababa sa 8 characters ang password.",
  errMismatch: "Hindi magkapareho ang password at kumpirmasyon.",
  errTaken: "May gumagamit na ng username o email na ito.",
  errFailed: "Hindi natuloy ang registration. Subukan muli.",

  // admin: create account
  phone: "Numero ng telepono",
  role: "Tungkulin",
  roleAdmin: "Admin",
  roleStaff: "Kawani",
  createAccount: "Gumawa ng account",
  creating: "Ginagawa...",
  accountCreated: "Nagawa na ang account.",

  // admin: my profile
  myProfile: "Aking Profile",
  profileSub: "I-update ang sariling detalye ng account at password.",
  saveChanges: "I-save ang mga pagbabago",
  saving: "Sine-save...",
  profileSaved: "Na-update ang profile.",
  newPassword: "Bagong password",
  newPasswordHint: "Iwanang blangko para panatilihin ang kasalukuyang password.",
  accountInfo: "Detalye ng account",
  changePassword: "Palitan ang password",
  memberSince: "Miyembro mula",
  reviewFields: "Paki-review ang mga naka-highlight na field sa ibaba.",

  // admin: barangay settings
  adminSettings: "Mga Setting ng Barangay",
  settingsSub:
    "Opisyal na detalye ng barangay na ginagamit sa mga naka-print na dokumento at abiso.",
  barangayProfile: "Profile ng Barangay",
  settingsLetterhead:
    "Lumalabas ang impormasyong ito sa letterhead at mga pipirma ng mga naka-print na dokumento ng kaso.",
  settingsSaved: "Nai-save ang mga setting.",
  settingsViewOnly: "Mga administrator lang ang makakapagbago ng mga setting na ito.",
  barangayName: "Pangalan ng barangay",
  cityLabel: "Lungsod / Munisipalidad",
  province: "Probinsya",
  punongBarangay: "Punong Barangay",
  secretaryName: "Barangay Secretario",
  settingsIdentity: "Pagkakakilanlan ng barangay",
  settingsContact: "Kontak at opisina",
  settingsSignatories: "Mga pipirma",
  settingsSignatoriesDesc:
    "Sa batas, ang Punong Barangay ang nangunguna sa Lupong Tagapamayapa, kaya isang opisyal ang may dalawang titulo. Ang tagapangulo ng Pangkat ay halal sa bawat kaso at inilalagay sa pahina ng kaso.",
  settingsBranding: "Logo at branding",
  settingsDeadlines: "Mga takda ng Katarungang Pambarangay",
  settingsNavDeadlines: "Mga takda",
  settingsNotifications: "Abiso sa naghain ng reklamo",
  settingsNavNotifications: "Mga abiso",
  settingsSections: "Mga seksyon ng setting",
  settingsPreview: "Preview ng letterhead",
  settingsChannels: "Mga channel ng mensahe",
  logoLabel: "Logo ng barangay",
  logoHint: "PNG, JPG, o WEBP hanggang 2 MB. Makikita sa sidebar at naka-print na letterhead.",
  signatureLabel: "Lagda",
  uploadImage: "Mag-upload ng larawan",
  replaceImage: "Palitan",
  removeImage: "Alisin",
  hotlineLabel: "Hotline ng opisina",
  tanodLabel: "Hotline ng tanod",
  punongTitleLabel: "Titulo ng Punong Barangay",
  secretaryTitleLabel: "Titulo ng Secretario",
  settingsPuroks: "Mga purok",
  puroksHint:
    "Ito ang mga pagpipilian na purok sa pampublikong form ng reklamo.",
  puroksLabel: "Listahan ng mga purok",
  noPuroks: "Wala pang purok. Magdagdag ng isa sa ibaba.",
  addPurok: "Magdagdag ng purok",
  removePurok: "Alisin ang purok",
  puroksNote:
    "Naka-imbak ang pangalan ng purok sa bawat reklamo, kaya ang pagpapalit ng entry ay nakakaapekto lamang sa mga bagong filing.",
  settingsOfficials: "Mga opisyal ng barangay",
  officialsHint: "Ang mga taong ilalagay ng public site bilang kasapi ng konseho.",
  officialsLabel: "Nailalathalang listahan",
  noOfficials: "Wala pang nakalistang opisyal. Magdagdag ng isa sa ibaba.",
  addOfficial: "Magdagdag ng opisyal",
  removeOfficial: "Alisin ang opisyal",
  officialsNote:
    "Ipinapakita sa pagkakasunod-sunod na ito. Kung hindi magagamit ang listahan, itinatago ito sa site.",
  officeLineLabel: "Linya ng tanggapan sa mga dokumento",
  officeLineHint:
    "Nakalimbag sa ilalim ng pangalan ng barangay sa summons, abiso, at kasunduan.",
  deadlineReceivedLabel: "Araw para ipatawag ang inirereklamo",
  deadlineSummonedLabel: "Araw para idaos ang mediasyon",
  deadlineMediationLabel: "Araw para tapusin ang mediasyon",
  deadlineConciliationLabel: "Araw para tapusin ang konsilyasyon",
  riskWindowLabel: "Window ng babala bago matapos ang takda (araw)",
  daysSuffix: "araw",
  notifyIntakeEvent: "Natanggap ang reklamo (resibo)",
  notifyStatusEvent: "Mga pagbabago sa estado ng kaso",
  notifyMediationEvent: "Naiskedyul o nailipat ang mediasyon",
  notifyCancelledEvent: "Nakansela ang mediasyon",
  channelSms: "SMS",
  channelEmail: "Email",
  smsConfigured: "Naka-configure at naka-enable ang SMS.",
  smsMissing: "Hindi naka-configure ang SMS (kulang ang UniSMS keys).",
  emailConfigured: "Naka-configure at naka-enable ang email.",
  emailMissing: "Hindi naka-configure ang email (kulang ang Brevo key).",
  lastUpdated: "Huling na-update",
  unsavedChanges: "May mga hindi pa na-save na pagbabago.",
  resetChanges: "I-reset",
  settingsReset: "Na-reset ang mga pagbabago.",
  imageUploaded: "Na-upload ang larawan.",
  notificationsHint:
    "Piliin kung aling mga mensahe ang awtomatikong ipapadala sa naghain. Nilalaktawan ang channel na walang provider key.",
  settingsScheduling: "Pag-iskedyul ng sesyon",
  settingsSchedulingHint:
    "Mga default at panuntunan kapag nag-iskedyul ang staff ng mediasyon, konsilyasyon, o arbitration.",
  defaultVenueLabel: "Default na lugar ng sesyon",
  defaultVenuePlaceholder: "hal. Barangay Hall Session Room",
  sessionLengthLabel: "Haba ng sesyon (minuto)",
  sessionLengthHint:
    "Ginagamit upang suriin ang magkakapatong na booking at hangganan ng oras ng opisina.",
  hearingGraceLabel: "Grace period bago ituring na napalampas (oras)",
  hearingGraceHint:
    "Gaano katagal pagkatapos ng oras ng simula bago markahan na napalampas ang sesyon.",
  enforceOfficeHoursLabel: "Ipagpatupad ang oras ng opisina sa pag-iskedyul",
  enforceOfficeHoursHint:
    "Tanggihan ang oras ng sesyon na labas sa oras ng pagbubukas at pagsasara sa ibaba.",
  officeOpensLabel: "Pagbubukas ng opisina",
  officeClosesLabel: "Pagsasara ng opisina",
  workingDaysLabel: "Bilangin ang mga takda sa araw ng trabaho",
  workingDaysHint:
    "Laktawan ang Sabado, Linggo, at mga holiday sa pagkalkula ng susunod na takda ng KP.",
  holidaysLabel: "Mga holiday",
  noHolidays: "Walang naidagdag na holiday.",
  addHoliday: "Magdagdag ng holiday",
  removeHoliday: "Alisin",
  holidaysHint:
    "Ginagamit lamang kapag binibilang ang mga takda sa araw ng trabaho.",
  reminderLeadLabel: "Oras ng paalala bago ang sesyon (oras)",
  reminderLeadHint:
    "Ipinaaalala sa staff at naghain kapag malapit na ang sesyon. Tumatakbo ang scan tuwing 30 minuto.",

  // track
  trackTitle: "Subaybayan ang Reklamo Ko",
  trackIntro:
    "Ilagay ang reference number at ang contact number na ginamit ninyo sa paghain.",
  refNumber: "Reference number",
  phoneUsed: "Contact number na ginamit",
  trackBtn: "Subaybayan",
  tracking: "Hinahanap...",
  trackHelp: "Nawala ang reference number? Pumunta sa barangay hall.",
  trackRecent: "Mga kamakailang reference",
  trackClearRecent: "Burahin",
  downloadRef: "I-download ang reference",
  download: "I-download",
  downloadTrackAt: "Subaybayan ang reklamo sa:",
  downloadKeep:
    "Itago ang reference number na ito at ang contact number na ginamit nang maghain.",
  errNotFound: "Walang nakitang reklamo na tugma.",
  errTooMany: "Masyadong maraming subok. Subukan muli mamaya.",
  errTrack: "May problema. Subukan muli.",
  currentStatus: "Kasalukuyang status",
  history: "Kasaysayan",
  hearing: "Mediatasyon",
  st_received: "Nakabinbin",
  st_summoned: "Pinatawag ang inirereklamo",
  st_mediation: "Nasa mediation",
  st_conciliation: "Nasa conciliation (Lupon)",
  st_settled: "Naayos",
  st_certified: "Binigyan ng sertipiko para magsampa ng kaso",
  st_dismissed: "Ibinasura",
  dueDate: "Susunod na takda",
  overdue: "Lampas na sa takda",
  overdueOnly: "Lampas na takda lang",
  openOnly: "Bukas na kaso lang",
  dueSoon: "Malapit nang mag-takda",
  dueSoonOnly: "Malapit nang mag-takda lang",
  anyDue: "Kahit anong takda",
  noDeadline: "Walang nakabinbing takda",
  caseClosed: "Sarado na ang kaso",
  needsAttention: "Kailangan ng Pansin",
  allClear: "Wala nang kasong kailangan ng pansin sa ngayon.",
  notifications: "Mga Abiso",
  noNotifications: "Wala kang bagong abiso.",
  markAllRead: "Markahan lahat na nabasa",
  notifMarkFailed: "Hindi na-update ang mga abiso mo.",
  notifLoadFailed:
    "Hindi ma-load ang mga abiso mo. Isara ito at pindutin muli ang kampanilya.",
  notifNew: "Bago",
  trackPhase: "Kung nasaan na ang kaso mo",
  ph_received:
    "Nakatala na ang reklamo mo sa blotter ng barangay. Ipatawag ng Punong Barangay ang inirereklamo sa loob ng 3 araw.",
  ph_summoned:
    "Napatawag na ang inirereklamo. Magsasagawa ng mediation sa loob ng 7–15 araw mula nang paghain.",
  ph_mediation:
    "Nagpapatuloy ang mediation sa harap ng Punong Barangay. Kung magkakasundo, isasara ang kaso sa isang amicable settlement.",
  ph_conciliation:
    "Ipinasa ang kaso sa Lupong Tagapamayapa. May 15 araw ang Pangkat para tulungan ang mga panig na magkasundo.",
  ph_settled:
    "Naayos na ang kaso. Nakarating sa amicable settlement ang magkabilang panig.",
  ph_certified:
    "Walang naging kasunduan, kaya binigyan ng Certificate to File Action. Maaari nang dalhin ng nagreklamo ang kaso sa korte.",
  ph_dismissed: "Ibinasura ng barangay ang kaso.",

  // case update flow (advance stage / add note)
  updAdvance: "Isulong ang yugto",
  updAddNote: "Magdagdag ng tala",
  updStageTitle: "Itala ang susunod na hakbang",
  updStageDesc:
    "Piliin ang tunay na nangyari. Ipapakita lamang ang mga hakbang na pinapayagan sa kasalukuyang yugto.",
  updCurrentStage: "Kasalukuyang yugto",
  updNextSession: "Mag-iskedyul ng susunod na sesyon",
  updOptional: "opsyonal",
  updNextSessionHint: "Hayaang walang laman para hindi magbago ang iskedyul.",
  updClosingNote:
    "Ang pagsasara ng kaso ay kakanselahin ang mga nakaiskedyul na sesyon at buburahin ang deadline nito.",
  updPublicNote: "Pampublikong tala (makikita sa kasaysayan ng kaso)",
  updPublicNotePh:
    "hal., Nakapagkasunduo ang mga partido tungkol sa hidwaan sa lupa.",
  updInternalNote: "Panloob na tala (staff lamang)",
  updInternalNotePh:
    "hal., Hindi dumating ang inirereklamo sa unang mediasyon.",
  updNoteTitle: "Magdagdag ng tala",
  updNoteDesc:
    "Nagdaragdag ng tala sa kasaysayan ng kaso nang hindi binabago ang yugto o ang deadline.",
  updNeedNote: "Magsulat ng kahit isang tala bago i-save.",
  updSaved: "Na-update ang kaso.",
  updSaveFailed: "Hindi na-update ang kaso.",
  updCancel: "Kanselahin",
  actTo_summoned: "Maglabas ng patawag",
  actTo_summonedDesc:
    "Magpapatawag ang barangay sa inirereklamo para dumalo sa mediasyon.",
  actTo_mediation: "Simulan ang mediasyon",
  actTo_mediationDesc: "Papasok ang kaso sa mediasyon sa harap ng lupon.",
  actTo_settled: "Itala ang kasunduan",
  actTo_settledDesc: "Nakapagkasunduo ang mga partido. Sasara ang kaso.",
  actTo_conciliation: "Isulong sa conciliation",
  actTo_conciliationDesc:
    "Hindi natapos ang kaso sa mediasyon. Magpapatuloy ito sa conciliation sa Lupon.",
  actTo_certified: "Maglabas ng sertipiko para maghain sa korte",
  actTo_certifiedDesc:
    "Hindi umasenso ang conciliation. Tumatanggap ang mga partido ng sertipiko para dalhin ang kaso sa korte.",
  actTo_dismissed: "Ibasura ang kaso",
  actTo_dismissedDesc: "Isasara ang kaso nang walang kasunduan.",

  // privacy policy
  privacyTitle: "Patakaran sa Privacy",
  privacyUpdated: "Huling na-update: Oktubre 23, 2026",
  privacyIntro:
    "Ipinaliwanag ng patakarang ito kung anong personal na impormasyon ang kinokolekta ng Online Complaint Desk, bakit namin ito kinokolekta, at ano ang mga pagpipilian mo. Sumusunod ito sa Republic Act No. 10173, ang Data Privacy Act of 2012.",
  privacyWhoTitle: "Sino ang nagpapatakbo ng site na ito",
  privacyWhoText:
    "Ang complaint desk na ito ay pinapatakbo ng barangay na nakasaad sa itaas, sa pamamagitan ng Tanggapan ng Punong Barangay at ng Lupong Tagapamayapa.",
  privacyCollectTitle: "Impormasyong kinokolekta namin",
  privacyCollectText:
    "Kapag naghain ka ng reklamo, kinokolekta namin ang iyong pangalan, edad, purok o address, contact number, opsyonal na email address, mga detalye ng pangyayari, impormasyon tungkol sa inirereklamo, at anumang larawan, dokumento, o video na ikinabit mo. Para subaybayan ang reklamo, kailangan namin ang reference number at ang contact number na ginamit mo. Ang mga account ng staff ay may pangalan, username, email address, numero ng telepono, at tungkulin.",
  privacyUseTitle: "Paano namin ito ginagamit",
  privacyUseText:
    "Ginagamit namin ang impormasyong ito para itala at proseso ang iyong reklamo, makipag-ugnayan tungkol sa patawag, mediasyon, at kalagayan ng iyong kaso, maghanda ng opisyal na dokumento ng barangay, at panatilihin ang audit trail para sa pananagutan. Hindi namin ibinebenta ang personal na impormasyon.",
  privacyShareTitle: "Sino ang makakakita nito",
  privacyShareText:
    "Tanging mga awtorisadong staff ng barangay ang makakabukas ng mga rekord ng reklamo. Bilang bahagi ng proseso ng Katarungang Pambarangay, tumatanggap ang inirereklamo ng patawag na may detalyeng kailangan para sagutin ang reklamo. Pinoproseso ng aming hosting, database, at messaging provider ang datos para mapatakbo ang serbisyo.",
  privacyCookiesTitle: "Cookies at advertising",
  privacyCookiesText:
    "Gumagamit ang pag-sign in ng staff ng mahahalagang cookie para mapanatiling secure ang session; hindi ito ginagamit sa advertising. Maaaring magpakita ng ads mula sa Google AdSense ang mga pampublikong pahina. Maaaring gumamit ang Google at ang mga partner nito ng cookies para magpakita ng ads batay sa dating pagbisita sa site na ito o sa iba. Maaari mong patayin ang personalized na advertising sa Google Ads Settings (adssettings.google.com) o alamin ang pag-opt out sa aboutads.info. Hindi naaapektuhan ng pag-block ng cookies ang paghain ng reklamo, pero hindi makakapasok ang staff kung wala ang mga ito.",
  privacyRetentionTitle: "Gaano katagal namin ito itinatago",
  privacyRetentionText:
    "Ang mga rekord ng reklamo ay itinatago ayon sa mga tuntunin sa rekord ng barangay at sa mga takda ng Katarungang Pambarangay. Ang mga kredensyal sa pag-sign in ay nakaimbak bilang hash at limitado ang pag-access ayon sa tungkulin. Walang sistemang ganap na ligtas, pero gumagawa kami ng makatuwirang hakbang para protektahan ang ipinapadala mo.",
  privacyRightsTitle: "Ang iyong mga karapatan",
  privacyRightsText:
    "Sa ilalim ng Data Privacy Act, maaari kang humiling na maipaalam, ma-access, maitama, o tutulan ang pagpoproseso ng iyong personal na impormasyon, at mapabura o mapahinto ito kung pinapayagan ng batas. Maaari ka ring maghain ng reklamo sa National Privacy Commission (privacy.gov.ph). Para sa hiling, makipag-ugnayan sa barangay gamit ang detalye sa ilalim ng pahina.",
  privacyChangesTitle: "Mga pagbabago sa patakarang ito",
  privacyChangesText:
    "Maaari naming i-update ang patakarang ito kapag nagbago ang serbisyo o ang batas. Makikita sa petsa sa itaas ang pinakabagong rebisyon.",

  // complaints list
  clSubtitle:
    "Lahat ng reklamong nakatala. I-filter, hanapin, at buksan ang kaso para aksyunan ito.",
  clFiled: "Inihain",
  clStatus: "Katayuan",
  clAllStatuses: "Lahat ng katayuan",
  clAllTypes: "Lahat ng uri",
  clReload: "I-reload",
  clClear: "Alisin",
  clFilters: "Mga filter",
  clSelected: "napili",
  clApplyStatus: "Ilapat ang katayuan",
  clApplying: "Inilalapat...",
  clNoMatches: "Walang reklamong tumutugma sa iyong mga filter.",
  clNoComplaints: "Wala pang reklamo.",
  clSearchPlaceholder: "Maghanap ng reklamo...",
  clRecentSearches: "Mga kamakailang paghahanap",
  clSearching: "Naghahanap...",
  clNoSearchMatches: "Walang nahanap.",
  clSelectAll: "Piliin lahat",
  clSelectRow: "Piliin",

  nfTitle: "Hindi mahanap ang pahina",
  nfText: "Ang pahinang hinahanap ninyo ay wala o nailipat na.",
  goHome: "Bumalik sa Home",

  // complaint view/detail page
  complaintDetails: "Mga Detalye ng Reklamo",
  backToList: "Bumalik sa Listahan",
  prevCase: "Naunang kaso",
  nextCase: "Susunod na kaso",
  partiesInvolved: "Mga Panig na Kabilang",
  complainant: "Nagrereklamo",
  respondent: "Inirereklamo",
  assignedTo: "Itinalaga kay",
  complaintInfo: "Impormasyon ng Reklamo",
  filedDate: "Petsa ng Paghain",
  description: "Paglalarawan",
  statusHistory: "Kasaysayan ng Status",
  historyPage: "Pahina {page} ng {pages}",
  historyEvents: "{total} kaganapan",
  prevPage: "Nakaraan",
  nextPage: "Susunod",
  notes: "Mga Tala",

  // eligibility review (staff)
  eligStaffTitle: "Pagiging Karapat-dapat sa KP",
  eligStaffDesc: "Screening sa paghain at desisyon ng staff.",
  eligNotScreened: "Hindi pa nasuri",
  eligStatusEligible: "Karapat-dapat",
  eligStatusNeedsReview: "Kailangang suriin",
  eligStatusOutside: "Labas sa KP",
  eligStatusRejected: "Tinanggihan",
  eligReview: "Suriin ang pagiging karapat-dapat",
  eligReviewTitle: "Suriin ang pagiging karapat-dapat sa KP",
  eligReviewDesc:
    "Kumpirmahin kung ang reklamong ito ay sakop ng kapangyarihan ng barangay.",
  eligClosed:
    "Sarado na ang kasong ito. Hindi na mababago ang pagiging karapat-dapat.",
  eligReviewStatus: "Desisyon",
  eligNotes: "Mga tala sa pagsusuri",
  eligNotesHint:
    "Ipaliwanag ang desisyon, lalo na kung binabago mo ang resulta ng screening.",
  eligSaveReview: "I-save ang pagsusuri",
  eligSaving: "Sine-save...",
  eligSaved: "Na-update ang pagiging karapat-dapat.",
  eligSaveFailed: "Hindi ma-update ang pagiging karapat-dapat.",
  eligReviewed: "Sinuri",
  eligIntakeAnswers: "Mga sagot sa screening",
  eligAnsResidency: "Tirahan ng inirereklamo",
  eligAnsAdjoining: "Kasunduan sa magkadikit na barangay",
  eligAnsGovernment: "Gobyerno / pampublikong opisyal",
  eligAnsOffense: "VAWC / mabigat na krimen",
  eligAnsProperty: "Ari-arian sa ibang lungsod",
  eligAnsPropertyAgreement: "Kasunduan sa usapin ng ari-arian",
  eligNoAnswers: "Walang naitalang sagot sa screening para sa kasong ito.",
  eligPendingFlag: "Naghihintay ng pagsusuri",
  eligUnscreenedFlag: "Naghihintay ng screening",
  eligDismissWarning:
    "Kapag na-save ito, ma-dismiss ang kaso, matatanggal ang deadline, at maaabisuhan ang nagrereklamo. Gawin lamang ito kapag malinaw na labas sa kapangyarihan ng barangay ang reklamo.",
  eligSavedDismissed: "Na-update ang pagiging karapat-dapat. Na-dismiss ang kaso.",
  eligReason: "Dahilan ng pagtanggi",
  eligReasonHint:
    "Ipinapakita ito sa nagrereklamo at naitala sa kasaysayan ng kaso.",
  eligReasonPlaceholder: "Hal., Binawi ng nagrereklamo ang reklamo.",
  eligRejectWarning:
    "Kapag na-save ito, ma-dismiss ang kaso, matatanggal ang deadline, at maaabisuhan ang nagrereklamo kasama ang dahilang ito.",
  eligRejectionReason: "Dahilan ng pagtanggi",

  // proof of service
  serviceTitle: "Patunay ng paghahatid",
  serviceDesc: "Itala kung paano at kailan naisilbi ang patawag.",
  serviceRecord: "Itala ang paghahatid",
  serviceHistoryLabel: "Patunay ng paghahatid",
  serviceEmpty: "Wala pang naitalang patunay ng paghahatid.",
  serviceClosed:
    "Sarado na ang kasong ito. Hindi na maitala ang patunay ng paghahatid.",
  serviceModalTitle: "Itala ang patunay ng paghahatid",
  serviceModalDesc: "Itala ang resulta ng paghahatid ng patawag.",
  serviceServer: "Naghatid",
  serviceServerPlaceholder: "Pangalan ng naghatid / kawani ng barangay",
  serviceDate: "Petsa at oras ng paghahatid",
  serviceDatePlaceholder: "Pumili ng petsa at oras",
  serviceResult: "Resulta",
  serviceResultPlaceholder: "Piliin ang resulta",
  serviceReceived: "Natanggap",
  serviceRefused: "Tinanggihan",
  serviceNotFound: "Hindi natagpuan",
  serviceDateTime: "Naipadala",
  serviceNotes: "Mga tala (opsyonal)",
  serviceNotesPlaceholder:
    "Hal., Iniwan ang patawag sa asawa ng inirereklamo.",
  serviceSave: "I-save ang tala",
  serviceSaving: "Sine-save...",
  serviceSaved: "Naitala ang patunay ng paghahatid.",
  serviceSavedDeadline:
    "Naitala ang patunay. Nagsisimula na ang deadline ng medyasyon sa petsa ng paghahatid.",
  serviceSaveFailed: "Hindi maitala ang patunay ng paghahatid.",
  serviceDeadlineHint:
    "Kapag natanggap ang patawag, nagsisimula muli ang deadline ng medyasyon sa petsa ng paghahatid.",
  serviceLoggedBy: "Naitala ni",

  // documents
  documents: "Mga Dokumento ng Kaso",
  documentsDesc:
    "Gumawa ng opisyal na papeles ng Katarungang Pambarangay para sa kasong ito.",
  printDoc: "I-print / I-save bilang PDF",
  backToCase: "Bumalik sa kaso",
  doc_summons: "Patawag (Summons)",
  doc_notice: "Abiso ng Mediatasyon",
  doc_settlement: "Kasunduang Pag-aayos",
  doc_cfa: "Sertipiko para Magsampa ng Kaso",
  lblPunongBarangay: "Punong Barangay",
  lblPangkatChairman: "Tagapangulo ng Pangkat ng Tagapagkasundo",
  lblSecretary: "Barangay Secretario",
  lblWitnessedBy: "Pinangdalahan ni",
  cfaCertifiedBy: "Sinertipohan ni",
  cfaAttestedBy: "Pinatunayan ni",
  lblComplainant: "Nagrereklamo",
  lblRespondent: "Inirereklamo",
  lblAttestedBy: "Pinatunayan ni",

  // Pangkat ng Tagapagkasundo (RA 7160 §412)
  pangkatTitle: "Pangkat ng Tagapagkasundo",
  pangkatDesc:
    "Ang panelang nagmumunsura kapag hindi naayos sa mediatasyon ang kaso.",
  pangkatEmpty: "Wala pang Pangkat na binubuo para sa kasong ito.",
  pangkatChairmanLabel: "Tagapangulo ng Pangkat",
  pangkatChairmanPick: "Piliin ang tagapangulo",
  pangkatChairmanBadge: "Tagapangulo",
  pangkatPanelLabel: "Mga miyembro",
  pangkatPanelHint:
    "Pumipili ang mga partido ng tatlong miyembro mula sa Lupong Tagapamayapa, at sila ang humahalal ng isa sa kanila bilang tagapangulo.",
  pangkatNeedRoster:
    "Kailangan ng barangay ng hindi bababa sa tatlong aktibong miyembro ng Lupon bago makabuo ng Pangkat.",
  pangkatOpenSettings: "Pamahalaan ang mga miyembro ng Lupon",
  pangkatPickThree: "Pumili ng eksaktong tatlong miyembro.",
  pangkatPanelReady: "Tatlo na ang napili. Piliin kung sino ang mangungulo.",
  pangkatLoading: "Naglo-load ng mga miyembro…",
  pangkatRosterFailed: "Hindi ma-load ang listahan ng Lupon. Subukan muli.",
  pangkatRecordPanel: "Bumuo ng Pangkat",
  pangkatEditPanel: "Palitan ang Pangkat",
  pangkatModalTitle: "Pangkat ng Tagapagkasundo",
  pangkatSavePanel: "I-save ang Pangkat",
  pangkatSaving: "Sine-save…",
  pangkatPanelSaved: "Naitala ang Pangkat.",
  pangkatPanelSaveFailed: "Hindi ma-save ang Pangkat.",
  pangkatCancel: "Kanselahin",

  // Lupong Tagapamayapa roster (settings)
  luponSectionTitle: "Lupong Tagapamayapa",
  luponSectionDesc:
    "Mga miyembrong maaaring italaga sa Pangkat kapag umabot sa munsurasyon ang kaso.",
  luponAdd: "Magdagdag ng miyembro",
  luponEmpty: "Wala pang miyembro ng Lupon.",
  luponLoading: "Naglo-load ng mga miyembro…",
  luponNoContact: "Walang numero ng kontakt",
  luponInactive: "Hindi aktibo",
  luponEdit: "I-edit ang miyembro",
  luponRemove: "Alisin ang miyembro",
  luponRemoveConfirm:
    "Alisin ang miyembrong ito sa listahan? Nananatili sa mga naunang kaso ang naitalang Pangkat.",
  luponRemoveFailed: "Hindi maalis ang miyembro.",
  luponRemoved: "Naalis ang miyembro.",
  luponSaved: "Na-update ang miyembro.",
  luponAdded: "Naidagdag ang miyembro.",
  luponSaveFailed: "Hindi ma-save ang miyembro.",
  luponSave: "I-save ang miyembro",
  luponSaving: "Sine-save…",
  luponCancel: "Kanselahin",
  luponModalAddTitle: "Magdagdag ng miyembro ng Lupon",
  luponModalEditTitle: "I-edit ang miyembro ng Lupon",
  luponModalDesc:
    "Aktibong miyembro lamang ang mapipili para sa kaso. Nananatili sa kaso ang naitalang Pangkat kahit maalis pa ang miyembro.",
  luponNameLabel: "Buong pangalan",
  luponNamePlaceholder: "hal., Hon. Ana Mendoza",
  luponContactLabel: "Numero ng kontakt (opsyonal)",
  luponActiveLabel: "Aktibo at available sa pagtatalaga",
  luponInstantHint:
    "Agad na nase-save ang pagbabago sa listahan; hindi ito bahagi ng form ng settings.",
  luponAdminOnly: "Administrator lamang ang makakabago ng listahan.",
};

const dict = { en, tl };

export const complaintTypeKeys: Key[] = [
  "type1", "type2", "type3", "type4", "type5", "type6",
  "type7", "type8", "type9", "type10", "type11", "type12",
];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: Key) => string };
const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("lang");
      return saved === "en" || saved === "tl" ? saved : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("lang", lang);
    } catch {
      /* storage unavailable, ignore */
    }
  }, [lang]);

  const t = (key: Key) => dict[lang][key];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside <LanguageProvider>");
  return ctx;
}
