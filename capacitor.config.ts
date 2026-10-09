import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ee.forgr.mondayquest',
  appName: 'Monday Quest',
  webDir: 'dist',
  backgroundColor: '#f6f4ef',
  ios: {
    contentInset: 'never',
    backgroundColor: '#f6f4ef',
  },
  android: {
    backgroundColor: '#f6f4ef',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#f6f4ef',
      showSpinner: false,
    },
    CapacitorUpdater: {
      autoUpdate: true,
      appReadyTimeout: 10000,
      responseTimeout: 20,
    },
    StatusBar: {
      style: 'LIGHT',
      overlaysWebView: true,
    },
  },
}

export default config
