import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {APPROVAL_LABELS, ApprovalStatus} from '../types/pantry';

const COLORS: Record<ApprovalStatus, string> = {
  approved: colors.primary,
  needs_review: colors.warning,
  avoid: colors.danger,
};

export function ApprovalBadge({status, recheck}: {status: ApprovalStatus | null; recheck?: boolean}) {
  return (
    <View style={styles.row}>
      {status ? (
        <View style={[styles.badge, {borderColor: COLORS[status]}]}>
          <Text style={[styles.text, {color: COLORS[status]}]}>{APPROVAL_LABELS[status]}</Text>
        </View>
      ) : null}
      {recheck ? (
        <View style={[styles.badge, styles.recheck]}>
          <Text style={[styles.text, styles.recheckText]}>Recheck needed</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', flexWrap: 'wrap'},
  badge: {borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 1, marginRight: spacing.xs, marginTop: 2},
  text: {fontSize: fontSizes.xs, fontWeight: '700'},
  recheck: {backgroundColor: colors.warning, borderColor: colors.warning},
  recheckText: {color: colors.white},
});
