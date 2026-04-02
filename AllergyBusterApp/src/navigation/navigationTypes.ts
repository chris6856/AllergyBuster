import {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';
import {BottomTabNavigationProp, BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp, CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';
import {Restaurant} from '../types/restaurant';

// --- Stack param lists ---

export type ScanStackParamList = {
  BarcodeScan: undefined;
  ScanResult: {barcode?: string; productId?: string};
};

export type PhotoStackParamList = {
  PhotoCapture: undefined;
  PhotoResult: {rawOcrText: string};
};

export type SearchStackParamList = {
  TextSearch: {initialQuery?: string; initialMode?: 'products' | 'restaurants'};
  SearchResult: {query: string; mode: 'products' | 'restaurants'};
  RestaurantDetail: {restaurant: Restaurant};
};

// --- Tab param list ---

export type MainTabParamList = {
  Home: undefined;
  ScanTab: NavigatorScreenParams<ScanStackParamList>;
  PhotoTab: NavigatorScreenParams<PhotoStackParamList>;
  SearchTab: NavigatorScreenParams<SearchStackParamList>;
};

// --- Root stack ---

export type RootStackParamList = {
  Disclaimer: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
};

// --- Typed navigation props ---

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type ScanStackScreenProps<T extends keyof ScanStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ScanStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<MainTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type PhotoStackScreenProps<T extends keyof PhotoStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<PhotoStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<MainTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type SearchStackScreenProps<T extends keyof SearchStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<SearchStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<MainTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

// --- Typed navigation hook helpers ---

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type MainTabNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
