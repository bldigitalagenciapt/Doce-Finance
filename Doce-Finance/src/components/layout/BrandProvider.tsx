'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { generateBrandShadesCss } from '@/lib/colorUtils'

export function BrandProvider() {
  const profile = useAppStore((s) => s.profile)
  const [css, setCss] = useState('')

  useEffect(() => {
    if (profile?.brand_color) {
      const generated = generateBrandShadesCss(profile.brand_color)
      setCss(`:root {\n${generated}}`)
    } else {
      setCss('')
    }
  }, [profile?.brand_color])

  if (!css) return null

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
