/**
 * Helper to convert HEX to HSL values that can be used in Tailwind CSS variables
 */
export function hexToHslValues(hex: string): { h: number; s: number; l: number } {
  // Remove hash if present
  hex = hex.replace(/^#/, '')

  // Parse r, g, b
  let r = 0, g = 0, b = 0
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16)
    g = parseInt(hex.substring(2, 4), 16)
    b = parseInt(hex.substring(4, 6), 16)
  }

  // Convert to 0-1 range
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Generates an object with Tailwind shades (50-900) CSS variables content based on a base HSL color.
 * We'll use a simplified lightness mapping based on the base color.
 */
export function generateBrandShadesCss(baseColorHex: string): string {
  const { h, s, l } = hexToHslValues(baseColorHex)
  
  // A simple mapping of how Lightness should vary across the 50-900 scale.
  // Tailwind 500 is the base color.
  // This is a naive adjustment, assuming the user's color is a standard mid-tone (like 500).
  const shades = {
    50: 96,
    100: 92,
    200: 84,
    300: 76,
    400: 62,
    500: l, // the exact color the user picked
    600: Math.max(l - 12, 10),
    700: Math.max(l - 24, 10),
    800: Math.max(l - 36, 10),
    900: Math.max(l - 48, 10),
  }

  let cssStr = ''
  for (const [shade, lightness] of Object.entries(shades)) {
    cssStr += `--color-brand-${shade}: ${h} ${s}% ${lightness}%;\n`
  }
  
  return cssStr
}
