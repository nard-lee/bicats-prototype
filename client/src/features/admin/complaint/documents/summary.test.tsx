import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LanguageProvider } from '@/lib/I18n'
import type { ComplaintDetail } from '../view/loader'
import CaseSummaryReport from './summary'

const complaint: ComplaintDetail = {
  id: 7,
  reference: '26-11-0007',
  prevId: null,
  nextId: null,
  complainantName: 'Juan Dela Cruz',
  respondentName: 'Pedro Reyes',
  complaintType: 'type1',
  complaintTypeOther: null,
  status: 'conciliation',
  createdAt: '2026-11-01T01:00:00.000Z',
  dueAt: '2026-12-01T01:00:00.000Z',
  nextHearingAt: null,
  nextHearingKind: null,
  description: 'Loud videoke until past midnight.',
  eligibilityStatus: 'eligible',
  eligibilityAnswers: {
    respondentResidency: 'same_barangay',
    adjoiningAgreement: null,
    againstGovernment: 'no',
    seriousOffenseOrVawc: 'no',
    propertyOutsideCity: 'not_applicable',
    propertyAgreement: null,
  },
  eligibilityNotes: null,
  eligibilityReason: null,
  eligibilityReviewedAt: '2026-11-01T02:00:00.000Z',
  pangkatMembers: [
    { id: 1, fullName: 'Ana Cruz', isChairman: true },
    { id: 2, fullName: 'Ben Torres', isChairman: false },
  ],
  pangkatChairman: 'Ana Cruz',
  evidence: [
    { originalName: 'receipt.jpg', url: '/uploads/receipt.jpg', mimeType: 'image/jpeg', size: 1024 },
  ],
  serviceRecords: [
    {
      id: 3,
      servedAt: '2026-11-02T03:00:00.000Z',
      serverName: 'Sgt. Rudy Mendoza',
      result: 'refused',
      notes: 'Refused to sign.',
      createdBy: 'Staff One',
      createdAt: '2026-11-02T03:30:00.000Z',
    },
  ],
  history: [],
  hearings: [
    {
      id: 11,
      scheduledAt: '2026-11-05T09:00:00.000Z',
      kind: 'mediation',
      status: 'completed',
      location: 'Barangay Hall',
      outcome: 'No settlement reached.',
      complainantAttendance: 'present',
      respondentAttendance: 'absent',
      attendanceNotes: null,
    },
  ],
  complainantAge: 34,
  complainantPurok: 'Session Road',
  complainantContact: '0917 123 4567',
  complainantAddress: '12 Mabini Street',
  respondentAddress: 'Purok 3',
  relationship: 'Neighbor',
  incidentAt: '2026-10-31T20:00:00.000Z',
  incidentPlace: 'Purok 2 covered court',
}

function renderReport() {
  return render(
    <LanguageProvider>
      <CaseSummaryReport
        complaint={complaint}
        generatedAt="2026-11-04T05:00:00.000Z"
        generatedBy="Barangay Secretary"
      />
    </LanguageProvider>,
  )
}

describe('CaseSummaryReport', () => {
  it('prints every section of the record', () => {
    renderReport()

    for (const heading of [
      'Parties and complaint as filed',
      'Eligibility screening',
      'Status history',
      'Proof of service',
      'Proceedings',
      'Pangkat constituted for this case',
      'Arbitration agreement and award',
      'Stage deadline',
      'Evidence listed on file',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    }
  })

  it('shows the filed details, the proceedings, and the confidentiality footer', () => {
    renderReport()

    expect(screen.getByText('26-11-0007')).toBeTruthy()
    expect(screen.getByText('Juan Dela Cruz')).toBeTruthy()
    expect(screen.getByText('Pedro Reyes')).toBeTruthy()
    expect(screen.getByText('Loud videoke until past midnight.')).toBeTruthy()
    expect(screen.getByText('No settlement reached.')).toBeTruthy()
    expect(screen.getByText('Sgt. Rudy Mendoza')).toBeTruthy()
    expect(screen.getByText('receipt.jpg')).toBeTruthy()
    expect(
      screen.getByText(/is not a Certificate to File Action/),
    ).toBeTruthy()
  })

  it('marks a staff-only note as internal and never leaves it unlabeled', () => {
    render(
      <LanguageProvider>
        <CaseSummaryReport
          complaint={{
            ...complaint,
            history: [
              {
                kind: 'status',
                status: 'conciliation',
                date: '2026-11-03T04:00:00.000Z',
                by: 'Staff One',
                publicNote: 'The parties were notified.',
                internalNote: 'Respondent works nights.',
              },
              {
                kind: 'status',
                status: 'received',
                date: '2026-11-01T01:00:00.000Z',
                by: 'System',
              },
            ],
          }}
          generatedAt="2026-11-04T05:00:00.000Z"
          generatedBy="Barangay Secretary"
        />
      </LanguageProvider>,
    )

    expect(screen.getByText('The parties were notified.')).toBeTruthy()
    expect(screen.getByText('[Internal]')).toBeTruthy()
    expect(screen.getByText(/Respondent works nights\./)).toBeTruthy()
    // The oldest row has no predecessor, so its "from" cell reads as filing.
    expect(screen.getByText('At filing')).toBeTruthy()
  })
})
