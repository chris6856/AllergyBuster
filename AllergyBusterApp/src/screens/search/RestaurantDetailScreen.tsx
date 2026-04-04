import React from 'react';
import {
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {AllergenCard} from '../../components/AllergenCard';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {SearchStackScreenProps} from '../../navigation/navigationTypes';
import {MenuItem} from '../../types/restaurant';

type Props = SearchStackScreenProps<'RestaurantDetail'>;

export function RestaurantDetailScreen({route}: Props) {
  const {restaurant} = route.params;
  const {name, address, cuisineType, menuItems, source} = restaurant;

  return (
    <FlatList
      style={styles.container}
      data={menuItems}
      keyExtractor={item => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={
        menuItems.length === 0 ? styles.emptyContainer : styles.listContent
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>🍽️</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{name}</Text>
            {address ? (
              <Text style={styles.headerMeta}>{address}</Text>
            ) : null}
            {cuisineType ? (
              <Text style={styles.headerMeta}>{cuisineType}</Text>
            ) : null}
            <Text style={styles.sourceLabel}>
              {source === 'openmenu' ? 'OpenMenu' : 'Yelp'}
            </Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyInner}>
          <Text style={styles.emptyIcon}>ℹ️</Text>
          <Text style={styles.emptyTitle}>Allergen data not available</Text>
          <Text style={styles.emptyBody}>
            Restaurants are not required to publish allergen information
            digitally, and most don't provide it through third-party services.
          </Text>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>What to do instead</Text>
            <Text style={styles.tipItem}>📞  Call the restaurant and ask to speak with a manager or chef about your specific allergens</Text>
            <Text style={styles.tipItem}>🌐  Check the restaurant's own website — many chains publish full allergen menus</Text>
            <Text style={styles.tipItem}>📋  When you arrive, ask for a printed allergen menu or ingredient list</Text>
            <Text style={styles.tipItem}>⚠️  Always mention your allergy when ordering, even if you've eaten there before</Text>
          </View>

          {name ? (
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/search?q=${encodeURIComponent(name + ' allergen menu')}`,
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`Search online for ${name} allergen menu`}>
              <Text style={styles.searchButtonText}>
                🔍  Search "{name}" allergen menu online
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      }
      renderItem={({item}) => <MenuItemRow item={item} />}
    />
  );
}

function MenuItemRow({item}: {item: MenuItem}) {
  const {name, description, allergens} = item;
  const hasDeclared = allergens.declared.length > 0;
  const hasMayContain = allergens.mayContain.length > 0;
  const noData = !allergens.dataAvailable;

  return (
    <View style={styles.card}>
      <Text style={styles.itemName}>{name}</Text>

      {description ? (
        <Text style={styles.itemDescription} numberOfLines={2}>
          {description}
        </Text>
      ) : null}

      {noData ? (
        <Text style={styles.noDataText}>
          Allergen data not available — ask staff before ordering.
        </Text>
      ) : (
        <>
          {hasDeclared && (
            <View style={styles.allergenSection}>
              <Text style={styles.allergenSectionLabel}>Contains</Text>
              <View style={styles.allergenTags}>
                {allergens.declared.map(a => (
                  <AllergenCard key={a} name={a} variant="declared" />
                ))}
              </View>
            </View>
          )}

          {hasMayContain && (
            <View style={styles.allergenSection}>
              <Text style={styles.allergenSectionLabel}>May Contain</Text>
              <View style={styles.allergenTags}>
                {allergens.mayContain.map(a => (
                  <AllergenCard key={a} name={a} variant="trace" />
                ))}
              </View>
            </View>
          )}

          {!hasDeclared && !hasMayContain && (
            <Text style={styles.clearText}>
              No major allergens listed — verify with staff.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flexGrow: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerIconText: {
    fontSize: 30,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerMeta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sourceLabel: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  tipTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  tipItem: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  searchButtonText: {
    color: colors.white,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  itemName: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  allergenSection: {
    marginTop: spacing.sm,
  },
  allergenSectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  allergenTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noDataText: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.warning,
    fontStyle: 'italic',
  },
  clearText: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
});
