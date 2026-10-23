import { describe, expect, it } from 'vitest'

import { ADMIN_ROLES, CASE_VIEW_ROLES, CASE_WRITE_ROLES, HEARING_ROLES, INTERNAL_ROLES, NOTICE_ROLES, ROLE_LABEL, ROLES, isRole } from './roles'

describe('isRole', () => {
  it('accepts every known role', () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true)
  })

  it('rejects unknown, empty, and differently-cased values', () => {
    expect(isRole('root')).toBe(false)
    expect(isRole('Admin')).toBe(false)
    expect(isRole('')).toBe(false)
    expect(isRole(undefined)).toBe(false)
    expect(isRole(null)).toBe(false)
  })
})

describe('role groups', () => {
  it('keeps every staff group inside the internal roles', () => {
    for (const group of [
      CASE_VIEW_ROLES,
      CASE_WRITE_ROLES,
      HEARING_ROLES,
      NOTICE_ROLES,
      ADMIN_ROLES,
    ]) {
      for (const role of group) expect(INTERNAL_ROLES).toContain(role)
    }
  })

  it('matches the permissions the app relies on', () => {
    expect(CASE_VIEW_ROLES).toEqual(['admin', 'staff', 'secretary', 'lupon'])
    expect(CASE_WRITE_ROLES).toEqual(['admin', 'staff', 'lupon'])
    expect(HEARING_ROLES).toEqual(['admin', 'staff', 'lupon'])
    expect(NOTICE_ROLES).toEqual(['admin', 'staff', 'secretary'])
    expect(ADMIN_ROLES).toEqual(['admin'])
  })
})

describe('ROLE_LABEL', () => {
  it('maps every role to a translation key', () => {
    expect(Object.keys(ROLE_LABEL).sort()).toEqual([...ROLES].sort())
  })
})
