import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSizes, spacing} from '../../constants/theme';
import {ScanStackScreenProps} from '../../navigation/navigationTypes';

type Props = ScanStackScreenProps<'ScanResult'>;

export function ScanResultScreen({route}: Props) {
  const {barcode, productId} = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Scan Result — coming soon</Text>
      {barcode && <Text style={styles.detail}>Barcode: {barcode}</Text>}
      {productId && <Text style={styles.detail}>Product ID: {productId}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  text: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  detail: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
