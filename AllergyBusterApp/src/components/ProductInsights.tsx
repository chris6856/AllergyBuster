import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ProductRecord, ProductCategory, SOURCE_LABELS} from '../types/product';
import {analyzeProduct} from '../analysis';
import {useAllergyProfile} from '../providers/AllergyProfileProvider';
import {usePreferences} from '../providers/PreferencesProvider';
import {usePantryActions, useSavedProduct} from '../hooks/usePantry';
import {hasIngredientData} from '../services/productService';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {ProductHeader} from './ProductHeader';
import {InsightSectionCard} from './InsightSectionCard';
import {AllergenList} from './AllergenList';
import {DecisionBar} from './DecisionBar';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  food: 'Food & beverage',
  personal_care: 'Personal care',
  household: 'Household',
  other: 'Other product',
};

/**
 * Product Insights: header → analysis sections → ingredient list → decision.
 * Used for scan results and for saved products.
 *
 * `refreshSaved`: when this record comes from a fresh lookup and the
 * product is already in My Products, store the new data so a changed
 * formula shows "Recheck needed".
 */
export function ProductInsights({record, refreshSaved = false}: {record: ProductRecord; refreshSaved?: boolean}) {
  const {profile} = useAllergyProfile();
  const {preferences} = usePreferences();
  const {data: saved} = useSavedProduct(record.gtin);
  const {refresh} = usePantryActions();
  const [showIngredients, setShowIngredients] = useState(false);

  const refreshedRef = useRef(false);
  useEffect(() => {
    if (refreshSaved && saved && !refreshedRef.current) {
      refreshedRef.current = true;
      refresh.mutate([record]);
    }
  }, [refreshSaved, saved, record, refresh]);

  const analysis = useMemo(
    () => analyzeProduct(record, profile.allergens, preferences),
    [record, profile.allergens, preferences],
  );

  return (
    <View>
      <ProductHeader name={record.name} brand={record.brand} imageUrl={record.imageUrl} source={record.source} />
      <View style={styles.metaRow}>
        <Text style={styles.category}>{CATEGORY_LABELS[record.category]}</Text>
        {record.category === 'household' ? <Text style={styles.beta}>Beta</Text> : null}
      </View>

      <View style={styles.sections}>
        {analysis.sections.map((s, i) => (
          <InsightSectionCard key={s.id} section={s} initiallyOpen={i === 0}>
            {s.id === 'allergy' ? (
              <AllergenList allergens={record.allergens} hasIngredientData={hasIngredientData(record)} />
            ) : undefined}
          </InsightSectionCard>
        ))}
      </View>

      {record.ingredientsText ? (
        <TouchableOpacity
          style={styles.ingredients}
          onPress={() => setShowIngredients(v => !v)}
          accessibilityRole="button"
          accessibilityState={{expanded: showIngredients}}>
          <Text style={styles.ingredientsTitle}>Ingredients {showIngredients ? '▴' : '▾'}</Text>
          {showIngredients ? (
            <Text style={styles.ingredientsText} selectable>
              {record.ingredientsText}
            </Text>
          ) : null}
        </TouchableOpacity>
      ) : null}

      <DecisionBar record={record} />

      <Text style={styles.footer}>
        Information from {SOURCE_LABELS[record.source]}, a community or third-party database that
        can be incomplete or out of date. AllergyBuster explains the available evidence; it
        doesn't certify products as safe. Always read the package label.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.surface},
  category: {fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5},
  beta: {
    marginLeft: spacing.sm,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.warning,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
  },
  sections: {paddingTop: spacing.md},
  ingredients: {backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm},
  ingredientsTitle: {fontSize: fontSizes.md, fontWeight: '800', color: colors.textPrimary},
  ingredientsText: {fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20, marginTop: spacing.sm},
  footer: {fontSize: fontSizes.xs, color: colors.textDisabled, fontStyle: 'italic', lineHeight: 16, padding: spacing.md, textAlign: 'center'},
});
