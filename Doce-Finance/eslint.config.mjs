// eslint-config-next@16 já exporta flat config nativo (array).
// O eslint-plugin-react incluído não é compatível com ESLint 10, então o filtramos.
import nextConfig from 'eslint-config-next'

// Remove o plugin 'react' e as rules 'react/*' de qualquer config que os contenha,
// para evitar o crash "contextOrFilename.getFilename is not a function" do ESLint 10.
const nextConfigWithoutReact = nextConfig.map((c) => {
  const result = { ...c }

  // Remove o plugin react
  if (result.plugins && result.plugins.react) {
    const { react: _react, ...otherPlugins } = result.plugins
    result.plugins = otherPlugins
  }

  // Remove rules que referenciam o plugin react
  if (result.rules) {
    const rules = { ...result.rules }
    for (const key of Object.keys(rules)) {
      if (key.startsWith('react/')) delete rules[key]
    }
    result.rules = rules
  }

  return result
})

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextConfigWithoutReact,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      // react-hooks/set-state-in-effect é uma regra experimental e controversa.
      // setState dentro de useEffect é padrão válido e amplamente usado no React.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]

export default config
