import {useScanCount} from '../providers/ScanCountProvider';
import {FREE_SCANS} from '../constants/purchases';

export function useTrialStatus() {
  const {scanCount} = useScanCount();

  return {
    isLoading: scanCount === null,
    scanCount,
    trialExpired: scanCount !== null && scanCount >= FREE_SCANS,
  };
}
