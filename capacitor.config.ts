/// <reference types="@capawesome/capacitor-android-edge-to-edge-support" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'OnwiV2',
  webDir: 'www',
  plugins: {
    EdgeToEdge: {
      backgroundColor: '#00000000'
    }
  },
};

export default config;
