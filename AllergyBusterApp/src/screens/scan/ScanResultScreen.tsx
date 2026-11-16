import React, {useEffect, useRef} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useScanCount} from '../../providers/ScanCountProvider';
import {ProductHeader} from '../../components/ProductHeader';
import {AllergenList} from '../../components/AllergenList';
import {LoadingOverlay} from '../../components/LoadingOverlay';
import {NoResultsBanner} from '../../components/NoResultsBanner';
import {NoNetworkBanner} from '../../components/NoNetworkBanner';
import {useProductByBarcode} from '../../hooks/useProductByBarcode';
import {hasIngredientData} from '../../services/productService';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {colors, spacing} from '../../constants/theme';
import {ScanStackScreenProps} from '../../navigation/navigationTypes';
import {MainTabNavigationProp} from '../../navigation/navigationTypes';

type Props = ScanStackScreenProps<'ScanResult'>;

export function ScanResultScreen({route}: Props) {
  const {barcode, productId} = route.params;
  const navigation = useNavigation<MainTabNavigationProp>();
  const {isConnected} = useNetworkStatus();

  const {data: product, isLoading, isError} = useProductByBarcode(
    barcode ?? productId,
  );

  const {increment} = useScanCount();
  const incrementedRef = useRef(false);
  useEffect(() => {
    // A recognised product with no ingredient data gives the user nothing to
    // act on, so (as when a barcode isn't found) it doesn't use a free scan.
    if (product && hasIngredientData(product) && !incrementedRef.current) {
      incrementedRef.current = true;
      increment();
    }
  }, [product, increment]);

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <NoNetworkBanner />
      </View>
    );
  }

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (isError || product === null) {
    return (
      <NoResultsBanner
        message="We couldn't find allergen information for this product."
        ctaLabel="Search Instead"
        onCta={() =>
          navigation.navigate('SearchTab', {
            screen: 'TextSearch',
            params: {initialQuery: barcode, initialMode: 'products'},
          })
        }
      />
    );
  }

  if (!product) {
    return null;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ProductHeader
        name={product.name}
        brand={product.brand}
        imageUrl={product.imageUrl}
        source={product.source}
      />
      <View style={styles.allergenSection}>
        <AllergenList
          allergens={product.allergens}
          hasIngredientData={hasIngredientData(product)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  allergenSection: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
});
