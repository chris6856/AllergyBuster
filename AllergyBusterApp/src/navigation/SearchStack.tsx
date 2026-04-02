import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SearchStackParamList} from './navigationTypes';
import {TextSearchScreen} from '../screens/search/TextSearchScreen';
import {SearchResultScreen} from '../screens/search/SearchResultScreen';
import {RestaurantDetailScreen} from '../screens/search/RestaurantDetailScreen';
import {colors} from '../constants/theme';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.surface},
        headerTintColor: colors.primary,
        headerTitleStyle: {fontWeight: '600'},
      }}>
      <Stack.Screen
        name="TextSearch"
        component={TextSearchScreen}
        options={{title: 'Search'}}
      />
      <Stack.Screen
        name="SearchResult"
        component={SearchResultScreen}
        options={{title: 'Results'}}
      />
      <Stack.Screen
        name="RestaurantDetail"
        component={RestaurantDetailScreen}
        options={({route}) => ({title: route.params.restaurant.name})}
      />
    </Stack.Navigator>
  );
}
