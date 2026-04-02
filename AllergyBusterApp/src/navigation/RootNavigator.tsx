import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './navigationTypes';
import {MainTabNavigator} from './MainTabNavigator';
import {DisclaimerScreen} from '../screens/DisclaimerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen
        name="Disclaimer"
        component={DisclaimerScreen}
        options={{animation: 'fade'}}
      />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}
