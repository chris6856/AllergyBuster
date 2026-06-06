import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useProductSearch} from '../../hooks/useProductSearch';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {NoNetworkBanner} from '../../components/NoNetworkBanner';
import {AllergenCard} from '../../components/AllergenCard';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {SearchStackScreenProps} from '../../navigation/navigationTypes';
import {NormalizedProduct} from '../../types/product';
import {searchEstablishments, Establishment} from '../../services/establishmentsService';

type Props = SearchStackScreenProps<'SearchResult'>;

export function SearchResultScreen({route}: Props) {
  const {query, mode, location, coords} = route.params;
  const {isConnected} = useNetworkStatus();

  const productQuery = useProductSearch(mode === 'products' ? query : undefined);

  const establishmentsQuery = useQuery({
    queryKey: ['establishments', query, coords, location],
    queryFn: () => searchEstablishments(query, coords, location),
    enabled: mode === 'restaurants',
  });

  const isLoading = mode === 'products' ? productQuery.isLoading : establishmentsQuery.isLoading;
  const isError   = mode === 'products' ? productQuery.isError   : establishmentsQuery.isError;
  const products      = productQuery.data ?? [];
  const establishments = establishmentsQuery.data ?? [];

  return (
    <View style={styles.container}>
      {!isConnected && <NoNetworkBanner />}

      <Text style={styles.queryLine}>
        Results for <Text style={styles.queryBold}>"{query}"</Text>
      </Text>

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
          renderItem={({item}) => (
            <ProductRow product={item} />
          )}
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
                Try a different name, or use your location to find nearby restaurants.
              </Text>
            </View>
          }
          renderItem={({item}) => <EstablishmentRow establishment={item} />}
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
        <Text style={styles.noAllergenText}>
          No major allergens detected — verify on packaging.
        </Text>
      )}

      <Text style={styles.sourceLabel}>
        {product.source === 'openfoodfacts' ? 'Open Food Facts' : 'Edamam'}
      </Text>
    </View>
  );
}

// --- Establishment row ---

function EstablishmentRow({establishment: e}: {establishment: Establishment}) {
  const openWebsite = () => {
    if (e.website) {Linking.openURL(e.website);}
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>🍽️</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{e.name}</Text>
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

      {e.website ? (
        <TouchableOpacity onPress={openWebsite} style={styles.websiteBtn}>
          <Text style={styles.websiteBtnText}>View Allergen Info →</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.noWebsite}>No allergen info link available — ask staff directly.</Text>
      )}
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
    shadowColor: colors.black,
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
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  cardMeta: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  chevron: {
    fontSize: 22,
    color: colors.textDisabled,
    marginLeft: spacing.sm,
    marginTop: 2,
  },
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
  noAllergenText: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
  sourceLabel: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
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
    color: colors.warning ?? '#B45309',
  },
  websiteBtn: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  websiteBtnText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  noWebsite: {
    marginTop: spacing.sm,
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
});
