import React, {useCallback, useRef, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import {ScannerOverlay} from '../../components/ScannerOverlay';
import {useCameraPermission} from '../../hooks/useCameraPermission';
import {extractAllergensFromOcr} from '../../utils/ocrAllergenExtractor';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {PhotoStackScreenProps} from '../../navigation/navigationTypes';

type Props = PhotoStackScreenProps<'PhotoCapture'>;

export function PhotoCaptureScreen(_props: Props) {
  const navigation = useNavigation<Props['navigation']>();
  const isFocused = useIsFocused();
  const {status, requestPermission, openSettings} = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isProcessing) {
      return;
    }
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: torchOn ? 'on' : 'off',
      });

      // Avoid doubling the file:// prefix on devices that already include it
      const imagePath = photo.path.startsWith('file://')
        ? photo.path
        : `file://${photo.path}`;

      const result = await TextRecognition.recognize(imagePath);

      // ML Kit may return text as a flat string or only in blocks depending
      // on the device — try both and take whichever has content
      const blockText = (result as any).blocks
        ?.map((b: any) => b.text)
        .join('\n') ?? '';
      const ocrText = result.text?.trim() ? result.text : blockText;

      console.log('[OCR] raw text length:', ocrText.length);
      console.log('[OCR] first 300 chars:', ocrText.slice(0, 300));

      const extraction = extractAllergensFromOcr(ocrText);
      navigation.navigate('PhotoResult', {rawOcrText: extraction.rawText});
    } catch (e) {
      navigation.navigate('PhotoResult', {rawOcrText: ''});
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, torchOn, navigation]);

  if (status === 'loading') {
    return <View style={styles.centered} />;
  }

  if (status === 'denied') {
    return (
      <View style={styles.centered}>
        <Text style={styles.icon}>📷</Text>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.body}>
          AllergyBuster needs camera access to photograph product labels.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission} accessibilityRole="button">
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'blocked') {
    return (
      <View style={styles.centered}>
        <Text style={styles.icon}>🚫</Text>
        <Text style={styles.title}>Camera Access Blocked</Text>
        <Text style={styles.body}>
          Please enable camera access in your device Settings to photograph labels.
        </Text>
        <TouchableOpacity style={styles.button} onPress={openSettings} accessibilityRole="button">
          <Text style={styles.buttonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.body}>No camera found on this device.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && status === 'granted' && !isProcessing}
        photo
        torch={torchOn ? 'on' : 'off'}
        accessibilityLabel="Camera viewfinder"
      />

      <ScannerOverlay
        torchOn={torchOn}
        onToggleTorch={() => setTorchOn(t => !t)}
        hint="Hold the camera flat over the ingredient list in good lighting"
      />

      {/* Shutter button */}
      <View style={styles.shutterContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.shutterButton, isProcessing && styles.shutterDisabled]}
          onPress={handleCapture}
          disabled={isProcessing}
          accessibilityLabel="Capture photo"
          accessibilityRole="button">
          {isProcessing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </TouchableOpacity>
      </View>
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
  icon: {fontSize: 56, marginBottom: spacing.md},
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {color: colors.white, fontSize: fontSizes.md, fontWeight: '600'},
  shutterContainer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
  },
});
