import { AdMob, AdMobRewardItem } from '@capacitor-community/admob';

/**
 * AdsService — Capacitor AdMob을 이용한 네이티브 광고 연동 서비스
 */
export const AdsService = {
  async init(): Promise<void> {
    try {
      await AdMob.initialize({
        initializeForTesting: true, // 테스트 모드 활성화
      });
    } catch (e) {
      console.error('[AdsService] Initialize failed:', e);
    }
  },

  notifyLoadingStop(): void {},
  gameplayStart(): void {},
  gameplayStop(): void {},

  /**
   * 전면 광고 미리 준비 (GameScene 시작 시 호출 권장)
   */
  async prepareInterstitial(): Promise<void> {
    const adId = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID;
    if (!adId) return;
    try {
      await AdMob.prepareInterstitial({ adId });
      console.log('[AdsService] Interstitial prepared.');
    } catch (e) {
      console.error('[AdsService] Prepare Interstitial failed:', e);
    }
  },

  /**
   * 전면 광고 (Interstitial) - 경기 종료 시 호출
   */
  async showInterstitial(_scene: unknown, onClose: () => void): Promise<void> {
    const adId = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID;
    if (!adId) {
      onClose();
      return;
    }

    try {
      // 이미 준비된 광고가 있으면 바로 보여주고, 없으면 여기서 다시 prepare 시도
      await AdMob.showInterstitial();
      onClose();
    } catch (e) {
      // show 실패 시 (예: 로드 안됨) 다시 prepare 시도 후 show
      try {
        await AdMob.prepareInterstitial({ adId });
        await AdMob.showInterstitial();
      } catch (innerE) {
        console.error('[AdsService] Interstitial show failed:', innerE);
      }
      onClose();
    }
  },

  /**
   * 리워드 광고 (Rewarded) - 티켓 충전용
   */
  async showRewarded(_scene: unknown, onRewarded: () => void, onSkipped: () => void): Promise<void> {
    const adId = import.meta.env.VITE_ADMOB_REWARD_ID;
    if (!adId) {
      console.warn('[AdsService] No Rewarded Ad ID found.');
      onRewarded(); // 개발 편의를 위해 일단 보상 지급
      return;
    }

    try {
      await AdMob.prepareRewardVideoAd({ adId });
      const reward: AdMobRewardItem = await AdMob.showRewardVideoAd();
      
      if (reward && reward.amount > 0) {
        onRewarded();
      } else {
        onSkipped();
      }
    } catch (e) {
      console.error('[AdsService] Rewarded failed:', e);
      onRewarded(); // 에러 시에도 일단 진행 (실제 배포 시엔 처리 필요)
    }
  },

  // 레거시 메서드 호환성 유지
  requestMidgameAd(onDone: () => void): void { this.showInterstitial(null, onDone); },
  requestRewardedAd(onRewarded: () => void, onSkipped: () => void): void { this.showRewarded(null, onRewarded, onSkipped); },
};
