import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {fontSizes, spacing} from '../constants/theme';
import {RootNavigationProp} from '../navigation/navigationTypes';

export function DisclaimerScreen() {
  const navigation = useNavigation<RootNavigationProp>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('MainTabs', undefined);
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.appName}>AllergyBuster</Text>

        <Text style={styles.welcome}>
          Welcome to AllergyBuster — your own personal assistant helping to
          keep you safe and your EpiPen in your pocket where it belongs.
        </Text>

        <Text style={styles.tagline}>What can we look up for you today?</Text>
      </View>

      <Text style={styles.disclaimer}>
        This app provides general allergen information only and does not
        constitute medical advice. Always verify allergen data on product
        packaging or with restaurant staff, and consult your doctor or
        allergist for personalised guidance.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E7D32',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  appName: {
    fontFamily: 'sans-serif',
    fontSize: fontSizes.xxxl,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xl,
    letterSpacing: 1,
  },
  welcome: {
    fontFamily: 'sans-serif',
    fontSize: fontSizes.xl,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 32,
    marginBottom: spacing.lg,
  },
  tagline: {
    fontFamily: 'sans-serif',
    fontSize: fontSizes.lg,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
  },
  disclaimer: {
    fontFamily: 'sans-serif',
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 16,
    textAlign: 'center',
  },
});
