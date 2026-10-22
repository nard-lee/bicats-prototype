import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LanguageProvider, useT } from './I18n'

function Probe() {
  const { lang, setLang, t } = useT()

  return (
    <div>
      <p data-testid="lang">{lang}</p>
      <p data-testid="text">{t('navFile')}</p>
      <button type="button" onClick={() => setLang('tl')}>
        switch
      </button>
    </div>
  )
}

function renderProbe() {
  return render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  )
}

describe('LanguageProvider', () => {
  it('starts in English and switches to Tagalog', () => {
    renderProbe()

    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('text').textContent).toBe('File a Complaint')

    fireEvent.click(screen.getByRole('button', { name: 'switch' }))

    expect(screen.getByTestId('lang').textContent).toBe('tl')
    expect(screen.getByTestId('text').textContent).toBe('Maghain ng Reklamo')
    expect(localStorage.getItem('lang')).toBe('tl')
    expect(document.documentElement.lang).toBe('tl')
  })

  it('restores a saved language', () => {
    localStorage.setItem('lang', 'tl')
    renderProbe()

    expect(screen.getByTestId('lang').textContent).toBe('tl')
    expect(screen.getByTestId('text').textContent).toBe('Maghain ng Reklamo')
  })

  it('falls back to English for an unknown saved value', () => {
    localStorage.setItem('lang', 'fr')
    renderProbe()

    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})

describe('useT', () => {
  it('throws outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useT())).toThrow('useT must be used inside <LanguageProvider>')

    spy.mockRestore()
  })
})
