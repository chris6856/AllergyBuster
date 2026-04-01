import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PhotoStackParamList} from './navigationTypes';
import {PhotoCaptureScreen} from '../screens/photo/PhotoCaptureScreen';
import {PhotoResultScreen} from '../screens/photo/PhotoResultScreen';
import {colors} from '../constants/theme';

const Stack = createNativeStackNavigator<PhotoStackParamList>();

export function PhotoStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.surface},
        headerTintColor: colors.primary,
        headerTitleStyle: {fontWeight: '600'},
      }}>
      <Stack.Screen
        name="PhotoCapture"
        component={PhotoCaptureScreen}
        options={{title: 'Scan Label', headerShown: false}}
      />
      <Stack.Screen
        name="PhotoResult"
        component={PhotoResultScreen}
        options={{title: 'Allergen Info'}}
      />
    </Stack.Navigator>
  );
}
