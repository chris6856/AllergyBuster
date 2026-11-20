import {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';
import {BottomTabNavigationProp, BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp, CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';
import {Restaurant} from '../types/restaurant';

// --- Stack param lists ---

// The Scan tab holds barcode, label photo and search (incl. restaurants).
export type ScanStackParamList = {
  BarcodeScan: undefined;
  ScanResult: {barcode?: string; productId?: string};
  PhotoCapture: undefined;
  PhotoResult: {rawOcrText: string};
  TextSearch: {initialQuery?: string; initialMode?: 'products' | 'restaurants'};
  SearchResult: {query: string; mode: 'products' | 'restaurants'; location?: string; coords?: {lat: number; lng: number}};
  RestaurantDetail: {restaurant: Restaurant};
};

// Subsets kept so existing screens' prop types stay readable.
export type PhotoStackParamList = Pick<ScanStackParamList, 'PhotoCapture' | 'PhotoResult'>;
export type SearchStackParamList = Pick<ScanStackParamList, 'TextSearch' | 'SearchResult' | 'RestaurantDetail'>;

export type ProductsStackParamList = {
  MyProducts: undefined;
  SavedProduct: {gtin: string};
};

export type ListStackParamList = {
  ShoppingList: {listId?: string} | undefined;
};

// --- Tab param list ---

export type MainTabParamList = {
  Home: undefined;
  ScanTab: NavigatorScreenParams<ScanStackParamList>;
  ProductsTab: NavigatorScreenParams<ProductsStackParamList>;
  ListTab: NavigatorScreenParams<ListStackParamList>;
  JeevesTab: undefined;
};

// --- Root stack ---

export type RootStackParamList = {
  Disclaimer: undefined;
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  AllergyProfile: undefined;
  Preferences: undefined;
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

export type PhotoStackScreenProps<T extends keyof PhotoStackParamList> = ScanStackScreenProps<T>;

export type SearchStackScreenProps<T extends keyof SearchStackParamList> = ScanStackScreenProps<T>;

export type ProductsStackScreenProps<T extends keyof ProductsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProductsStackParamList, T>,
    CompositeScreenProps<
      BottomTabScreenProps<MainTabParamList>,
      NativeStackScreenProps<RootStackParamList>
    >
  >;

export type ListStackScreenProps<T extends keyof ListStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ListStackParamList, T>,
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
