import React, {useEffect, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {NavigationContainer, NavigationContainerRef, CommonActions} from '@react-navigation/native';
import {QueryClientProvider} from '@tanstack/react-query';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {queryClient} from './src/store/queryClient';
import {RootNavigator} from './src/navigation/RootNavigator';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import {RootStackParamList} from './src/navigation/navigationTypes';

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current === 'background' && nextState === 'active') {
        // App returned from background — reset to splash screen
        navigationRef.current?.dispatch(
          CommonActions.reset({index: 0, routes: [{name: 'Disclaimer'}]}),
        );
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer ref={navigationRef}>
              <RootNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
