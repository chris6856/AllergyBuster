import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ScanStackParamList} from './navigationTypes';
import {BarcodeScanScreen} from '../screens/scan/BarcodeScanScreen';
import {ScanResultScreen} from '../screens/scan/ScanResultScreen';
import {PhotoCaptureScreen} from '../screens/photo/PhotoCaptureScreen';
import {PhotoResultScreen} from '../screens/photo/PhotoResultScreen';
import {TextSearchScreen} from '../screens/search/TextSearchScreen';
import {SearchResultScreen} from '../screens/search/SearchResultScreen';
import {RestaurantDetailScreen} from '../screens/search/RestaurantDetailScreen';
import {colors} from '../constants/theme';

const Stack = createNativeStackNavigator<ScanStackParamList>();

/** Scan tab: barcode, label photo and search share one stack (ScanModeBar switches). */
export function ScanStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.surface},
        headerTintColor: colors.primary,
        headerTitleStyle: {fontWeight: '600'},
      }}>
      <Stack.Screen name="BarcodeScan" component={BarcodeScanScreen} options={{title: 'Scan Barcode', headerShown: false}} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} options={{title: 'Product Insights'}} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} options={{title: 'Scan Label', headerShown: false, animation: 'none'}} />
      <Stack.Screen name="PhotoResult" component={PhotoResultScreen} options={{title: 'Label Results'}} />
      <Stack.Screen name="TextSearch" component={TextSearchScreen} options={{title: 'Search', animation: 'none'}} />
      <Stack.Screen name="SearchResult" component={SearchResultScreen} options={{title: 'Results'}} />
      <Stack.Screen
        name="RestaurantDetail"
        component={RestaurantDetailScreen}
        options={({route}) => ({title: route.params.restaurant.name})}
      />
    </Stack.Navigator>
  );
}
