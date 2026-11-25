import {Platform} from 'react-native';

// Shown in the Home screen footer. Update together with versionName/versionCode
// (android/app/build.gradle) and MARKETING_VERSION/CURRENT_PROJECT_VERSION (iOS)
// on every release bump. Build numbers can differ per platform: Play never
// accepts a versionCode twice, so an Android-only rebuild needs a new one.
export const APP_VERSION = '1.3.0';
export const BUILD_NUMBER = Platform.select({ios: 42, android: 42, default: 42});
