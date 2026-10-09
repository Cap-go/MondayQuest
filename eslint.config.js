import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  ignores: ['ios/**', 'android/**', 'dist/**', 'public/**', 'site/**', 'src/i18n/static-strings.json'],
}, {
  rules: {
    // `slot="…"` here is the native web-component slot of @capgo/capacitor-transitions elements.
    'vue/no-deprecated-slot-attribute': 'off',
    'node/prefer-global/buffer': 'off',
  },
})
