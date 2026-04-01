import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ScanStackParamList} from './navigationTypes';
import {BarcodeScanScreen} from '../screens/scan/BarcodeScanScreen';
import {ScanResultScreen} from '../screens/scan/ScanResultScreen';
import {colors} from '../constants/theme';

const Stack = createNativeStackNavigator<ScanStackParamList>();

export function ScanStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.surface},
        headerTintColor: colors.primary,
        headerTitleStyle: {fontWeight: '600'},
      }}>
      <Stack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen}
        options={{title: 'Scan Barcode', headerShown: false}}
      />
      <Stack.Screen
        name="ScanResult"
        component={ScanResultScreen}
        options={{title: 'Allergen Info'}}
      />
    </Stack.Navigator>
  );
}
