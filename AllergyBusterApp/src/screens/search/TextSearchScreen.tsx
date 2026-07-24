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

const GUIDANCE = [
  {icon: '🥜', title: 'Search by product name',        description: 'Find allergen info for any packaged food product.',                                          mode: 'products' as SearchMode,    jeeves: false, example: 'e.g. "Skippy peanut butter"'},
  {icon: '🌾', title: 'Search by ingredient or brand', description: 'Find products that contain a specific ingredient or brand — not an ingredient explanation.', mode: 'products' as SearchMode,    jeeves: false, example: 'e.g. "wheat flour" or "Kelloggs"'},
  {icon: '🤖', title: 'What is this ingredient?',      description: 'Ask Jeeves to explain any ingredient, additive, or allergen in plain language.',             mode: 'products' as SearchMode,    jeeves: true,  example: 'e.g. "What is ammonium hydroxide?"'},
  {icon: '🍔', title: 'Search by restaurant name',     description: 'Browse allergen information for menu items.',                                                mode: 'restaurants' as SearchMode, jeeves: false, example: 'e.g. "McDonald\'s" or "Olive Garden"'},
];

export function TextSearchScreen({route}: Props) {
  const navigation = useNavigation<Props['navigation']>();
  const {isConnected} = useNetworkStatus();

  const [mode, setMode]       = useState<SearchMode>(route.params?.initialMode ?? 'products');
  const [query, setQuery]     = useState(route.params?.initialQuery ?? '');
  const [location, setLocation] = useState('');
  const [coords, setCoords]   = useState<{lat: number; lng: number} | null>(null);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isFirstFocus = useRef(true);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (isFirstFocus.current) { isFirstFocus.current = false; return; }
      setQuery('');
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (route.params?.initialQuery) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [route.params?.initialQuery]);

  const handleUseLocation = async () => {
    const perm = Platform.OS === 'ios'
      ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
    const result = await request(perm);
    if (result !== RESULTS.GRANTED) {
      Alert.alert('Location access needed', 'Please allow location access in Settings.');
      return;
    }
    setLocating(true);
    Geolocation.getCurrentPosition(
      pos => { setCoords({lat: pos.coords.latitude, lng: pos.coords.longitude}); setLocation(''); setLocating(false); },
      ()  => { setLocating(false); Alert.alert('Could not get location', 'Please enter a ZIP code or city instead.'); },
      {enableHighAccuracy: false, timeout: 15000, maximumAge: 60000},
    );
  };

  const handleSearch = () => {
    const q = query.trim();
    if (!q) { return; }
    Keyboard.dismiss();
    navigation.navigate('SearchResult', {
      query: q,
      mode,
      location: mode === 'restaurants' ? location.trim() || undefined : undefined,
      coords:   mode === 'restaurants' ? coords ?? undefined : undefined,
    });
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
      {!isConnected && <NoNetworkBanner />}
      <SearchSegmentedControl mode={mode} onChange={setMode} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Location section — only visible in restaurant mode ── */}
        {mode === 'restaurants' && (
          <View style={styles.section}>
            {coords ? (
              /* GPS active */
              <View style={styles.gpsActiveRow}>
                <Text style={styles.gpsActiveText}>📍 Using current location</Text>
                <TouchableOpacity onPress={() => setCoords(null)}>
                  <Text style={styles.gpsClearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ZIP + location button */
              <>
                <TextInput
                  style={styles.inputFull}
                  value={location}
                  onChangeText={text => { setLocation(text); if (coords) { setCoords(null); } }}
                  placeholder="City or ZIP code (optional)…"
                  placeholderTextColor={colors.textDisabled}
                  returnKeyType="next"
                  autoCapitalize="words"
                  autoCorrect={false}
                  accessibilityLabel="Location input"
                />
                <TouchableOpacity
                  style={[styles.locationBtn, locating && styles.btnDim]}
                  onPress={handleUseLocation}
                  disabled={locating}
                  accessibilityRole="button"
                  accessibilityLabel="Use current location">
                  {locating
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.btnLabel}>📍 Use My Current Location</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Restaurant name / product search row ── */}
        <View style={styles.searchRow}>
          <TextInput
            ref={inputRef}
            style={styles.inputFlex}
            value={query}
            onChangeText={setQuery}
            placeholder={mode === 'products' ? 'Product name, brand or ingredient…' : 'Restaurant name…'}
            placeholderTextColor={colors.textDisabled}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            accessibilityLabel="Search input"
          />
          <TouchableOpacity
            style={[styles.searchBtn, !query.trim() && styles.btnDim]}
            onPress={handleSearch}
            disabled={!query.trim()}
            accessibilityRole="button"
            accessibilityLabel="Search">
            <Text style={styles.btnLabel}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* ── Guidance cards ── */}
        {!query.trim() && (
          <>
            <Text style={styles.guidingHead}>What can we look up?</Text>
            {GUIDANCE.filter(c => c.mode === mode).map(card => (
              <TouchableOpacity
                key={card.title}
                style={styles.card}
                onPress={() => {
                  if (card.jeeves) {
                    navigation.navigate('JeevesTab');
                  } else {
                    setQuery('');
                    inputRef.current?.focus();
                  }
                }}
                activeOpacity={0.8}>
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDesc}>{card.description}</Text>
                  <Text style={styles.cardEx}>{card.example}</Text>
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

const BTN_BG = colors.primary;

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  scroll: {flex: 1},
  content: {padding: spacing.md, paddingBottom: 80},

  section: {marginBottom: spacing.sm},

  gpsActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.sm,
  },
  gpsActiveText: {fontSize: fontSizes.sm, color: colors.primary, fontWeight: '600'},
  gpsClearText:  {fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '600'},

  /* Full-width standalone input (ZIP field) */
  inputFull: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  locationBtn: {
    backgroundColor: BTN_BG,
    borderRadius: borderRadius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  /* Search row — horizontal */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputFlex: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  searchBtn: {
    backgroundColor: BTN_BG,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnDim:   {backgroundColor: colors.textDisabled},
  btnLabel: {color: '#fff', fontWeight: '700', fontSize: fontSizes.sm},

  /* Guidance */
  guidingHead: {fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.md},
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardIcon: {fontSize: 28, marginRight: spacing.md, marginTop: 2},
  cardBody: {flex: 1},
  cardTitle: {fontSize: fontSizes.md, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs},
  cardDesc:  {fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.xs},
  cardEx:    {fontSize: fontSizes.xs, color: colors.textDisabled, fontStyle: 'italic'},
  modeTip:   {fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic'},
});
