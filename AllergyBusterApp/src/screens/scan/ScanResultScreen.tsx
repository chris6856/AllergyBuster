import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ProductHeader} from '../../components/ProductHeader';
import {AllergenList} from '../../components/AllergenList';
import {LoadingOverlay} from '../../components/LoadingOverlay';
import {NoResultsBanner} from '../../components/NoResultsBanner';
import {NoNetworkBanner} from '../../components/NoNetworkBanner';
import {useProductByBarcode} from '../../hooks/useProductByBarcode';
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
        <AllergenList allergens={product.allergens} />
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
