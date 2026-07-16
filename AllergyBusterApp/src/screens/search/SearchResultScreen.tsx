import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import {useProductSearch} from '../../hooks/useProductSearch';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {NoNetworkBanner} from '../../components/NoNetworkBanner';
import {AllergenCard} from '../../components/AllergenCard';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {SearchStackScreenProps} from '../../navigation/navigationTypes';
import {NormalizedProduct} from '../../types/product';
import {searchEstablishments, Establishment} from '../../services/establishmentsService';
import {incrementScanCount} from '../../utils/scanCounter';

type Props = SearchStackScreenProps<'SearchResult'>;

// Rating scale: 5 = completely safe, 1 = avoid. avg >= 4 great, >= 3 ok, < 3 poor.
// Exclude from filtered results when avg < 3 for a selected allergen.

const FILTER_ALLERGENS = [
  {key: 'peanuts',   label: 'Peanuts'},
  {key: 'tree-nuts', label: 'Tree Nuts'},
  {key: 'milk',      label: 'Dairy'},
  {key: 'eggs',      label: 'Eggs'},
  {key: 'wheat',     label: 'Gluten/Wheat'},
  {key: 'soy',       label: 'Soy'},
  {key: 'fish',      label: 'Fish'},
  {key: 'shellfish', label: 'Shellfish'},
  {key: 'sesame',    label: 'Sesame'},
];

export function SearchResultScreen({route}: Props) {
  const {query, mode, location, coords} = route.params;
  const {isConnected} = useNetworkStatus();
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const productQuery = useProductSearch(mode === 'products' ? query : undefined);

  const establishmentsQuery = useQuery({
    queryKey: ['establishments', query, coords, location],
    queryFn: () => searchEstablishments(query, coords, location),
    enabled: mode === 'restaurants',
  });

  const toggleFilter = useCallback((key: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) {next.delete(key);} else {next.add(key);}
      return next;
    });
  }, []);

  const isLoading = mode === 'products' ? productQuery.isLoading : establishmentsQuery.isLoading;
  const isError   = mode === 'products' ? productQuery.isError   : establishmentsQuery.isError;
  const products      = productQuery.data ?? [];
  const allEstablishments = establishmentsQuery.data ?? [];

  const incrementedRef = useRef(false);
  useEffect(() => {
    if (mode === 'products' && !productQuery.isLoading && !productQuery.isError && products.length > 0 && !incrementedRef.current) {
      incrementedRef.current = true;
      incrementScanCount();
    }
  }, [mode, productQuery.isLoading, productQuery.isError, products.length]);

  const establishments =
    activeFilters.size === 0
      ? allEstablishments
      : allEstablishments.filter(e => {
          for (const key of activeFilters) {
            const r = e.allergenRatings?.[key];
            if (r && r.avg < 3) {return false;}
          }
          return true;
        });

  return (
    <View style={styles.container}>
      {!isConnected && <NoNetworkBanner />}

      <Text style={styles.queryLine}>
        Results for <Text style={styles.queryBold}>"{query}"</Text>
      </Text>

      {/* Allergen filter chips — restaurants only */}
      {mode === 'restaurants' && !isLoading && !isError && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by allergen:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}>
            {FILTER_ALLERGENS.map(a => {
              const active = activeFilters.has(a.key);
              return (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleFilter(a.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: active}}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {activeFilters.size > 0 && (
            <Text style={styles.filterHint}>
              Showing places rated safe for your selected allergens
              {allEstablishments.length !== establishments.length
                ? ` · ${allEstablishments.length - establishments.length} hidden`
                : ''}
            </Text>
          )}
        </View>
      )}

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      )}

      {!isLoading && isError && (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>
            Something went wrong. Please check your connection and try again.
          </Text>
        </View>
      )}

      {!isLoading && !isError && mode === 'products' && (
        <FlatList
          data={products}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={
            products.length === 0 ? styles.emptyContainer : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyBody}>
                Try a different spelling, brand name, or search by ingredient.
              </Text>
            </View>
          }
          renderItem={({item}) => <ProductRow product={item} />}
        />
      )}

      {!isLoading && !isError && mode === 'restaurants' && (
        <FlatList
          data={establishments}
          keyExtractor={item => item.id}
          contentContainerStyle={
            establishments.length === 0 ? styles.emptyContainer : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>No restaurants found</Text>
              <Text style={styles.emptyBody}>
                {activeFilters.size > 0
                  ? 'No rated-safe restaurants found for your selected allergens. Try clearing some filters.'
                  : 'Try a different name, or use your location to find nearby restaurants.'}
              </Text>
            </View>
          }
          renderItem={({item}) => (
            <EstablishmentRow establishment={item} activeFilters={activeFilters} />
          )}
        />
      )}
    </View>
  );
}

// --- Product row ---

function ProductRow({product}: {product: NormalizedProduct}) {
  const hasDeclared = product.allergens.declared.length > 0;
  const hasTraces = product.allergens.traces.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>🛒</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {product.name}
          </Text>
          {product.brand ? (
            <Text style={styles.cardSubtitle}>{product.brand}</Text>
          ) : null}
        </View>
      </View>

      {hasDeclared && (
        <View style={styles.allergenRow}>
          <Text style={styles.allergenLabel}>Contains: </Text>
          <View style={styles.allergenTags}>
            {product.allergens.declared.map(name => (
              <AllergenCard key={name} name={name} variant="declared" />
            ))}
          </View>
        </View>
      )}

      {hasTraces && (
        <View style={styles.allergenRow}>
          <Text style={styles.allergenLabel}>May contain: </Text>
          <View style={styles.allergenTags}>
            {product.allergens.traces.map(name => (
              <AllergenCard key={name} name={name} variant="trace" />
            ))}
          </View>
        </View>
      )}

      {!hasDeclared && !hasTraces && (
        <View style={styles.noAllergenRow}>
          <View style={styles.noAllergenIcon}>
            <Text style={styles.noAllergenCheck}>✓</Text>
          </View>
          <Text style={styles.noAllergenText}>No allergens detected — verify on packaging.</Text>
        </View>
      )}

      <Text style={styles.sourceLabel}>
        {product.source === 'openfoodfacts' ? 'Open Food Facts' : 'Edamam'}
      </Text>
    </View>
  );
}

// --- Establishment row ---

function ratingColor(avg: number): string {
  if (avg >= 4) {return '#16a34a';}  // green — safe
  if (avg >= 3) {return '#d97706';}  // amber — ok
  return '#dc2626';                   // red — avoid
}

function ratingLabel(avg: number): string {
  if (avg >= 4) {return 'Safe';}
  if (avg >= 3) {return 'Mixed';}
  return 'Avoid';
}

function EstablishmentRow({
  establishment: e,
  activeFilters,
}: {
  establishment: Establishment;
  activeFilters: Set<string>;
}) {
  const navigation = useNavigation<Props['navigation']>();

  const handleChainDetail = () => {
    if (!e.matchedChain) {return;}
    const chain = e.matchedChain;
    navigation.navigate('RestaurantDetail', {
      restaurant: {
        id: chain.id,
        name: chain.name,
        address: e.address || undefined,
        cuisineType: chain.cuisineType,
        source: 'local',
        sourceUrl: e.allergenUrl || chain.sourceUrl,
        menuItems: chain.menuItems.map((item, idx) => ({
          id: `${chain.id}-${idx}`,
          name: item.name,
          description: item.description,
          allergens: item.allergens,
        })),
      },
    });
  };

  const handleAllergenUrl = () => {
    if (e.allergenUrl) {Linking.openURL(e.allergenUrl);}
    else if (e.website) {Linking.openURL(e.website);}
  };

  const handleGoogleSearch = () => {
    Linking.openURL(
      `https://www.google.com/search?q=${encodeURIComponent(e.name + ' allergen menu')}`,
    );
  };

  // Decide which allergen pills to show: active filters first, then any rated allergens
  const ratedKeys = Object.keys(e.allergenRatings ?? {});
  const pillKeys =
    activeFilters.size > 0
      ? [...activeFilters]
      : ratedKeys;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>🍽️</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{e.name}</Text>
            {e.matchedChain && (
              <View style={styles.chainBadge}>
                <Text style={styles.chainBadgeText}>Menu Data</Text>
              </View>
            )}
          </View>
          {e.address ? (
            <Text style={styles.cardSubtitle} numberOfLines={2}>{e.address}</Text>
          ) : null}
          <View style={styles.metaRow}>
            {e.googleRating ? (
              <Text style={styles.ratingText}>⭐ {e.googleRating.toFixed(1)} ({e.googleRatingCount})</Text>
            ) : null}
            {e.isOpen !== null ? (
              <Text style={[styles.openText, e.isOpen ? styles.openGreen : styles.openRed]}>
                {e.isOpen ? '● Open' : '● Closed'}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Community allergen rating pills */}
      {pillKeys.length > 0 && (
        <View style={styles.pillSection}>
          <Text style={styles.pillSectionLabel}>Community Ratings</Text>
          <View style={styles.pillRow}>
            {pillKeys.map(key => {
              const r = e.allergenRatings?.[key];
              const allergenDisplay = FILTER_ALLERGENS.find(a => a.key === key)?.label ?? key;
              if (!r) {
                return (
                  <View key={key} style={[styles.pill, styles.pillUnrated]}>
                    <Text style={styles.pillTextUnrated}>{allergenDisplay}: unrated</Text>
                  </View>
                );
              }
              const color = ratingColor(r.avg);
              return (
                <View key={key} style={[styles.pill, {backgroundColor: color + '18', borderColor: color + '60'}]}>
                  <Text style={[styles.pillText, {color}]}>
                    {allergenDisplay}: {ratingLabel(r.avg)} ★{r.avg.toFixed(1)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {ratedKeys.length === 0 && activeFilters.size === 0 && (
        <Text style={styles.noRatings}>No community ratings yet</Text>
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {e.matchedChain ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleChainDetail}
            accessibilityRole="button">
            <Text style={styles.primaryBtnText}>View Full Menu Allergens →</Text>
          </TouchableOpacity>
        ) : (e.allergenUrl || e.website) ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleAllergenUrl}
            accessibilityRole="button">
            <Text style={styles.primaryBtnText}>View Allergen Info →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleGoogleSearch}
            accessibilityRole="button">
            <Text style={styles.secondaryBtnText}>Search allergen menu online →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  queryLine: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  queryBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  filterSection: {
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  filterChips: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterHint: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    padding: spacing.md,
  },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
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
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardIconText: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  chainBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chainBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  openText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  openGreen: {
    color: colors.primary,
  },
  openRed: {
    color: '#B45309',
  },
  pillSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pillSectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillUnrated: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pillTextUnrated: {
    fontSize: 11,
    color: colors.textDisabled,
  },
  noRatings: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
  actionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryBtn: {
    // no background — link style
  },
  primaryBtnText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  secondaryBtn: {
    // no background — muted link style
  },
  secondaryBtnText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Product row styles
  allergenRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  allergenLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginRight: spacing.xs,
  },
  allergenTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  noAllergenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  noAllergenIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noAllergenCheck: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '700',
    lineHeight: 15,
  },
  noAllergenText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  sourceLabel: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
  },
});
