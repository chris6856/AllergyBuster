import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import {MainTabParamList} from './navigationTypes';
import {HomeScreen} from '../screens/HomeScreen';
import {ScanStack} from './ScanStack';
import {PhotoStack} from './PhotoStack';
import {SearchStack} from './SearchStack';
import {AskJeevesScreen} from '../screens/AskJeevesScreen';
import {colors, fontSizes} from '../constants/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({label, focused}: {label: string; focused: boolean}) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Scan: '📷',
    Photo: '🖼️',
    Search: '🔍',
    Jeeves: '🎩',
  };
  return (
    <Text style={{fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6}}>
      {icons[label]}
    </Text>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {backgroundColor: colors.surface},
        tabBarLabelStyle: {fontSize: fontSizes.xs},
        headerStyle: {backgroundColor: colors.surface},
        headerTintColor: colors.primary,
        headerTitleStyle: {fontWeight: '600'},
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({focused}) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={{
          title: 'Scan',
          headerShown: false,
          tabBarIcon: ({focused}) => <TabIcon label="Scan" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="PhotoTab"
        component={PhotoStack}
        options={{
          title: 'Photo',
          headerShown: false,
          tabBarIcon: ({focused}) => <TabIcon label="Photo" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{
          title: 'Search',
          headerShown: false,
          tabBarIcon: ({focused}) => <TabIcon label="Search" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="JeevesTab"
        component={AskJeevesScreen}
        options={{
          title: 'Ask Jeeves',
          headerShown: false,
          tabBarIcon: ({focused}) => <TabIcon label="Jeeves" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
