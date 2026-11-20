import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ListStackParamList} from './navigationTypes';
import {ShoppingListScreen} from '../screens/list/ShoppingListScreen';
import {colors} from '../constants/theme';

const Stack = createNativeStackNavigator<ListStackParamList>();

export function ListStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.surface},
        headerTintColor: colors.primary,
        headerTitleStyle: {fontWeight: '600'},
      }}>
      <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{title: 'Shopping List'}} />
    </Stack.Navigator>
  );
}
