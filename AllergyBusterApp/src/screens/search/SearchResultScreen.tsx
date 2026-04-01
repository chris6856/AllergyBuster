import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSizes, spacing} from '../../constants/theme';
import {SearchStackScreenProps} from '../../navigation/navigationTypes';

type Props = SearchStackScreenProps<'SearchResult'>;

export function SearchResultScreen({route}: Props) {
  const {query, mode} = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Search Results — coming soon</Text>
      <Text style={styles.detail}>Query: {query}</Text>
      <Text style={styles.detail}>Mode: {mode}</Text>
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
