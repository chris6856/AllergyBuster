import React, {useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  detail: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    quote:
      'AllergyBuster saved me at a birthday party. I scanned the cake box and found it contained tree nuts before my daughter took a bite.',
    author: 'Sarah M.',
    detail: 'Parent of a child with tree nut allergy',
  },
  {
    id: '2',
    quote:
      'Finally an app that just tells me what\'s in my food without ten extra steps. The barcode scan is instant.',
    author: 'James T.',
    detail: 'Living with peanut and shellfish allergies',
  },
  {
    id: '3',
    quote:
      'I travel a lot for work and eating out is always stressful. The restaurant search gives me a starting point before I even walk in the door.',
    author: 'Priya K.',
    detail: 'Wheat and sesame allergy',
  },
  {
    id: '4',
    quote:
      'The daily tips are genuinely useful. I learned that "wheat-free" doesn\'t mean gluten-free — something I hadn\'t thought about.',
    author: 'David R.',
    detail: 'Coeliac disease',
  },
  {
    id: '5',
    quote:
      'My son is newly diagnosed with a milk allergy and I was overwhelmed. This app made label reading so much less scary.',
    author: 'Angela F.',
    detail: 'Parent of a child with milk allergy',
  },
  {
    id: '6',
    quote:
      'The photo scan is a lifesaver for small print and busy ingredient lists. I can\'t believe how quickly it picks up allergens.',
    author: 'Marcus L.',
    detail: 'Multiple food allergies',
  },
];

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.md * 3;

export function TestimonialsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const viewabilityConfig = useRef({viewAreaCoveragePercentThreshold: 50});

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.heading}>What People Are Saying</Text>

      <FlatList
        data={TESTIMONIALS}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + spacing.sm}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
        renderItem={({item}) => (
          <View style={[styles.card, {width: CARD_WIDTH}]}>
            <Text style={styles.quoteIcon}>"</Text>
            <Text style={styles.quote}>{item.quote}</Text>
            <View style={styles.attribution}>
              <Text style={styles.author}>{item.author}</Text>
              <Text style={styles.detail}>{item.detail}</Text>
            </View>
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {TESTIMONIALS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: spacing.md,
  },
  heading: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  quoteIcon: {
    fontSize: 40,
    lineHeight: 40,
    color: colors.primaryLight,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  quote: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    flex: 1,
  },
  attribution: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  author: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detail: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },
});
