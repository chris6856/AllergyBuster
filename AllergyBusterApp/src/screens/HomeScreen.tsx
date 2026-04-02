import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {TipCard} from '../components/TipCard';
import {useDailyTip} from '../hooks/useDailyTip';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {NoNetworkBanner} from '../components/NoNetworkBanner';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {MainTabNavigationProp} from '../navigation/navigationTypes';

type QuickAction = {
  icon: string;
  label: string;
  description: string;
  tab: 'ScanTab' | 'PhotoTab' | 'SearchTab';
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: '📷',
    label: 'Scan Barcode',
    description: 'Instant allergen lookup from a product barcode',
    tab: 'ScanTab',
  },
  {
    icon: '🔍',
    label: 'Scan Label',
    description: 'Photograph an ingredient list and extract allergens',
    tab: 'PhotoTab',
  },
  {
    icon: '🛒',
    label: 'Search Products',
    description: 'Look up packaged foods by name, brand or ingredient',
    tab: 'SearchTab',
  },
];

export function HomeScreen() {
  const navigation = useNavigation<MainTabNavigationProp>();
  const {isConnected} = useNetworkStatus();
  const {data: tip, isLoading: tipLoading} = useDailyTip();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {!isConnected && <NoNetworkBanner />}

      {/* Hero header */}
      <View style={styles.hero}>
        <Text style={styles.appName}>AllergyBuster</Text>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.tagline}>
          Know what's in your food — before you eat it.
        </Text>
      </View>

      {/* Daily tip */}
      <View style={styles.section}>
        <TipCard text={tip?.text} isLoading={tipLoading} />
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        {QUICK_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.tab}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.tab)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={action.label}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>{action.icon}</Text>
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Disclaimer footer */}
      <Text style={styles.disclaimer}>
        AllergyBuster provides general information only and is not a substitute
        for medical advice. Always verify allergen information on product
        packaging and consult a healthcare professional regarding your specific
        dietary needs.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  appName: {
    fontSize: fontSizes.xxxl,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: fontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionHeading: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionIconText: {
    fontSize: 26,
  },
  actionBody: {
    flex: 1,
  },
  actionLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionChevron: {
    fontSize: 22,
    color: colors.textDisabled,
    marginLeft: spacing.sm,
  },
  disclaimer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
