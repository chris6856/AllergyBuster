import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ScanStackParamList} from '../navigation/navigationTypes';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

type Mode = 'BarcodeScan' | 'PhotoCapture' | 'TextSearch';

const MODES: {route: Mode; label: string}[] = [
  {route: 'BarcodeScan', label: 'Barcode'},
  {route: 'PhotoCapture', label: 'Label'},
  {route: 'TextSearch', label: 'Search'},
];

/**
 * Switches between the Scan tab's three entry screens. Uses replace() so
 * cameras don't stack up behind each other.
 * `overlay`: floats over a full-screen camera (respects the safe area).
 */
export function ScanModeBar({current, overlay = false}: {current: Mode; overlay?: boolean}) {
  const navigation = useNavigation<NativeStackNavigationProp<ScanStackParamList>>();
  const insets = useSafeAreaInsets();

  const go = (route: Mode) => {
    if (route === current) {
      return;
    }
    if (route === 'TextSearch') {
      navigation.replace('TextSearch', {initialMode: 'products'});
    } else {
      navigation.replace(route);
    }
  };

  return (
    <View
      style={[styles.wrap, overlay ? [styles.overlay, {top: insets.top + spacing.sm}] : styles.inline]}
      accessibilityRole="tablist">
      {MODES.map(m => {
        const on = m.route === current;
        return (
          <TouchableOpacity
            key={m.route}
            onPress={() => go(m.route)}
            style={[styles.segment, on && styles.segmentOn]}
            accessibilityRole="tab"
            accessibilityState={{selected: on}}
            accessibilityLabel={`Scan by ${m.label.toLowerCase()}`}>
            <Text style={[styles.label, !overlay && !on && styles.labelInline, on && styles.labelOn]}>{m.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: borderRadius.full,
    padding: 3,
  },
  overlay: {position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10},
  inline: {backgroundColor: colors.border, marginTop: spacing.sm, marginBottom: spacing.xs},
  segment: {paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: borderRadius.full},
  segmentOn: {backgroundColor: colors.primary},
  label: {fontSize: fontSizes.sm, fontWeight: '700', color: colors.white},
  labelInline: {color: colors.textPrimary},
  labelOn: {color: colors.white},
});
