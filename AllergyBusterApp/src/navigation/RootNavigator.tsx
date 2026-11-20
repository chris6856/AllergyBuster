import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './navigationTypes';
import {MainGate} from './MainGate';
import {DisclaimerScreen} from '../screens/DisclaimerScreen';
import {OnboardingScreen} from '../screens/OnboardingScreen';
import {AllergyProfileScreen} from '../screens/AllergyProfileScreen';
import {PreferencesScreen} from '../screens/PreferencesScreen';
import {colors} from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen
        name="Disclaimer"
        component={DisclaimerScreen}
        options={{animation: 'fade'}}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{animation: 'fade'}}
      />
      <Stack.Screen name="MainTabs" component={MainGate} />
      <Stack.Screen
        name="AllergyProfile"
        component={AllergyProfileScreen}
        options={{
          headerShown: true,
          title: 'My Allergies',
          headerTintColor: colors.primary,
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{
          headerShown: true,
          title: 'My Preferences',
          headerTintColor: colors.primary,
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}
