import {useInstallAge} from './useInstallAge';
import {TRIAL_DAYS} from '../constants/purchases';

export function useTrialStatus() {
  const {daysSinceInstall, isLoading} = useInstallAge();

  return {
    isLoading,
    daysSinceInstall,
    trialExpired: daysSinceInstall !== null && daysSinceInstall >= TRIAL_DAYS,
  };
}
