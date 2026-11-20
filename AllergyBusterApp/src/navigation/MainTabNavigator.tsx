import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StyleSheet, Text} from 'react-native';
import {MainTabParamList} from './navigationTypes';
import {HomeScreen} from '../screens/HomeScreen';
import {ScanStack} from './ScanStack';
import {ProductsStack} from './ProductsStack';
import {ListStack} from './ListStack';
import {AskJeevesScreen} from '../screens/AskJeevesScreen';
import {colors, fontSizes} from '../constants/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, string> = {
  Home: '🏠',
  ScanTab: '📷',
  ProductsTab: '⭐',
  ListTab: '🛒',
  JeevesTab: '🎩',
};

// Defined outside the navigator so React doesn't remount icons each render.
function renderIcon(name: keyof MainTabParamList) {
  return ({focused}: {focused: boolean}) => (
    <Text style={focused ? styles.iconFocused : styles.icon}>{ICONS[name]}</Text>
  );
}

const icons = {
  Home: renderIcon('Home'),
  ScanTab: renderIcon('ScanTab'),
  ProductsTab: renderIcon('ProductsTab'),
  ListTab: renderIcon('ListTab'),
  JeevesTab: renderIcon('JeevesTab'),
};

/** Tabs: Home · Scan (barcode / label / search) · My Products · List · Ask Jeeves. */
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {backgroundColor: colors.surface},
        tabBarLabelStyle: {fontSize: fontSizes.xs},
      }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{title: 'Home', tabBarIcon: icons.Home}} />
      <Tab.Screen name="ScanTab" component={ScanStack} options={{title: 'Scan', tabBarIcon: icons.ScanTab}} />
      <Tab.Screen name="ProductsTab" component={ProductsStack} options={{title: 'My Products', tabBarIcon: icons.ProductsTab}} />
      <Tab.Screen name="ListTab" component={ListStack} options={{title: 'List', tabBarIcon: icons.ListTab}} />
      <Tab.Screen name="JeevesTab" component={AskJeevesScreen} options={{title: 'Ask Jeeves', tabBarIcon: icons.JeevesTab}} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: {fontSize: 20, opacity: 0.6},
  iconFocused: {fontSize: 22, opacity: 1},
});
