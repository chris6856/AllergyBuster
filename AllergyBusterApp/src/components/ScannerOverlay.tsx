import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {colors, spacing} from '../constants/theme';

interface Props {
  torchOn: boolean;
  onToggleTorch: () => void;
  hint?: string;
}

export function ScannerOverlay({torchOn, onToggleTorch, hint}: Props) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Semi-transparent top overlay */}
      <View style={styles.topOverlay} />

      {/* Middle row: side overlays + viewfinder frame */}
      <View style={styles.middle}>
        <View style={styles.sideOverlay} />
        <View style={styles.frame}>
          {/* Corner indicators */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <View style={styles.sideOverlay} />
      </View>

      {/* Bottom overlay with hint and torch */}
      <View style={styles.bottomOverlay}>
        {hint && <Text style={styles.hint}>{hint}</Text>}
        <TouchableOpacity
          style={styles.torchButton}
          onPress={onToggleTorch}
          accessibilityLabel={torchOn ? 'Turn off torch' : 'Turn on torch'}
          accessibilityRole="button">
          <Text style={styles.torchIcon}>{torchOn ? '🔦' : '💡'}</Text>
          <Text style={styles.torchLabel}>{torchOn ? 'Torch On' : 'Torch Off'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  middle: {
    flexDirection: 'row',
    height: FRAME_SIZE,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.white,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  hint: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
    opacity: 0.9,
  },
  torchButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  torchIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  torchLabel: {
    color: colors.white,
    fontSize: 12,
    opacity: 0.8,
  },
});
