import React, {useState} from 'react';
import {FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {ProductCategory} from '../../types/product';
import {ApprovalStatus, SavedProduct} from '../../types/pantry';
import {useSavedProducts} from '../../hooks/usePantry';
import {ApprovalBadge} from '../../components/ApprovalBadge';
import {ProductsStackScreenProps} from '../../navigation/navigationTypes';

type Nav = ProductsStackScreenProps<'MyProducts'>['navigation'];
type StatusFilter = 'all' | ApprovalStatus | 'recheck';

const STATUS_FILTERS: {key: StatusFilter; label: string}[] = [
  {key: 'all', label: 'All'},
  {key: 'approved', label: 'Approved'},
  {key: 'needs_review', label: 'Needs review'},
  {key: 'avoid', label: 'Avoid'},
  {key: 'recheck', label: 'Recheck'},
];
const CATEGORY_FILTERS: {key: ProductCategory | 'all'; label: string}[] = [
  {key: 'all', label: 'All types'},
  {key: 'food', label: 'Food'},
  {key: 'personal_care', label: 'Personal care'},
  {key: 'household', label: 'Household'},
];
const CATEGORY_ICON: Record<ProductCategory, string> = {food: '🍎', personal_care: '🧴', household: '🧽', other: '📦'};

function Chips<K extends string>({items, value, onChange}: {items: {key: K; label: string}[]; value: K; onChange: (k: K) => void}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map(i => (
        <TouchableOpacity
          key={i.key}
          onPress={() => onChange(i.key)}
          style={[styles.chip, value === i.key && styles.chipOn]}
          accessibilityRole="button"
          accessibilityState={{selected: value === i.key}}>
          <Text style={[styles.chipText, value === i.key && styles.chipTextOn]}>{i.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function Row({p, onPress}: {p: SavedProduct; onPress: () => void}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.approval?.status ?? 'no decision'}`}>
      {p.imageUrl ? (
        <Image source={{uri: p.imageUrl}} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderIcon}>{CATEGORY_ICON[p.category]}</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={2}>{p.name}</Text>
        {p.brand ? <Text style={styles.brand} numberOfLines={1}>{p.brand}</Text> : null}
        <ApprovalBadge status={p.approval?.status ?? null} recheck={p.recheckNeeded} />
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

/** "My Approved Products": the user's library of reviewed products. */
export function MyProductsScreen() {
  const navigation = useNavigation<Nav>();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const {data: products = [], isLoading} = useSavedProducts({
    status: status === 'all' || status === 'recheck' ? undefined : status,
    category: category === 'all' ? undefined : category,
    recheckOnly: status === 'recheck',
  });
  const filtered = status !== 'all' || category !== 'all';

  return (
    <View style={styles.screen}>
      <Chips items={STATUS_FILTERS} value={status} onChange={setStatus} />
      <Chips items={CATEGORY_FILTERS} value={category} onChange={setCategory} />
      <FlatList
        data={products}
        keyExtractor={p => p.gtin}
        renderItem={({item}) => <Row p={item} onPress={() => navigation.navigate('SavedProduct', {gtin: item.gtin})} />}
        contentContainerStyle={products.length ? styles.list : styles.emptyWrap}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={styles.emptyTitle}>{filtered ? 'Nothing matches these filters' : 'No saved products yet'}</Text>
              {!filtered ? (
                <Text style={styles.emptyText}>
                  Scan a product, then tap Approved, Needs review, Avoid or Add to shopping list. It
                  will appear here so you can find it, and buy it again, without re-checking.
                </Text>
              ) : null}
              {!filtered ? (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('ScanTab', {screen: 'BarcodeScan'})}
                  accessibilityRole="button">
                  <Text style={styles.emptyButtonText}>Scan a product</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  chips: {paddingHorizontal: spacing.md, paddingTop: spacing.sm},
  chip: {borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: borderRadius.full, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, marginRight: spacing.xs},
  chipOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {fontSize: fontSizes.sm, fontWeight: '600', color: colors.textPrimary},
  chipTextOn: {color: colors.white},
  list: {padding: spacing.md},
  row: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.sm, marginBottom: spacing.sm},
  image: {width: 56, height: 56, borderRadius: borderRadius.md, marginRight: spacing.md, backgroundColor: colors.background},
  imagePlaceholder: {alignItems: 'center', justifyContent: 'center'},
  placeholderIcon: {fontSize: 26},
  rowBody: {flex: 1},
  name: {fontSize: fontSizes.md, fontWeight: '700', color: colors.textPrimary},
  brand: {fontSize: fontSizes.sm, color: colors.textSecondary},
  chevron: {fontSize: 22, color: colors.textDisabled, marginLeft: spacing.sm},
  emptyWrap: {flexGrow: 1, justifyContent: 'center', padding: spacing.lg},
  empty: {alignItems: 'center'},
  emptyIcon: {fontSize: 40, marginBottom: spacing.sm},
  emptyTitle: {fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, textAlign: 'center'},
  emptyText: {fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm},
  emptyButton: {marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg},
  emptyButtonText: {color: colors.white, fontWeight: '700', fontSize: fontSizes.md},
});
