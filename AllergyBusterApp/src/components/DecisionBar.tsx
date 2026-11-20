import React from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {ProductRecord} from '../types/product';
import {APPROVAL_LABELS, ApprovalStatus} from '../types/pantry';
import {useListsContaining, usePantryActions, useSavedProduct} from '../hooks/usePantry';

const OPTIONS: {status: ApprovalStatus; icon: string; color: string}[] = [
  {status: 'approved', icon: '✓', color: colors.primary},
  {status: 'needs_review', icon: '?', color: colors.warning},
  {status: 'avoid', icon: '✕', color: colors.danger},
];

/**
 * "Your Shopping Decision": approve / needs review / avoid, add to list.
 * Approval is the user's choice, not a safety certification. Products
 * without a barcode can't be saved.
 */
export function DecisionBar({record}: {record: ProductRecord}) {
  const {data: saved} = useSavedProduct(record.gtin);
  const {data: onLists} = useListsContaining(record.gtin);
  const {decide, confirm, undecide, addToList} = usePantryActions();
  const busy = decide.isPending || confirm.isPending || undecide.isPending || addToList.isPending;

  if (!record.gtin) {
    return null;
  }
  const current = saved?.approval?.status ?? null;
  const onList = (onLists?.length ?? 0) > 0;

  const onPick = (status: ApprovalStatus) => {
    if (current === status) {
      undecide.mutate([record.gtin!]);
    } else {
      decide.mutate([record, status]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your decision</Text>

      {saved?.recheckNeeded && current ? (
        <View style={styles.recheck}>
          <Text style={styles.recheckText}>
            This product's ingredients or allergens changed since you marked it
            "{APPROVAL_LABELS[current]}". Review the details above, then confirm.
          </Text>
          <TouchableOpacity
            style={styles.recheckButton}
            onPress={() => confirm.mutate([record.gtin!, current])}
            accessibilityRole="button">
            <Text style={styles.recheckButtonText}>Confirm "{APPROVAL_LABELS[current]}"</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.row}>
        {OPTIONS.map(o => {
          const on = current === o.status;
          return (
            <TouchableOpacity
              key={o.status}
              style={[styles.option, {borderColor: o.color}, on && {backgroundColor: o.color}]}
              onPress={() => onPick(o.status)}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{selected: on, disabled: busy}}
              accessibilityLabel={APPROVAL_LABELS[o.status]}
              accessibilityHint={on ? 'Tap again to clear your decision' : 'Saves this product to My Products'}>
              <Text style={[styles.optionIcon, {color: on ? colors.white : o.color}]}>{o.icon}</Text>
              <Text style={[styles.optionText, {color: on ? colors.white : o.color}]}>{APPROVAL_LABELS[o.status]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.listButton, onList && styles.listButtonOn]}
        onPress={() => addToList.mutate([record, undefined])}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={onList ? 'On your shopping list. Add another' : 'Add to shopping list'}>
        {busy ? (
          <ActivityIndicator color={onList ? colors.primary : colors.white} />
        ) : (
          <Text style={[styles.listButtonText, onList && styles.listButtonTextOn]}>
            {onList ? '✓ On your shopping list · add another' : '+ Add to shopping list'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        Your decision is your own choice, not a safety certification. Saved on this device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {backgroundColor: colors.surface, padding: spacing.md, marginTop: spacing.sm},
  heading: {fontSize: fontSizes.md, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm},
  row: {flexDirection: 'row', justifyContent: 'space-between'},
  option: {
    flex: 1,
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  optionIcon: {fontSize: fontSizes.lg, fontWeight: '800'},
  optionText: {fontSize: fontSizes.sm, fontWeight: '700', marginTop: 2},
  listButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
  },
  listButtonOn: {backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: colors.primary},
  listButtonText: {color: colors.white, fontWeight: '700', fontSize: fontSizes.md},
  listButtonTextOn: {color: colors.primary},
  recheck: {backgroundColor: colors.warningLight, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md},
  recheckText: {fontSize: fontSizes.sm, color: colors.textPrimary, lineHeight: 18},
  recheckButton: {marginTop: spacing.sm, alignSelf: 'flex-start', backgroundColor: colors.warning, borderRadius: borderRadius.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md},
  recheckButtonText: {color: colors.white, fontWeight: '700', fontSize: fontSizes.sm},
  note: {fontSize: fontSizes.xs, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.sm, textAlign: 'center'},
});
