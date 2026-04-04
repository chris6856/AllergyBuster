import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {SearchSegmentedControl, SearchMode} from '../../components/SearchSegmentedControl';
import {NoNetworkBanner} from '../../components/NoNetworkBanner';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {SearchStackScreenProps} from '../../navigation/navigationTypes';

type Props = SearchStackScreenProps<'TextSearch'>;

type GuidanceCard = {
  icon: string;
  title: string;
  description: string;
  mode: SearchMode;
  example: string;
};

const GUIDANCE: GuidanceCard[] = [
  {
    icon: '🥜',
    title: 'Search by product name',
    description: 'Find allergen info for any packaged food product.',
    mode: 'products',
    example: 'e.g. "Skippy peanut butter"',
  },
  {
    icon: '🌾',
    title: 'Search by ingredient or brand',
    description: 'Look up a specific ingredient or brand across products.',
    mode: 'products',
    example: 'e.g. "wheat flour" or "Kelloggs"',
  },
  {
    icon: '🍔',
    title: 'Search by restaurant name',
    description: 'Browse allergen information for menu items.',
    mode: 'restaurants',
    example: 'e.g. "McDonald\'s" or "Olive Garden"',
  },
];

export function TextSearchScreen({route}: Props) {
  const navigation = useNavigation<Props['navigation']>();
  const {isConnected} = useNetworkStatus();

  const [mode, setMode] = useState<SearchMode>(
    route.params?.initialMode ?? 'products',
  );
  const [query, setQuery] = useState(route.params?.initialQuery ?? '');
  const [location, setLocation] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Clear query when returning from results so the field is ready for next search
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setQuery('');
      setLocation('');
    }, []),
  );

  // Auto-focus if we arrive with an initial query (e.g. from scan fallback)
  useEffect(() => {
    if (route.params?.initialQuery) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [route.params?.initialQuery]);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    Keyboard.dismiss();
    navigation.navigate('SearchResult', {
      query: trimmed,
      mode,
      location: mode === 'restaurants' ? location.trim() || undefined : undefined,
    });
  };

  return (
    <View style={styles.container}>
      {!isConnected && <NoNetworkBanner />}

      <SearchSegmentedControl mode={mode} onChange={setMode} />

      {/* Location input — restaurants only */}
      {mode === 'restaurants' && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="City or ZIP code…"
            placeholderTextColor={colors.textDisabled}
            returnKeyType="next"
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel="Location input"
          />
        </View>
      )}

      {/* Search input row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={
            mode === 'products'
              ? 'Product name, brand or ingredient…'
              : 'Restaurant name…'
          }
          placeholderTextColor={colors.textDisabled}
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search input"
        />
        <TouchableOpacity
          style={[styles.searchButton, !query.trim() && styles.searchButtonDisabled]}
          onPress={handleSubmit}
          disabled={!query.trim()}
          accessibilityLabel="Search"
          accessibilityRole="button">
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Guidance cards — shown when input is empty */}
      {!query.trim() && (
        <ScrollView
          style={styles.guidance}
          contentContainerStyle={styles.guidanceContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.guidanceHeading}>What can we look up?</Text>
          {GUIDANCE.filter(c => c.mode === mode).map(card => (
            <TouchableOpacity
              key={card.title}
              style={styles.card}
              onPress={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              activeOpacity={0.8}>
              <Text style={styles.cardIcon}>{card.icon}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
                <Text style={styles.cardExample}>{card.example}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Cross-mode tip */}
          <Text style={styles.modeTip}>
            {mode === 'products'
              ? '🍽️  Looking for a restaurant? Switch to Restaurants above.'
              : '🛒  Looking for a product? Switch to Products above.'}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  searchButtonDisabled: {
    backgroundColor: colors.textDisabled,
  },
  searchButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSizes.sm,
  },
  guidance: {
    flex: 1,
  },
  guidanceContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  guidanceHeading: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: spacing.md,
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  cardExample: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
  modeTip: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
