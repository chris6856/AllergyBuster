import React, {useCallback, useRef, useState} from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import {ScannerOverlay} from '../../components/ScannerOverlay';
import {useCameraPermission} from '../../hooks/useCameraPermission';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {ScanStackScreenProps} from '../../navigation/navigationTypes';

type Props = ScanStackScreenProps<'BarcodeScan'>;

export function BarcodeScanScreen(_props: Props) {
  const navigation = useNavigation<Props['navigation']>();
  const isFocused = useIsFocused();
  const {status, requestPermission, openSettings} = useCameraPermission();
  const device = useCameraDevice('back');
  const [torchOn, setTorchOn] = useState(false);
  const isProcessing = useRef(false);

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'code-39'],
    onCodeScanned: useCallback(
      (codes) => {
        if (isProcessing.current || !codes.length) {
          return;
        }
        const value = codes[0].value;
        if (!value) {
          return;
        }
        isProcessing.current = true;
        navigation.navigate('ScanResult', {barcode: value});
        // Reset after a short delay to allow re-scanning after returning
        setTimeout(() => {
          isProcessing.current = false;
        }, 1500);
      },
      [navigation],
    ),
  });

  // Permission: still loading
  if (status === 'loading') {
    return <View style={styles.centered} />;
  }

  // Permission: denied — show request prompt
  if (status === 'denied') {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionBody}>
          AllergyBuster needs camera access to scan product barcodes.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          accessibilityRole="button">
          <Text style={styles.permissionButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Permission: blocked — user must go to Settings
  if (status === 'blocked') {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionIcon}>🚫</Text>
        <Text style={styles.permissionTitle}>Camera Access Blocked</Text>
        <Text style={styles.permissionBody}>
          Camera access has been denied. Please enable it in your device Settings to use the barcode scanner.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={openSettings}
          accessibilityRole="button">
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No back camera available (shouldn't happen on real devices)
  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionBody}>No camera found on this device.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && status === 'granted'}
        codeScanner={codeScanner}
        torch={torchOn ? 'on' : 'off'}
        accessibilityLabel="Camera viewfinder"
      />
      <ScannerOverlay
        torchOn={torchOn}
        onToggleTorch={() => setTorchOn(t => !t)}
        hint="Point the camera at a product barcode"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  permissionIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  permissionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
