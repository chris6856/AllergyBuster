import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ProductsStackParamList} from './navigationTypes';
import {MyProductsScreen} from '../screens/products/MyProductsScreen';
import {SavedProductScreen} from '../screens/products/SavedProductScreen';
import {colors} from '../constants/theme';

const Stack = createNativeStackNavigator<ProductsStackParamList>();

export function ProductsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.surface},
        headerTintColor: colors.primary,
        headerTitleStyle: {fontWeight: '600'},
      }}>
      <Stack.Screen name="MyProducts" component={MyProductsScreen} options={{title: 'My Products'}} />
      <Stack.Screen name="SavedProduct" component={SavedProductScreen} options={{title: 'Product Insights'}} />
    </Stack.Navigator>
  );
}
