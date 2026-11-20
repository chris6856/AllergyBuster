import React from 'react';
import {ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {usePreferences} from '../providers/PreferencesProvider';
import {useAllergyProfile} from '../providers/AllergyProfileProvider';
import {profileLabel} from '../utils/allergenMatching';
import {RootNavigationProp} from '../navigation/navigationTypes';

// Presets as % of FDA Daily Value per serving (5% DV = low, 20% DV = high).
const SUGAR_PRESETS_G = [5, 10, 15, 25];           // 10%, 20%, 30%, 50% of 50 g
const SODIUM_PRESETS_MG = [140, 230, 460, 690];    // ~6%, 10%, 20%, 30% of 2,300 mg

function ToggleRow(props: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{props.title}</Text>
          <Text style={styles.rowDescription}>{props.description}</Text>
        </View>
        <Switch
          value={props.value}
          onValueChange={props.onChange}
          trackColor={{true: colors.primaryLight, false: colors.border}}
          thumbColor={props.value ? colors.primary : colors.surface}
          accessibilityLabel={props.title}
        />
      </View>
      {props.value && props.children}
    </View>
  );
}

function Presets<T extends number>(props: {
  label: string;
  options: T[];
  value: T;
  format: (v: T) => string;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.presets}>
      <Text style={styles.presetLabel}>{props.label}</Text>
      <View style={styles.presetRow}>
        {props.options.map(opt => {
          const on = opt === props.value;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => props.onSelect(opt)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="radio"
              accessibilityState={{selected: on}}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{props.format(opt)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/**
 * "My Product Preferences": which categories AllergyBuster highlights when
 * analysing a product. Changes save immediately.
 */
export function PreferencesScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const {preferences: p, update} = usePreferences();
  const {profile, hasProfile} = useAllergyProfile();
  const save = (patch: Parameters<typeof update>[0]) => update(patch).catch(() => {});

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Choose what AllergyBuster highlights when it analyzes a product. These
        settings personalize explanations. They aren't medical advice or a
        safety rating.
      </Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AllergyProfile')}
        accessibilityRole="button"
        accessibilityLabel="Food allergens. Edit my allergies">
        <View style={styles.row}>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Food allergens</Text>
            <Text style={styles.rowDescription}>
              {hasProfile
                ? profile.allergens.map(profileLabel).join(', ')
                : 'Not set up. Choose your allergens to get personal alerts.'}
            </Text>
          </View>
          <Text style={styles.link}>Edit ›</Text>
        </View>
      </TouchableOpacity>

      <ToggleRow
        title="Food additives"
        description="Explain preservatives, colors, emulsifiers and other additives."
        value={p.additives}
        onChange={v => save({additives: v})}
      />

      <ToggleRow
        title="Added sugar"
        description="Flag products above your limit per serving."
        value={p.addedSugar.enabled}
        onChange={v => save({addedSugar: {...p.addedSugar, enabled: v}})}>
        <Presets
          label="Limit per serving"
          options={SUGAR_PRESETS_G}
          value={p.addedSugar.limitPerServingG}
          format={v => `${v} g`}
          onSelect={v => save({addedSugar: {...p.addedSugar, limitPerServingG: v}})}
        />
        <Text style={styles.hint}>FDA considers 10 g (20% of the Daily Value) per serving high.</Text>
      </ToggleRow>

      <ToggleRow
        title="Sodium"
        description="Flag products above your limit per serving."
        value={p.sodium.enabled}
        onChange={v => save({sodium: {...p.sodium, enabled: v}})}>
        <Presets
          label="Limit per serving"
          options={SODIUM_PRESETS_MG}
          value={p.sodium.limitPerServingMg}
          format={v => `${v} mg`}
          onSelect={v => save({sodium: {...p.sodium, limitPerServingMg: v}})}
        />
        <Text style={styles.hint}>FDA considers 460 mg (20% of the Daily Value) per serving high.</Text>
      </ToggleRow>

      <ToggleRow
        title="PFAS and packaging"
        description="Show packaging materials, available evidence and data gaps."
        value={p.packaging}
        onChange={v => save({packaging: v})}
      />

      <ToggleRow
        title="Fragrance ingredients"
        description="Highlight fragrance and listed fragrance allergens in personal care and household products."
        value={p.fragrance}
        onChange={v => save({fragrance: v})}
      />

      <Text style={styles.note}>Saved on this device only.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: spacing.xl},
  intro: {fontSize: fontSizes.md, color: colors.textPrimary, lineHeight: 22, marginBottom: spacing.md},
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  rowBody: {flex: 1, marginRight: spacing.md},
  rowTitle: {fontSize: fontSizes.md, fontWeight: '700', color: colors.textPrimary},
  rowDescription: {fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 18},
  link: {fontSize: fontSizes.md, fontWeight: '700', color: colors.primary},
  presets: {marginTop: spacing.md},
  presetLabel: {fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.xs},
  presetRow: {flexDirection: 'row', flexWrap: 'wrap'},
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {fontSize: fontSizes.sm, color: colors.textPrimary, fontWeight: '600'},
  chipTextOn: {color: colors.white},
  hint: {fontSize: fontSizes.xs, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs},
  note: {fontSize: fontSizes.xs, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.md, textAlign: 'center'},
});
