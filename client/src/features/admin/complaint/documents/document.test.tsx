import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/I18n";
import type { BarangaySettings } from "@/features/admin/setting/loader";
import type { ComplaintDetail } from "../view/loader";
import type { DocumentLoaderData, PrintableType } from "./loader";

const mocks = vi.hoisted(() => ({ doc: "summons" }));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: () => ({ id: "7", doc: mocks.doc }),
    useLoaderData: () => loaderData,
  };
});

import ComplaintDocument from "./document";

// One sitting booked ahead, and one already-held sitting buried in the
// history: the papers must call the parties to the booked one.
const bookedAt = "2026-11-20T09:00:00.000Z";
const heldAt = "2026-11-05T09:00:00.000Z";

const complaint: ComplaintDetail = {
  id: 7,
  reference: "26-11-0007",
  prevId: null,
  nextId: null,
  complainantName: "Juan Dela Cruz",
  respondentName: "Pedro Reyes",
  complaintType: "type1",
  complaintTypeOther: null,
  status: "conciliation",
  createdAt: "2026-11-01T01:00:00.000Z",
  dueAt: "2026-12-01T01:00:00.000Z",
  nextHearingAt: bookedAt,
  nextHearingKind: "conciliation",
  description: "Loud videoke until past midnight.",
  eligibilityStatus: "eligible",
  eligibilityAnswers: null,
  eligibilityNotes: null,
  eligibilityReason: null,
  eligibilityReviewedAt: "2026-11-01T02:00:00.000Z",
  pangkatMembers: [
    { id: 1, fullName: "Ana Cruz", isChairman: true },
    { id: 2, fullName: "Ben Torres", isChairman: false },
  ],
  pangkatChairman: "Ana Cruz",
  arbitrationBy: null,
  arbitrationAgreementAt: null,
  evidence: [],
  serviceRecords: [
    {
      id: 3,
      servedAt: "2026-11-02T03:00:00.000Z",
      serverName: "Sgt. Rudy Mendoza",
      result: "received",
      notes: null,
      createdBy: "Staff One",
      createdAt: "2026-11-02T03:30:00.000Z",
    },
  ],
  history: [
    {
      kind: "status",
      status: "mediation",
      date: heldAt,
      by: "Staff One",
      hearingAt: heldAt,
    },
  ],
  hearings: [],
  complainantAge: 34,
  complainantPurok: "Session Road",
  complainantContact: "0917 123 4567",
  complainantAddress: "12 Mabini Street",
  respondentAddress: "14 Rizal Street, Purok 3",
  relationship: "Neighbor",
  incidentAt: "2026-10-31T20:00:00.000Z",
  incidentPlace: "Purok 2 covered court",
};

const settings = {
  barangayName: "Barangay Sto. Niño",
  city: "City of Baguio",
  province: "Benguet",
  punongBarangay: "Alfredo Bautista",
  punongTitle: "Punong Barangay",
  secretaryName: "Carmen Villanueva",
  secretaryTitle: "Barangay Secretary",
  logoUrl: "",
  punongSignatureUrl: "",
  secretarySignatureUrl: "",
  documentOfficeLine: "Office of the Lupong Tagapamayapa",
} as BarangaySettings;

const loaderData: DocumentLoaderData = {
  complaint,
  settings,
  generatedAt: "2026-11-09T04:00:00.000Z",
  generatedBy: "Staff One",
};

function renderDoc(doc: PrintableType) {
  cleanup();
  mocks.doc = doc;
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <ComplaintDocument />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { dateStyle: "long" });

describe("Katarungang Pambarangay papers", () => {
  it("calls the parties to the booked sitting, not to a session already held", () => {
    renderDoc("summons");

    expect(screen.getAllByText(longDate(bookedAt)).length).toBeGreaterThan(0);
    expect(screen.queryByText(longDate(heldAt))).toBeNull();
  });

  it("states the respondent's own address and never the complainant's purok", () => {
    renderDoc("summons");

    expect(screen.getByText("14 Rizal Street, Purok 3")).toBeTruthy();
    expect(screen.queryByText("Session Road")).toBeNull();
  });

  it("carries a caption and the registry stamp on every paper", () => {
    renderDoc("summons");
    expect(screen.getByText("In the Matter of:")).toBeTruthy();
    expect(screen.getByText("-versus-")).toBeTruthy();
    expect(screen.getAllByText("26-11-0007").length).toBeGreaterThan(1);
    expect(screen.getByText(/^Doc\. No\./)).toBeTruthy();

    renderDoc("cfa");
    expect(screen.getByText(/^Doc\. No\./)).toBeTruthy();
    expect(screen.getByText(/^Page No\./)).toBeTruthy();
    expect(screen.getByText("Series of 2026")).toBeTruthy();

    // The case summary is a record of the file, not one of the KP papers.
    renderDoc("summary");
    expect(screen.queryByText("In the Matter of:")).toBeNull();
    expect(screen.queryByText(/^Doc\. No\./)).toBeNull();
  });

  it("prints its own service acknowledgement on the served papers", () => {
    renderDoc("summons");

    expect(screen.getByText("Service Acknowledgement")).toBeTruthy();
    expect(screen.getByText(/Served by Sgt\. Rudy Mendoza/)).toBeTruthy();
  });

  it("marks the proceeding the session was booked for", () => {
    renderDoc("notice");

    expect(
      screen.getByText("☐ Mediation before the Punong Barangay"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "☒ Conciliation or arbitration before the Pangkat ng Tagapagkasundo",
      ),
    ).toBeTruthy();
  });

  it("warns of the consequence of non-appearance with the section cited", () => {
    renderDoc("summons");

    expect(screen.getByText(/Sections 408 to 412 of Republic Act No\. 7160/)).toBeTruthy();
  });

  it("opens the settlement with the standard preamble and signs the pangkat", () => {
    renderDoc("settlement");

    expect(screen.getByText("KNOW ALL MEN BY THESE PRESENTS:")).toBeTruthy();
    expect(screen.getByText("Ben Torres")).toBeTruthy();
    expect(screen.getAllByText("Pangkat Member").length).toBe(1);
    expect(screen.getByText("Terms and Conditions of Settlement")).toBeTruthy();
  });

  it("certifies a CFA from the officer who heard the case, and offers the non-appearance ground", () => {
    renderDoc("cfa");

    expect(
      screen.getByText(/Certified by: Chairman, Pangkat ng Tagapagkasundo/),
    ).toBeTruthy();
    expect(screen.getByText(/Noted by: Barangay Secretary/)).toBeTruthy();
    expect(screen.queryByText(/Attested by/)).toBeNull();
    expect(
      screen.getByText(/A party failed to appear despite due summons/),
    ).toBeTruthy();
  });

  it("repeats the case line on every sheet a record spills onto", () => {
    renderDoc("summons");

    expect(screen.getByText("26-11-0007 — Summons")).toBeTruthy();
  });

  it("keeps a signature row whole on one sheet", () => {
    renderDoc("settlement");

    const attested = screen
      .getByText(/Attested by: Chairman, Pangkat ng Tagapagkasundo/)
      .closest("div.flex");
    expect(attested?.className).toContain("break-inside-avoid");
  });

  it("offers the language dropdown on the sheet itself", () => {
    renderDoc("notice");

    const switcher = screen.getByRole("combobox", { name: "Language" });
    expect(switcher).toBeTruthy();
    expect(switcher.textContent).toContain("English");
  });

  it("prints in Tagalog when the app language is Tagalog", () => {
    localStorage.setItem("lang", "tl");
    renderDoc("notice");

    expect(screen.getByText("Abiso ng Paglitaw")).toBeTruthy();
    expect(screen.getByText(/Kayo ay abisahang lumitaw/)).toBeTruthy();
    expect(screen.getByText("Sa isyu ng:")).toBeTruthy();
    expect(screen.getByText("Numero ng kaso")).toBeTruthy();
    expect(screen.getByText(/^Sunod ng taon/)).toBeTruthy();
    expect(screen.queryByText(/You are hereby notified/)).toBeNull();

    localStorage.removeItem("lang");
  });
});
