import React, {useEffect, useRef} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useScanCount} from '../../providers/ScanCountProvider';
import {LoadingOverlay} from '../../components/LoadingOverlay';
import {NoResultsBanner} from '../../components/NoResultsBanner';
import {NoNetworkBanner} from '../../components/NoNetworkBanner';
import {useProductByBarcode} from '../../hooks/useProductByBarcode';
import {hasIngredientData} from '../../services/productService';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {colors} from '../../constants/theme';
import {ProductInsights} from '../../components/ProductInsights';
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
        message="We couldn't find this product in any of our product databases. Photograph its ingredient label and we'll read it for you."
        ctaLabel="Scan the Label"
        onCta={() => navigation.navigate('ScanTab', {screen: 'PhotoCapture'})}
      />
    );
  }

  if (!product) {
    return null;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ProductInsights record={product} refreshSaved />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
