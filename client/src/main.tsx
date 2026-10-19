import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import { RouterProvider } from 'react-router'
import router from './router/routes.tsx'
import { LanguageProvider } from './lib/I18n.tsx'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from './components/ui/tooltip.tsx'
import { Toaster } from 'sonner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster/>
          <RouterProvider router={router} />
        </TooltipProvider>
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>
)