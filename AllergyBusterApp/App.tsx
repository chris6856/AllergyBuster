import React, {useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import {NavigationContainer, useNavigationContainerRef} from '@react-navigation/native';
import {QueryClientProvider} from '@tanstack/react-query';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {queryClient} from './src/store/queryClient';
import {RootNavigator} from './src/navigation/RootNavigator';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import {PurchaseProvider} from './src/providers/PurchaseProvider';
import {ScanCountProvider} from './src/providers/ScanCountProvider';
import {scheduleWeeklyReminders} from './src/services/notificationService';

export default function App() {
  const navigationRef = useNavigationContainerRef();
  // Track whether the app reached 'background' since the last foreground.
  // We cannot use a simple prev→next comparison because on iOS returning from
  // background fires background → inactive → active, so by the time 'active'
  // fires the previous state is 'inactive', not 'background', and the check
  // silently fails. A separate boolean survives that intermediate step.
  const wasInBackground = useRef(false);

  useEffect(() => {
    // Reschedule silently on every launch — no-op if permission not granted.
    // Keeps reminders alive after reinstalls or OS notification resets.
    scheduleWeeklyReminders().catch(() => {});
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background') {
        wasInBackground.current = true;
      } else if (nextAppState === 'active' && wasInBackground.current) {
        wasInBackground.current = false;
        navigationRef.current?.resetRoot({
          index: 0,
          routes: [
            {
              name: 'MainTabs',
              state: {
                index: 0,
                routes: [{name: 'Home'}],
              },
            },
          ],
        });
      }
    });
    return () => subscription.remove();
  }, [navigationRef]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ScanCountProvider>
              <PurchaseProvider>
                <NavigationContainer ref={navigationRef}>
                  <RootNavigator />
                </NavigationContainer>
              </PurchaseProvider>
            </ScanCountProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
