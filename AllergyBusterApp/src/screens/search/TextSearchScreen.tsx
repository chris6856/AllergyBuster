import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import Geolocation from '@react-native-community/geolocation';
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
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Clear query and location when returning from results
  const isFirstFocus = useRef(true);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setQuery('');
      setLocation('');
      setCoords(null);
    });
    return unsubscribe;
  }, [navigation]);

  const handleUseLocation = async () => {
    const permission = Platform.OS === 'ios'
      ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    const result = await request(permission);
    if (result !== RESULTS.GRANTED) {
      Alert.alert(
        'Location access needed',
        'Please allow location access in Settings to use this feature.',
      );
      return;
    }

    setLocating(true);
    try {
      Geolocation.getCurrentPosition(
        position => {
          setCoords({lat: position.coords.latitude, lng: position.coords.longitude});
          setLocation('');
          setLocating(false);
        },
        () => {
          setLocating(false);
          Alert.alert('Could not get location', 'Please enter a ZIP code or city instead.');
        },
        {enableHighAccuracy: false, timeout: 15000, maximumAge: 60000},
      );
    } catch {
      setLocating(false);
      Alert.alert('Could not get location', 'Please enter a ZIP code or city instead.');
    }
  };

  // Auto-focus if we arrive with an initial query (e.g. from scan fallback)
  useEffect(() => {
    if (route.params?.initialQuery) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [route.params?.initialQuery]);

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) {return;}
    Keyboard.dismiss();
    navigation.navigate('SearchResult', {
      query: trimmed,
      mode,
      location: mode === 'restaurants' ? location.trim() || undefined : undefined,
      coords: mode === 'restaurants' ? coords ?? undefined : undefined,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
      {!isConnected && <NoNetworkBanner />}

      <SearchSegmentedControl mode={mode} onChange={setMode} />

      {/*
       * Everything below (location inputs, search input, guidance) lives inside
       * one ScrollView with keyboardShouldPersistTaps="handled". This ensures
       * that tapping the Search button while the keyboard is open registers the
       * tap immediately on Android without requiring a double-tap.
       */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Location section (restaurants only) ── */}
        {mode === 'restaurants' && (
          <View style={styles.locationSection}>
            {coords && !location ? (
              /* GPS active — show active state spanning full width */
              <View style={styles.locationActiveRow}>
                <Text style={styles.locationActiveText}>📍 Using current location</Text>
                <TouchableOpacity onPress={() => setCoords(null)}>
                  <Text style={styles.locationClearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* ZIP input + location button side-by-side (iOS) or stacked (Android) */}
                {Platform.OS === 'ios' ? (
                  <View style={styles.row}>
                    <TextInput
                      style={styles.input}
                      value={location}
                      onChangeText={text => {
                        setLocation(text);
                        if (coords) {setCoords(null);}
                      }}
                      placeholder="City or ZIP code…"
                      placeholderTextColor={colors.textDisabled}
                      returnKeyType="next"
                      autoCapitalize="words"
                      autoCorrect={false}
                      accessibilityLabel="Location input"
                    />
                    <TouchableOpacity
                      style={[styles.locationBtnInline, locating && styles.btnDisabled]}
                      onPress={handleUseLocation}
                      disabled={locating}
                      accessibilityLabel="Use current location"
                      accessibilityRole="button">
                      {locating
                        ? <ActivityIndicator size="small" color={colors.white} />
                        : <Text style={styles.btnText}>📍 My Location</Text>
                      }
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Android: ZIP on top, full-width location button below */
                  <>
                    <TextInput
                      style={[styles.input, styles.inputFull]}
                      value={location}
                      onChangeText={text => {
                        setLocation(text);
                        if (coords) {setCoords(null);}
                      }}
                      placeholder="City or ZIP code (optional)…"
                      placeholderTextColor={colors.textDisabled}
                      returnKeyType="next"
                      autoCapitalize="words"
                      autoCorrect={false}
                      accessibilityLabel="Location input"
                    />
                    <TouchableOpacity
                      style={[styles.locationBtnFull, locating && styles.btnDisabled]}
                      onPress={handleUseLocation}
                      disabled={locating}
                      accessibilityLabel="Use current location"
                      accessibilityRole="button">
                      {locating
                        ? <ActivityIndicator size="small" color={colors.white} />
                        : <Text style={styles.btnText}>📍 Use My Current Location</Text>
                      }
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Search input + button ── */}
        <View style={styles.row}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmit}
            placeholder={
              mode === 'products'
                ? 'Product name, brand or ingredient…'
                : 'Restaurant name…'
            }
            placeholderTextColor={colors.textDisabled}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            accessibilityLabel="Search input"
          />
          <TouchableOpacity
            style={[styles.searchBtn, !query.trim() && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!query.trim()}
            accessibilityLabel="Search"
            accessibilityRole="button">
            <Text style={styles.btnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* ── Guidance cards ── */}
        {!query.trim() && (
          <>
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
            <Text style={styles.modeTip}>
              {mode === 'products'
                ? '🍽️  Looking for a restaurant? Switch to Restaurants above.'
                : '🛒  Looking for a product? Switch to Products above.'}
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  locationSection: {
    marginBottom: spacing.sm,
  },
  locationActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  locationActiveText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  locationClearText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
    minHeight: 44,
  },
  inputFull: {
    marginBottom: spacing.sm,
  },
  locationBtnInline: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    flexShrink: 0,
  },
  locationBtnFull: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    flexShrink: 0,
  },
  btnDisabled: {
    backgroundColor: colors.textDisabled,
  },
  btnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSizes.sm,
  },
  guidanceHeading: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
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
