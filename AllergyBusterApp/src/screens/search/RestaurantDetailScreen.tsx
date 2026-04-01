import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSizes, spacing} from '../../constants/theme';
import {SearchStackScreenProps} from '../../navigation/navigationTypes';

type Props = SearchStackScreenProps<'RestaurantDetail'>;

export function RestaurantDetailScreen({route}: Props) {
  const {restaurantName} = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Restaurant Detail — coming soon</Text>
      <Text style={styles.detail}>{restaurantName}</Text>
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
