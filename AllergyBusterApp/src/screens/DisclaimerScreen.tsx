import React, {useEffect} from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {spacing} from '../constants/theme';
import {RootNavigationProp} from '../navigation/navigationTypes';

// Save the hero image to src/assets/splash-hero.png
const splashHero = require('../assets/splash-hero.png');

export function DisclaimerScreen() {
  const navigation = useNavigation<RootNavigationProp>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('MainTabs', undefined);
    }, 7000);
    return () => clearTimeout(timer);
  }, [navigation]);

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
          This app provides general allergen information only and does not
          constitute medical advice. Always verify allergen data on product
          packaging or with restaurant staff, and consult your doctor or
          allergist for personalised guidance.
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
