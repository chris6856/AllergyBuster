import {useCallback, useEffect, useState} from 'react';
import {Linking, Platform} from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  PermissionStatus,
} from 'react-native-permissions';

type CameraPermissionStatus = 'loading' | 'granted' | 'denied' | 'blocked';

const CAMERA_PERMISSION =
  Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

export function useCameraPermission() {
  const [status, setStatus] = useState<CameraPermissionStatus>('loading');

  const checkPermission = useCallback(async () => {
    const result: PermissionStatus = await check(CAMERA_PERMISSION);
    switch (result) {
      case RESULTS.GRANTED:
        setStatus('granted');
        break;
      case RESULTS.DENIED:
        setStatus('denied');
        break;
      case RESULTS.BLOCKED:
      case RESULTS.UNAVAILABLE:
        setStatus('blocked');
        break;
      default:
        setStatus('denied');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await request(CAMERA_PERMISSION);
    if (result === RESULTS.GRANTED) {
      setStatus('granted');
    } else if (result === RESULTS.BLOCKED) {
      setStatus('blocked');
    } else {
      setStatus('denied');
    }
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    status,
    isGranted: status === 'granted',
    requestPermission,
    openSettings,
  };
}
