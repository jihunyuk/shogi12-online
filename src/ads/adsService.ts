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
   * 전면 광고 (Interstitial) - 경기 종료 시 호출
   */
  async showInterstitial(_scene: unknown, onClose: () => void): Promise<void> {
    const adId = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID;
    if (!adId) {
      console.warn('[AdsService] No Interstitial Ad ID found.');
      onClose();
      return;
    }

    try {
      await AdMob.prepareInterstitial({ adId });
      await AdMob.showInterstitial();
      // 광고가 닫혔을 때의 콜백은 AdMob 플러그인 리스너로 처리할 수도 있으나, 
      // 단순 구현을 위해 show 완료 후 바로 리턴합니다.
      onClose();
    } catch (e) {
      console.error('[AdsService] Interstitial failed:', e);
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
