import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.habitly.app',
  appName: 'Habitly',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_habitly',
      iconColor: '#2fb170',
    },
    SplashScreen: {
      launchShowDuration: 300,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
    },
  },
};

export default config;
