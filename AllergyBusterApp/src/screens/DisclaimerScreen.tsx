import React, {useEffect, useRef} from 'react';
import {
  BackHandler,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {spacing} from '../constants/theme';
import {RootNavigationProp} from '../navigation/navigationTypes';
import {ONBOARDING_VERSION} from './OnboardingScreen';

const splashHero = require('../assets/splash-hero.png');

export function DisclaimerScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  // Where the splash goes next: full onboarding (new users), "What's new"
  // (returning users who haven't seen this version's slides) or the app.
  const nextRoute = useRef<{name: 'Onboarding' | 'MainTabs'; whatsNew?: boolean}>({name: 'MainTabs'});

  useEffect(() => {
    // Resolve destination during the splash so there's no delay after the timer.
    AsyncStorage.multiGet(['onboardingSeen', 'onboardingVersion']).then(([[, seen], [, version]]) => {
      if (seen !== 'true') {
        nextRoute.current = {name: 'Onboarding'};
      } else if (version !== ONBOARDING_VERSION) {
        nextRoute.current = {name: 'Onboarding', whatsNew: true};
      } else {
        nextRoute.current = {name: 'MainTabs'};
      }
    });

    const timer = setTimeout(() => {
      const next = nextRoute.current;
      if (next.name === 'Onboarding') {
        navigation.replace('Onboarding', {whatsNew: next.whatsNew});
      } else {
        navigation.replace('MainTabs', undefined);
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [navigation]);

  // Prevent Android back button from closing the app during splash
  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  return (
    <View style={styles.container}>
      {/* Green top section */}
      <View style={styles.top}>
        <Text style={styles.appName}>AllergyBuster</Text>
        <Text style={styles.tagline}>What can we look up for you today?</Text>
      </View>

      {/* Hero image */}
      <ImageBackground
        source={splashHero}
        style={styles.hero}
        resizeMode="contain"
        accessibilityLabel="AllergyBuster superhero mascot"
      />

      {/* Welcome message + disclaimer */}
      <View style={styles.bottom}>
        <Text style={styles.welcome}>
          Welcome to AllergyBuster — here to help keep you safe.
        </Text>

        <Text style={styles.disclaimer}>
          AllergyBuster provides general information about allergens and
          ingredients in foods, personal care and household products. It is
          not medical advice and does not certify any product as safe. Always
          verify on the package label or with restaurant staff, and consult
          your doctor or allergist for personalised guidance.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E7D32',
  },
  top: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  hero: {
    flex: 1,
    width: '100%',
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  welcome: {
    fontSize: 25,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: spacing.md,
  },
  disclaimer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
    textAlign: 'center',
  },
});
