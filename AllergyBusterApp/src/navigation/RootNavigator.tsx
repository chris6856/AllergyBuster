import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './navigationTypes';
import {MainTabNavigator} from './MainTabNavigator';
import {DisclaimerScreen} from '../screens/DisclaimerScreen';
import {useDisclaimerAccepted} from '../hooks/useDisclaimerAccepted';
import {colors} from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {accepted} = useDisclaimerAccepted();

  // Still reading AsyncStorage — show a blank loader to avoid flash
  if (accepted === null) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!accepted && (
        <Stack.Screen
          name="Disclaimer"
          component={DisclaimerScreen}
          options={{presentation: 'modal', animation: 'fade'}}
        />
      )}
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
