import React from 'react';
import {StyleSheet, View} from 'react-native';
import {MainTabNavigator} from './MainTabNavigator';
import {useTrialStatus} from '../hooks/useTrialStatus';
import {usePurchase} from '../providers/PurchaseProvider';
import {colors} from '../constants/theme';

/**
 * Since 1.3 the app is never locked as a whole. After the free scans,
 * scanning, product/restaurant search and Ask Jeeves show TrialLockedView
 * (each screen gates itself); My Products, shopping lists, profile and
 * preferences stay usable (2.0 plan decision 6).
 */
export function MainGate() {
  const {isLoading: trialLoading} = useTrialStatus();
  const {isLoading: purchaseLoading} = usePurchase();

  if (trialLoading || purchaseLoading) {
    return <View style={styles.loading} />;
  }
  return <MainTabNavigator />;
}

const styles = StyleSheet.create({
  loading: {flex: 1, backgroundColor: colors.background},
});
