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
  anStatusDesc:
    "Where cases stand today. Received, Summoned, Mediation and Conciliation are still open; the rest are closed.",
  anDigest: "Monthly Digest",
  anDigestDesc: "The numbers the council needs for the chosen month, in one view.",
  anDigestFiled: "Filed",
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
  hallInfo: "Barangay Hall Information",
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
  relationship: "Relationship to you",
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
  luponChairman: "Lupon Chairman",
  settingsIdentity: "Barangay identity",
  settingsContact: "Contact and office",
  settingsSignatories: "Signatories",
  settingsBranding: "Logo and branding",
  settingsDeadlines: "Katarungang Pambarangay deadlines",
  settingsNotifications: "Complainant notifications",
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
  luponTitleLabel: "Lupon chairman title",
  deadlineReceivedLabel: "Days to summon the respondent",
  deadlineSummonedLabel: "Days to hold mediation",
  deadlineMediationLabel: "Days to conclude mediation",
  deadlineConciliationLabel: "Days to conclude conciliation",
  riskWindowLabel: "Due-soon warning window (days)",
  daysSuffix: "days",
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

  // track
  trackTitle: "Track My Complaint",
  trackIntro:
    "Enter your reference number and the contact number you used when filing.",
  refNumber: "Reference number",
  phoneUsed: "Contact number used",
  trackBtn: "Track",
  tracking: "Searching...",
  trackHelp: "Lost your reference number? Visit the barangay hall.",
  errNotFound: "No matching complaint found.",
  errTooMany: "Too many attempts. Please try again later.",
  errTrack: "Something went wrong. Please try again.",
  currentStatus: "Current status",
  history: "History",
  hearing: "Mediation",
  st_received: "Received",
  st_summoned: "Respondent summoned",
  st_mediation: "Under mediation",
  st_conciliation: "Under conciliation (Lupon)",
  st_settled: "Settled",
  st_certified: "Certified to file action",
  st_dismissed: "Dismissed",
  priority: "Priority",
  anyPriority: "Any priority",
  priorityHint: "Triage level for this case. It rises automatically when a step passes its deadline.",
  pr_low: "Low",
  pr_normal: "Normal",
  pr_high: "High",
  pr_urgent: "Urgent",
  dueDate: "Next deadline",
  overdue: "Overdue",
  overdueOnly: "Overdue only",
  openOnly: "Open cases only",
  dueSoon: "Due soon",
  dueSoonOnly: "Due soon only",
  anyDue: "Any due date",
  noDeadline: "No pending deadline",
  needsAttention: "Needs Attention",
  allClear: "All caught up. No cases need attention right now.",
  notifications: "Notifications",
  noNotifications: "You're all caught up.",
  markAllRead: "Mark all read",
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

  // complaint view/detail page
  complaintDetails: "Complaint Details",
  backToList: "Back to List",
  partiesInvolved: "Parties Involved",
  complainant: "Complainant",
  respondent: "Respondent",
  assignedTo: "Assigned To",
  complaintInfo: "Complaint Information",
  filedDate: "Filed Date",
  description: "Description",
  statusHistory: "Status History",
  notes: "Notes",

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
  lblLuponChairman: "Lupon Chairman",
  lblComplainant: "Complainant",
  lblRespondent: "Respondent",
  lblAttestedBy: "Attested by",

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
  anStatusDesc:
    "Kung saan na ang mga kaso ngayon. Natanggap, Pinatawag, Mediation at Conciliation ay bukas pa; sarado na ang iba.",
  anDigest: "Buwanang Buod",
  anDigestDesc: "Mga numerong kailangan ng konseho sa napiling buwan, sa iisang tingin.",
  anDigestFiled: "Naihain",
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
  hallInfo: "Impormasyon ng Barangay Hall",
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
  relationship: "Relasyon sa inyo",
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
  luponChairman: "Tagapangulo ng Lupon",
  settingsIdentity: "Pagkakakilanlan ng barangay",
  settingsContact: "Kontak at opisina",
  settingsSignatories: "Mga pipirma",
  settingsBranding: "Logo at branding",
  settingsDeadlines: "Mga takda ng Katarungang Pambarangay",
  settingsNotifications: "Abiso sa naghain ng reklamo",
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
  luponTitleLabel: "Titulo ng tagapangulo ng lupon",
  deadlineReceivedLabel: "Araw para ipatawag ang inirereklamo",
  deadlineSummonedLabel: "Araw para idaos ang mediasyon",
  deadlineMediationLabel: "Araw para tapusin ang mediasyon",
  deadlineConciliationLabel: "Araw para tapusin ang konsilyasyon",
  riskWindowLabel: "Window ng babala bago matapos ang takda (araw)",
  daysSuffix: "araw",
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

  // track
  trackTitle: "Subaybayan ang Reklamo Ko",
  trackIntro:
    "Ilagay ang reference number at ang contact number na ginamit ninyo sa paghain.",
  refNumber: "Reference number",
  phoneUsed: "Contact number na ginamit",
  trackBtn: "Subaybayan",
  tracking: "Hinahanap...",
  trackHelp: "Nawala ang reference number? Pumunta sa barangay hall.",
  errNotFound: "Walang nakitang reklamo na tugma.",
  errTooMany: "Masyadong maraming subok. Subukan muli mamaya.",
  errTrack: "May problema. Subukan muli.",
  currentStatus: "Kasalukuyang status",
  history: "Kasaysayan",
  hearing: "Mediatasyon",
  st_received: "Natanggap",
  st_summoned: "Pinatawag ang inirereklamo",
  st_mediation: "Nasa mediation",
  st_conciliation: "Nasa conciliation (Lupon)",
  st_settled: "Naayos",
  st_certified: "Binigyan ng sertipiko para magsampa ng kaso",
  st_dismissed: "Ibinasura",
  priority: "Priyoridad",
  anyPriority: "Kahit anong priyoridad",
  priorityHint: "Antas ng prayoridad ng kasong ito. Awtomatiko itong tumataas kapag lumampas sa deadline.",
  pr_low: "Mababa",
  pr_normal: "Karaniwan",
  pr_high: "Mataas",
  pr_urgent: "Apurahan",
  dueDate: "Susunod na takda",
  overdue: "Lampas na sa takda",
  overdueOnly: "Lampas na takda lang",
  openOnly: "Bukas na kaso lang",
  dueSoon: "Malapit nang mag-takda",
  dueSoonOnly: "Malapit nang mag-takda lang",
  anyDue: "Kahit anong takda",
  noDeadline: "Walang nakabinbing takda",
  needsAttention: "Kailangan ng Pansin",
  allClear: "Wala nang kasong kailangan ng pansin sa ngayon.",
  notifications: "Mga Abiso",
  noNotifications: "Wala kang bagong abiso.",
  markAllRead: "Markahan lahat na nabasa",
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

  nfTitle: "Hindi mahanap ang pahina",
  nfText: "Ang pahinang hinahanap ninyo ay wala o nailipat na.",
  goHome: "Bumalik sa Home",

  // complaint view/detail page
  complaintDetails: "Mga Detalye ng Reklamo",
  backToList: "Bumalik sa Listahan",
  partiesInvolved: "Mga Panig na Kabilang",
  complainant: "Nagrereklamo",
  respondent: "Inirereklamo",
  assignedTo: "Itinalaga kay",
  complaintInfo: "Impormasyon ng Reklamo",
  filedDate: "Petsa ng Paghain",
  description: "Paglalarawan",
  statusHistory: "Kasaysayan ng Status",
  notes: "Mga Tala",

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
  lblLuponChairman: "Tagapangulo ng Lupon",
  lblComplainant: "Nagrereklamo",
  lblRespondent: "Inirereklamo",
  lblAttestedBy: "Pinatunayan ni",
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
