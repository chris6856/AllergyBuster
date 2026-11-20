import React, {useCallback, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RootNavigationProp, RootStackScreenProps} from '../navigation/navigationTypes';
import {
  requestNotificationPermission,
  scheduleWeeklyReminders,
} from '../services/notificationService';
import {colors, borderRadius, fontSizes, spacing} from '../constants/theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const BRAND_GREEN = '#2E7D32';
const BRAND_LIGHT = '#E8F5E9';

interface Slide {
  key: string;
  icon: string;
  title: string;
  body: string;
  example?: {label: string; value: string};
  contexts?: string[];
  /** Small print under the body (used for the disclaimer on the last slide). */
  note?: string;
}

/** Bump when "What's new" slides change; returning users see them once. */
export const ONBOARDING_VERSION = '2';

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: '🛡️',
    title: 'Keep your family safe from allergens',
    body: 'AllergyBuster instantly identifies allergens in the foods you buy, labels you photograph, and restaurants you visit — before you take a bite.',
  },
  {
    key: 'barcode',
    icon: '📷',
    title: 'Scan any barcode in seconds',
    body: 'Point your camera at any product barcode. We look up the full ingredient list and flag every allergen immediately.',
    example: {label: 'Try scanning', value: 'Skippy peanut butter → ⚠️ Peanuts detected'},
  },
  {
    key: 'photo',
    icon: '📸',
    title: 'Snap the ingredient label',
    body: 'No barcode? Take a photo of any ingredient list — on packaging, menus, or shelf tags. Our scanner reads the text and highlights allergens for you.',
    example: {label: 'Works on', value: 'Packaged foods · Restaurant menus · Deli labels'},
  },
  {
    key: 'everywhere',
    icon: '🌍',
    title: 'Use it everywhere you shop',
    body: 'Make AllergyBuster your first stop every time you buy food, health, or beauty products.',
    contexts: ['🛒  Grocery shopping', '💊  Health & pharmacy', '💄  Beauty & personal care', '🍔  Restaurants & dining'],
  },
];

// New in 1.3. Shown after SLIDES for new users, and on their own (once) to
// existing users.
const NEW_SLIDES: Slide[] = [
  {
    key: 'save',
    icon: '⭐',
    title: 'Save the products you trust',
    body: 'After a scan, mark a product Approved, Needs review or Avoid. It goes into My Products, so you can find it again without re-checking.',
    example: {label: 'If a recipe changes', value: "We flag \"Recheck needed\" when a saved product's ingredients change"},
  },
  {
    key: 'list',
    icon: '🛒',
    title: 'Shop from your approved list',
    body: "Build reusable shopping lists from products you've already reviewed, and tick them off in the store.",
  },
  {
    key: 'beyond',
    icon: '🧴',
    title: "Know what's inside, beyond food",
    body: 'See additives, nutrition against your limits, fragrance ingredients in personal care products, and label warnings on household cleaners (beta).',
  },
  {
    key: 'matters',
    icon: '🎯',
    title: 'What matters to you?',
    body: 'Choose your allergens and what AllergyBuster should highlight: additives, added sugar, sodium, packaging, fragrance.',
    note: "AllergyBuster explains available information from public databases and your label photos. It can be incomplete or out of date, isn't medical advice, and doesn't certify any product as safe. Your approvals are your own choices. Always read the package label and consult your doctor or allergist.",
  },
];

export function OnboardingScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const {params} = useRoute<RootStackScreenProps<'Onboarding'>['route']>();
  const whatsNew = params?.whatsNew === true;
  const SLIDES_SHOWN = whatsNew ? NEW_SLIDES : [...SLIDES, ...NEW_SLIDES];
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const finish = useCallback(async (setUp = false) => {
    await AsyncStorage.multiSet([
      ['onboardingSeen', 'true'],
      ['onboardingVersion', ONBOARDING_VERSION],
    ]);
    // New users: ask for notification permission, then schedule weekly
    // reminders (no-op if denied). Returning users were already asked.
    if (!whatsNew) {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleWeeklyReminders();
      }
    }
    navigation.replace('MainTabs', undefined);
    if (setUp) {
      navigation.navigate('AllergyProfile');
    }
  }, [navigation, whatsNew]);

  const next = useCallback(() => {
    if (activeIndex < SLIDES_SHOWN.length - 1) {
      listRef.current?.scrollToIndex({index: activeIndex + 1, animated: true});
    } else {
      finish();
    }
  }, [activeIndex, finish, SLIDES_SHOWN.length]);

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const isLast = activeIndex === SLIDES_SHOWN.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={() => finish()}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding">
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={listRef}
        data={SLIDES_SHOWN}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: false},
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{itemVisiblePercentThreshold: 50}}
        renderItem={({item}) => <SlideView slide={item} />}
      />

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {SLIDES_SHOWN.map((_, i) => {
          const inputRange = [
            (i - 1) * SCREEN_WIDTH,
            i * SCREEN_WIDTH,
            (i + 1) * SCREEN_WIDTH,
          ];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.35, 1, 0.35],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, {width: dotWidth, opacity}]}
            />
          );
        })}
      </View>

      {/* Set up (last slide only) */}
      {isLast && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => finish(true)}
          accessibilityRole="button"
          accessibilityLabel="Set up my allergies and preferences">
          <Text style={styles.secondaryBtnText}>Set up what matters to me</Text>
        </TouchableOpacity>
      )}

      {/* Next / Get Started */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => next()}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={isLast ? 'Get started' : 'Next slide'}>
        <Text style={styles.primaryBtnText}>
          {isLast ? 'Get Started →' : 'Next →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SlideView({slide}: {slide: Slide}) {
  return (
    <View style={styles.slide}>
      <View style={styles.iconCircle}>
        <Text style={styles.slideIcon}>{slide.icon}</Text>
      </View>

      <Text style={styles.slideTitle}>{slide.title}</Text>
      <Text style={styles.slideBody}>{slide.body}</Text>

      {slide.example && (
        <View style={styles.exampleBox}>
          <Text style={styles.exampleLabel}>{slide.example.label}</Text>
          <Text style={styles.exampleValue}>{slide.example.value}</Text>
        </View>
      )}

      {slide.note ? <Text style={styles.slideNote}>{slide.note}</Text> : null}

      {slide.contexts && (
        <View style={styles.contextList}>
          {slide.contexts.map(c => (
            <View key={c} style={styles.contextRow}>
              <Text style={styles.contextText}>{c}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  skipBtn: {
    position: 'absolute',
    top: 56,
    right: spacing.lg,
    zIndex: 10,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    paddingBottom: 160,
  },

  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BRAND_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  slideIcon: {
    fontSize: 48,
  },

  slideTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: BRAND_GREEN,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: spacing.md,
  },
  slideBody: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },

  exampleBox: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: BRAND_GREEN,
    alignSelf: 'stretch',
  },
  exampleLabel: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: BRAND_GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  exampleValue: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },

  contextList: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  contextRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_GREEN,
  },
  contextText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_GREEN,
  },

  primaryBtn: {
    position: 'absolute',
    bottom: 48,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: BRAND_GREEN,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  secondaryBtn: {
    position: 'absolute',
    bottom: 128,
    left: spacing.xl,
    right: spacing.xl,
    borderWidth: 2,
    borderColor: BRAND_GREEN,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: BRAND_GREEN,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  slideNote: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
});
