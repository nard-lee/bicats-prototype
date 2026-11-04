// The people this demo barangay is staffed with, in one place so the rosters
// the site publishes and the logins the office signs in with never disagree.
// The complaint seeder writes these into the settings row and the Lupon table;
// the user seeder gives every one of them a staff account.

// RA 7160 §399(a): the lupon is the Punong Barangay as chairman plus ten (10)
// to twenty (20) members, so eleven residents sit on this one. Any person
// residing or working in the barangay may be appointed (§399(b)) — holding
// another barangay position is not a disqualification, which is why three
// Kagawad below also appear here. The names are fake.
export const LUPON_DEMO_MEMBERS = [
  { fullName: "Elena Bautista", contact: "0917 555 0101" },
  { fullName: "Ramon Salazar", contact: "0917 555 0102" },
  { fullName: "Cecilia Dizon", contact: "0917 555 0103" },
  { fullName: "Ferdinand Ocampo", contact: "0917 555 0104" },
  { fullName: "Gloria Villanueva", contact: "0917 555 0105" },
  { fullName: "Nestor Aquino", contact: "0917 555 0106" },
  { fullName: "Marisol Del Rosario", contact: "0917 555 0107" },
  { fullName: "Danilo Mendoza", contact: "0917 555 0108" },
  { fullName: "Rowena Villamor", contact: "0917 555 0109" },
  { fullName: "Alfredo Tan", contact: "0917 555 0110" },
  { fullName: "Teresa Bagtas", contact: "0917 555 0111" },
];

// The Sangguniang Barangay as the public site lists it: PB, Vice PB, seven
// Kagawad, and the SK Chairperson.
export const BARANGAY_DEMO_OFFICIALS = [
  "Hon. Mario D. Santos — Punong Barangay",
  "Hon. Reynaldo Rivera — Vice Punong Barangay",
  "Hon. Lorna Villanueva — Kagawad",
  "Hon. Ernesto Del Rosario — Kagawad",
  "Hon. Maricel Bautista — Kagawad",
  "Hon. Alfredo Tan — Kagawad",
  "Hon. Daisy Mendoza — Kagawad",
  "Hon. Ramon Salazar — Kagawad",
  "Hon. Cecilia Dizon — Kagawad",
  "Hon. Kristine Alegre — SK Chairperson",
];

// Appointed, not elected, so she is not on the published roster — but §403
// makes the barangay secretary the secretary of the lupon as well, and she is
// the one who keeps the records of every mediation and conciliation.
export const DEMO_SECRETARY = {
  fullName: "Hon. Milagros Fernandez",
  position: "Barangay Secretary",
};
