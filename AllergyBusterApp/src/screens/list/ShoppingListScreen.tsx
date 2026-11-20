import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
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
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {ShoppingListItem} from '../../types/pantry';
import {useListActions, useListItems, useSavedProducts, useShoppingLists} from '../../hooks/usePantry';
import {ApprovalBadge} from '../../components/ApprovalBadge';
import {ListStackScreenProps} from '../../navigation/navigationTypes';

type Nav = ListStackScreenProps<'ShoppingList'>['navigation'];

function ItemRow({item, onOpen}: {item: ShoppingListItem; onOpen?: () => void}) {
  const {check, quantity} = useListActions();
  return (
    <View style={[styles.item, item.checked && styles.itemChecked]}>
      <TouchableOpacity
        onPress={() => check.mutate([item.id, !item.checked])}
        style={[styles.checkbox, item.checked && styles.checkboxOn]}
        accessibilityRole="checkbox"
        accessibilityState={{checked: item.checked}}
        accessibilityLabel={item.label}>
        {item.checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </TouchableOpacity>
      <TouchableOpacity style={styles.itemBody} onPress={onOpen} disabled={!onOpen} accessibilityRole={onOpen ? 'button' : 'text'}>
        <Text style={[styles.itemLabel, item.checked && styles.itemLabelChecked]} numberOfLines={2}>{item.label}</Text>
        {item.gtin ? <ApprovalBadge status={item.approvalStatus} recheck={item.recheckNeeded} /> : null}
      </TouchableOpacity>
      <View style={styles.qty}>
        <TouchableOpacity onPress={() => quantity.mutate([item.id, item.quantity - 1])} style={styles.qtyButton} accessibilityLabel={`Decrease ${item.label}`}>
          <Text style={styles.qtyButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => quantity.mutate([item.id, item.quantity + 1])} style={styles.qtyButton} accessibilityLabel={`Increase ${item.label}`}>
          <Text style={styles.qtyButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * My Healthy Shopping list: reusable lists built from approved products
 * (plus free-text items). Ticking items is for the trip; "Finish trip"
 * clears or resets them.
 */
export function ShoppingListScreen() {
  const navigation = useNavigation<Nav>();
  const {data: lists = []} = useShoppingLists();
  const [listId, setListId] = useState<string | null>(null);
  const activeId = listId ?? lists[0]?.id ?? null;
  const {data: items = []} = useListItems(activeId);
  const {data: approved = []} = useSavedProducts({status: 'approved'});
  const actions = useListActions();
  const [text, setText] = useState('');
  const [newListName, setNewListName] = useState<string | null>(null);

  // If the selected list was deleted, fall back to the first one.
  useEffect(() => {
    if (listId && lists.length && !lists.some(l => l.id === listId)) {
      setListId(null);
    }
  }, [lists, listId]);

  const onListGtins = useMemo(() => new Set(items.filter(i => !i.checked && i.gtin).map(i => i.gtin)), [items]);
  const quickAdd = approved.filter(p => !onListGtins.has(p.gtin)).slice(0, 12);
  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);
  const recheckCount = unchecked.filter(i => i.recheckNeeded).length;

  const addText = () => {
    const label = text.trim();
    if (label && activeId) {
      actions.addFreeText.mutate([activeId, label]);
      setText('');
    }
  };

  const createList = async () => {
    const name = (newListName ?? '').trim();
    if (!name) {
      setNewListName(null);
      return;
    }
    const id = await actions.create.mutateAsync([name]);
    setNewListName(null);
    setListId(id);
  };

  const listMenu = (id: string, name: string) =>
    Alert.alert(name, undefined, [
      {text: 'Cancel', style: 'cancel'},
      ...(lists.length > 1
        ? [{
            text: 'Delete list',
            style: 'destructive' as const,
            onPress: () =>
              Alert.alert(`Delete "${name}"?`, 'Its items will be removed. Saved products stay in My Products.', [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Delete', style: 'destructive', onPress: () => actions.remove.mutate([id])},
              ]),
          }]
        : []),
    ]);

  const finishTrip = () =>
    Alert.alert('Finish shopping trip', 'What should happen to the items you ticked?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Keep for next time', onPress: () => activeId && actions.finish.mutate([activeId, 'reset'])},
      {text: 'Remove them', style: 'destructive', onPress: () => activeId && actions.finish.mutate([activeId, 'remove'])},
    ]);

  const openProduct = (gtin: string) => navigation.navigate('ProductsTab', {screen: 'SavedProduct', params: {gtin}});

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lists}>
          {lists.map(l => (
            <TouchableOpacity
              key={l.id}
              onPress={() => setListId(l.id)}
              onLongPress={() => listMenu(l.id, l.name)}
              style={[styles.listChip, l.id === activeId && styles.listChipOn]}
              accessibilityRole="button"
              accessibilityState={{selected: l.id === activeId}}
              accessibilityHint="Long press for list options">
              <Text style={[styles.listChipText, l.id === activeId && styles.listChipTextOn]}>
                {l.name} {l.uncheckedCount ? `(${l.uncheckedCount})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
          {newListName === null ? (
            <TouchableOpacity onPress={() => setNewListName('')} style={styles.listChip} accessibilityRole="button">
              <Text style={styles.listChipText}>+ New list</Text>
            </TouchableOpacity>
          ) : (
            <TextInput
              autoFocus
              value={newListName}
              onChangeText={setNewListName}
              onSubmitEditing={createList}
              onBlur={createList}
              placeholder="List name"
              style={styles.newListInput}
              returnKeyType="done"
              maxLength={40}
            />
          )}
        </ScrollView>

        {recheckCount ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              {recheckCount} item{recheckCount === 1 ? ' has' : 's have'} changed ingredients since you approved
              {recheckCount === 1 ? ' it' : ' them'}. Tap to review before you buy.
            </Text>
          </View>
        ) : null}

        <View style={styles.addRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={addText}
            placeholder="Add an item (e.g. bananas)"
            style={styles.addInput}
            returnKeyType="done"
            maxLength={80}
          />
          <TouchableOpacity onPress={addText} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Add item">
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {unchecked.length === 0 && checked.length === 0 ? (
          <Text style={styles.empty}>
            Your list is empty. Add approved products below, or from any product's Insights screen.
          </Text>
        ) : null}
        {unchecked.map(i => (
          <ItemRow key={i.id} item={i} onOpen={i.gtin ? () => openProduct(i.gtin!) : undefined} />
        ))}
        {checked.length ? (
          <>
            <Text style={styles.sectionLabel}>In the cart ({checked.length})</Text>
            {checked.map(i => (
              <ItemRow key={i.id} item={i} onOpen={i.gtin ? () => openProduct(i.gtin!) : undefined} />
            ))}
            <TouchableOpacity onPress={finishTrip} style={styles.finish} accessibilityRole="button">
              <Text style={styles.finishText}>Finish shopping trip</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {quickAdd.length && activeId ? (
          <>
            <Text style={styles.sectionLabel}>Add from your approved products</Text>
            {quickAdd.map(p => (
              <TouchableOpacity
                key={p.gtin}
                style={styles.quick}
                onPress={() => actions.addProduct.mutate([activeId, p.gtin, [p.brand, p.name].filter(Boolean).join(' ')])}
                accessibilityRole="button"
                accessibilityLabel={`Add ${p.name}`}>
                <Text style={styles.quickPlus}>+</Text>
                <View style={styles.itemBody}>
                  <Text style={styles.itemLabel} numberOfLines={1}>{p.name}</Text>
                  {p.recheckNeeded ? <ApprovalBadge status={null} recheck /> : null}
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        <Text style={styles.note}>
          Approval reflects your own choice, not a safety certification. Retailer substitutions may differ
          from your approved products.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: spacing.xl},
  lists: {paddingBottom: spacing.sm},
  listChip: {borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: borderRadius.full, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, marginRight: spacing.xs},
  listChipOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  listChipText: {fontSize: fontSizes.sm, fontWeight: '600', color: colors.textPrimary},
  listChipTextOn: {color: colors.white},
  newListInput: {borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.full, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, minWidth: 140, fontSize: fontSizes.sm, backgroundColor: colors.surface},
  banner: {backgroundColor: colors.warningLight, borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.sm},
  bannerText: {fontSize: fontSizes.sm, color: colors.textPrimary},
  addRow: {flexDirection: 'row', marginBottom: spacing.sm},
  addInput: {flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSizes.md},
  addButton: {backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, justifyContent: 'center', marginLeft: spacing.xs},
  addButtonText: {color: colors.white, fontWeight: '700'},
  empty: {fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.lg, lineHeight: 20},
  item: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.sm, marginBottom: spacing.xs},
  itemChecked: {opacity: 0.6},
  checkbox: {width: 28, height: 28, borderRadius: borderRadius.sm, borderWidth: 2, borderColor: colors.textDisabled, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm},
  checkboxOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  checkmark: {color: colors.white, fontWeight: '800'},
  itemBody: {flex: 1},
  itemLabel: {fontSize: fontSizes.md, color: colors.textPrimary, fontWeight: '600'},
  itemLabelChecked: {textDecorationLine: 'line-through'},
  qty: {flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm},
  qtyButton: {width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  qtyButtonText: {fontSize: fontSizes.lg, color: colors.textPrimary, lineHeight: 22},
  qtyText: {minWidth: 24, textAlign: 'center', fontWeight: '700', color: colors.textPrimary},
  sectionLabel: {fontSize: fontSizes.xs, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs},
  finish: {alignSelf: 'center', marginTop: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.xs, paddingHorizontal: spacing.md},
  finishText: {color: colors.primary, fontWeight: '700'},
  quick: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, padding: spacing.sm, marginBottom: spacing.xs},
  quickPlus: {fontSize: fontSizes.xl, color: colors.primary, fontWeight: '800', width: 28, textAlign: 'center', marginRight: spacing.sm},
  note: {fontSize: fontSizes.xs, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.lg},
});
