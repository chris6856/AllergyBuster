import React, {useMemo, useState} from 'react';
import {Image, SectionList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {ProductCategory} from '../../types/product';
import {APPROVAL_LABELS, ApprovalStatus, SavedProduct} from '../../types/pantry';
import {useSavedProducts} from '../../hooks/usePantry';
import {ApprovalBadge} from '../../components/ApprovalBadge';
import {displayProductName} from '../../utils/productRecord';
import {ProductsStackScreenProps} from '../../navigation/navigationTypes';

type Nav = ProductsStackScreenProps<'MyProducts'>['navigation'];
type StatusFilter = 'all' | ApprovalStatus | 'recheck';

const STATUS_ORDER: ApprovalStatus[] = ['approved', 'needs_review', 'avoid'];
const CATEGORY_ORDER: ProductCategory[] = ['food', 'personal_care', 'household', 'other'];
const CATEGORY_TITLES: Record<ProductCategory, string> = {
  food: '🍎  Food & drink',
  personal_care: '🧴  Personal care',
  household: '🧽  Household',
  other: '📦  Other',
};
const CATEGORY_ICON: Record<ProductCategory, string> = {food: '🍎', personal_care: '🧴', household: '🧽', other: '📦'};

function Row({p, onPress}: {p: SavedProduct; onPress: () => void}) {
  const name = displayProductName(p.name, p.brand);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}${p.approval ? `, ${APPROVAL_LABELS[p.approval.status]}` : ''}${p.recheckNeeded ? ', recheck needed' : ''}`}>
      {p.imageUrl ? (
        <Image source={{uri: p.imageUrl}} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderIcon}>{CATEGORY_ICON[p.category]}</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        {p.brand ? <Text style={styles.brand} numberOfLines={1}>{p.brand}</Text> : null}
        <ApprovalBadge status={p.approval?.status ?? null} recheck={p.recheckNeeded} />
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

/**
 * My Products: every product the user has checked, with their decision,
 * grouped by type. One row of status filters; "recheck needed" shows as a
 * banner only when something changed.
 */
export function MyProductsScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const {data: all = [], isLoading} = useSavedProducts();

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {all: all.length, approved: 0, needs_review: 0, avoid: 0, recheck: 0};
    for (const p of all) {
      if (p.approval) {
        c[p.approval.status]++;
      }
      if (p.recheckNeeded) {
        c.recheck++;
      }
    }
    return c;
  }, [all]);

  const sections = useMemo(() => {
    const shown = all.filter(p =>
      filter === 'all' ? true : filter === 'recheck' ? p.recheckNeeded : p.approval?.status === filter,
    );
    return CATEGORY_ORDER.map(cat => ({
      key: cat,
      title: CATEGORY_TITLES[cat],
      data: shown.filter(p => p.category === cat),
    })).filter(s => s.data.length > 0);
  }, [all, filter]);

  const chips: {key: StatusFilter; label: string}[] = [
    {key: 'all', label: 'All'},
    ...STATUS_ORDER.map(s => ({key: s as StatusFilter, label: APPROVAL_LABELS[s]})),
  ];

  const header = (
    <View>
      <Text style={styles.intro}>
        Products you've checked and your decision on each. Tap one to see it again or check for updates.
      </Text>

      {counts.recheck > 0 && filter !== 'recheck' ? (
        <TouchableOpacity style={styles.recheckBanner} onPress={() => setFilter('recheck')} accessibilityRole="button">
          <Text style={styles.recheckText}>
            ⚠ {counts.recheck} product{counts.recheck === 1 ? '' : 's'} changed since you reviewed {counts.recheck === 1 ? 'it' : 'them'}. Tap to see.
          </Text>
        </TouchableOpacity>
      ) : null}
      {filter === 'recheck' ? (
        <TouchableOpacity style={styles.recheckBanner} onPress={() => setFilter('all')} accessibilityRole="button">
          <Text style={styles.recheckText}>Showing products that need a recheck · Show all</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.chips} accessibilityRole="tablist">
        {chips.map(c => {
          const on = filter === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setFilter(c.key)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="tab"
              accessibilityState={{selected: on}}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {c.label} <Text style={[styles.chipCount, on && styles.chipTextOn]}>{counts[c.key]}</Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={p => p.gtin}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={all.length ? header : null}
      renderSectionHeader={({section}) => (
        <Text style={styles.sectionTitle}>
          {section.title} <Text style={styles.sectionCount}>({section.data.length})</Text>
        </Text>
      )}
      renderItem={({item}) => <Row p={item} onPress={() => navigation.navigate('SavedProduct', {gtin: item.gtin})} />}
      ListEmptyComponent={
        isLoading ? null : all.length ? (
          <Text style={styles.noneForFilter}>No products with this status.</Text>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyTitle}>No saved products yet</Text>
            <Text style={styles.emptyText}>
              Scan a product, then tap Approved, Needs review, Avoid or Add to shopping list. It will
              appear here so you can find it, and buy it again, without checking it twice.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('ScanTab', {screen: 'BarcodeScan'})}
              accessibilityRole="button">
              <Text style={styles.emptyButtonText}>Scan a product</Text>
            </TouchableOpacity>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1},
  intro: {fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.sm},
  recheckBanner: {backgroundColor: colors.warningLight, borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.sm},
  recheckText: {fontSize: fontSizes.sm, color: colors.textPrimary, fontWeight: '600'},
  chips: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs},
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {fontSize: fontSizes.sm, fontWeight: '600', color: colors.textPrimary},
  chipCount: {fontWeight: '400', color: colors.textSecondary},
  chipTextOn: {color: colors.white},
  sectionTitle: {fontSize: fontSizes.sm, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs},
  sectionCount: {fontWeight: '400', color: colors.textSecondary},
  row: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.sm, marginBottom: spacing.sm},
  image: {width: 56, height: 56, borderRadius: borderRadius.md, marginRight: spacing.md, backgroundColor: colors.background},
  imagePlaceholder: {alignItems: 'center', justifyContent: 'center'},
  placeholderIcon: {fontSize: 26},
  rowBody: {flex: 1},
  name: {fontSize: fontSizes.md, fontWeight: '700', color: colors.textPrimary},
  brand: {fontSize: fontSizes.sm, color: colors.textSecondary},
  chevron: {fontSize: 22, color: colors.textDisabled, marginLeft: spacing.sm},
  noneForFilter: {fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg},
  emptyIcon: {fontSize: 40, marginBottom: spacing.sm},
  emptyTitle: {fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, textAlign: 'center'},
  emptyText: {fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm},
  emptyButton: {marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg},
  emptyButtonText: {color: colors.white, fontWeight: '700', fontSize: fontSizes.md},
});
