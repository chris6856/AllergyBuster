import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSizes, spacing} from '../../constants/theme';
import {PhotoStackScreenProps} from '../../navigation/navigationTypes';

type Props = PhotoStackScreenProps<'PhotoResult'>;

export function PhotoResultScreen({route}: Props) {
  const {rawOcrText} = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Photo Result — coming soon</Text>
      <Text style={styles.detail} numberOfLines={3}>{rawOcrText}</Text>
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
    textAlign: 'center',
  },
});
