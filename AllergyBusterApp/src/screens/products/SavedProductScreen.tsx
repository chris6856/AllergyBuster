import React, {useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {usePantryActions, useSavedProduct} from '../../hooks/usePantry';
import {getProductByBarcode} from '../../services/productService';
import {ProductInsights} from '../../components/ProductInsights';
import {LoadingOverlay} from '../../components/LoadingOverlay';
import {ProductsStackScreenProps} from '../../navigation/navigationTypes';

type Props = ProductsStackScreenProps<'SavedProduct'>;

/**
 * A saved product, shown from its stored data (works offline). "Check for
 * updates" re-fetches it; a changed formula sets "Recheck needed".
 * Doesn't use a free scan: it's a product the user already checked.
 */
export function SavedProductScreen() {
  const {params} = useRoute<Props['route']>();
  const navigation = useNavigation<Props['navigation']>();
  const {data: saved, isLoading} = useSavedProduct(params.gtin);
  const {refresh, remove} = usePantryActions();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingOverlay />;
  }
  if (!saved) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>This product is no longer in My Products.</Text>
      </View>
    );
  }

  const checkForUpdates = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const fresh = await getProductByBarcode(params.gtin);
      if (!fresh) {
        setMessage('The product databases no longer have this barcode. Your saved copy is unchanged.');
        return;
      }
      const r = await refresh.mutateAsync([fresh]);
      setMessage(
        r.changed
          ? 'Ingredients or allergens changed. Review the details below.'
          : 'No ingredient or allergen changes since you saved it.',
      );
    } catch {
      setMessage("Couldn't check for updates. Try again when you're online.");
    } finally {
      setChecking(false);
    }
  };

  const confirmRemove = () =>
    Alert.alert('Remove from My Products?', `${saved.name} and your decision will be removed. Shopping list items stay.`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await remove.mutateAsync([saved.gtin]);
          navigation.goBack();
        },
      },
    ]);

  return (
    <ScrollView style={styles.screen}>
      <ProductInsights record={saved.latest} />
      <View style={styles.actions}>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={checkForUpdates} disabled={checking} accessibilityRole="button">
          {checking ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.buttonText}>Check for updates</Text>}
        </TouchableOpacity>
        <Text style={styles.savedAt}>Data saved {new Date(saved.updatedAt).toLocaleDateString()}</Text>
        <TouchableOpacity onPress={confirmRemove} accessibilityRole="button" style={styles.remove}>
          <Text style={styles.removeText}>Remove from My Products</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  actions: {padding: spacing.md, alignItems: 'center'},
  message: {fontSize: fontSizes.sm, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm},
  button: {borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minWidth: 200, alignItems: 'center'},
  buttonText: {color: colors.primary, fontWeight: '700', fontSize: fontSizes.md},
  savedAt: {fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: spacing.sm},
  remove: {marginTop: spacing.lg, padding: spacing.sm},
  removeText: {color: colors.danger, fontWeight: '600', fontSize: fontSizes.sm},
  missing: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg},
  missingText: {fontSize: fontSizes.md, color: colors.textSecondary, textAlign: 'center'},
});
