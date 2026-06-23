import React, {useEffect, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {NavigationContainer, useNavigationContainerRef} from '@react-navigation/native';
import {QueryClientProvider} from '@tanstack/react-query';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {queryClient} from './src/store/queryClient';
import {RootNavigator} from './src/navigation/RootNavigator';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import {PurchaseProvider} from './src/providers/PurchaseProvider';

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const previousAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // 'background' (not 'inactive') means the app was actually backgrounded —
    // 'inactive' also fires for transient things like permission dialogs.
    // Some OSes cache the process instead of killing it on close, so the JS
    // state would otherwise survive and resume mid-screen; force it back to
    // Home so re-opening the app always feels like a fresh start.
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (previousAppState.current === 'background' && nextAppState === 'active') {
        navigationRef.current?.resetRoot({
          index: 0,
          routes: [{name: 'MainTabs'}],
        });
      }
      previousAppState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [navigationRef]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <PurchaseProvider>
              <NavigationContainer ref={navigationRef}>
                <RootNavigator />
              </NavigationContainer>
            </PurchaseProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
