import React from 'react';
import {Modal, View} from 'react-native';
import {MainTabNavigator} from './MainTabNavigator';
import {PaywallScreen} from '../screens/PaywallScreen';
import {useTrialStatus} from '../hooks/useTrialStatus';
import {usePurchase} from '../providers/PurchaseProvider';
import {colors} from '../constants/theme';

export function MainGate() {
  const {isLoading: trialLoading, trialExpired} = useTrialStatus();
  const {isLoading: purchaseLoading, isPurchased} = usePurchase();

  if (trialLoading || purchaseLoading) {
    return <View style={{flex: 1, backgroundColor: colors.background}} />;
  }

  return (
    <>
      <MainTabNavigator />
      {trialExpired && !isPurchased && (
        <Modal visible animationType="slide" onRequestClose={() => {}}>
          <PaywallScreen />
        </Modal>
      )}
    </>
  );
}
