import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {MainTabNavigationProp} from '../../navigation/navigationTypes';

type SearchMethod = {
  icon: string;
  title: string;
  description: string;
  action: string;
  tab?: keyof {ScanTab: undefined; PhotoTab: undefined};
};

const SEARCH_METHODS: SearchMethod[] = [
  {
    icon: '📷',
    title: 'Scan a Barcode',
    description: 'Point your camera at any product barcode to instantly see its allergen information.',
    action: 'Tap the Scan tab at the bottom of the screen.',
    tab: 'ScanTab',
  },
  {
    icon: '🖼️',
    title: 'Photograph a Label',
    description: 'Take a photo of an ingredient label and we\'ll extract the allergen information for you.',
    action: 'Tap the Photo tab at the bottom of the screen.',
    tab: 'PhotoTab',
  },
  {
    icon: '🔍',
    title: 'Search by Name',
    description: 'Type a product name, brand, or ingredient to search our database.',
    action: 'Use the search bar below and select Products.',
  },
  {
    icon: '🍽️',
    title: 'Search Restaurants',
    description: 'Look up a restaurant by name to browse their menu allergen information.',
    action: 'Use the search bar below and select Restaurants.',
  },
];

export function TextSearchScreen() {
  const navigation = useNavigation<MainTabNavigationProp>();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>How can we help?</Text>
      <Text style={styles.subheading}>
        Choose one of the methods below to look up allergen information.
      </Text>

      {SEARCH_METHODS.map(method => (
        <TouchableOpacity
          key={method.title}
          style={styles.card}
          activeOpacity={method.tab ? 0.7 : 1}
          onPress={() => {
            if (method.tab) {
              navigation.navigate(method.tab as any);
            }
          }}>
          <View style={styles.cardHeader}>
            <Text style={styles.icon}>{method.icon}</Text>
            <Text style={styles.cardTitle}>{method.title}</Text>
          </View>
          <Text style={styles.cardDescription}>{method.description}</Text>
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>{method.action}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.searchPlaceholder}>
        <Text style={styles.searchPlaceholderText}>
          Search bar coming soon — tap Scan or Photo tabs above to get started.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heading: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  actionRow: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  searchPlaceholder: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
    alignItems: 'center',
  },
  searchPlaceholderText: {
    fontSize: fontSizes.sm,
    color: colors.textDisabled,
    textAlign: 'center',
  },
});
