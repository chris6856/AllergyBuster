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
import {useNavigation} from '@react-navigation/native';
import {RootNavigationProp} from '../navigation/navigationTypes';
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
}

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

export function OnboardingScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const finish = useCallback(async () => {
    await AsyncStorage.setItem('onboardingSeen', 'true');
    // Ask for notification permission then schedule weekly reminders.
    // If the user denies, scheduleWeeklyReminders is a no-op.
    const granted = await requestNotificationPermission();
    if (granted) {
      await scheduleWeeklyReminders();
    }
    navigation.replace('MainTabs', undefined);
  }, [navigation]);

  const next = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({index: activeIndex + 1, animated: true});
    } else {
      finish();
    }
  }, [activeIndex, finish]);

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding">
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
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
        {SLIDES.map((_, i) => {
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

      {/* Next / Get Started */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={next}
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
});
