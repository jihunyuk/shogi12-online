/**
 * Ads Service — placeholder boundary for future Google AdMob integration.
 *
 * This module isolates all ad-related logic from gameplay.
 * When Capacitor + AdMob are added, implement the functions below.
 * The game engine and UI scenes call these functions at defined boundaries;
 * no other file should reference AdMob directly.
 *
 * Planned ad placements:
 *   - Interstitial: after game end (result screen)
 *   - Rewarded: optional extension (future)
 *   - Banner: bottom-safe-area of game screen (layout reserved)
 */

export interface AdsConfig {
  appId: string;
  interstitialId: string;
  rewardedId: string;
  bannerId: string;
}

/** Initialize AdMob — call once at app startup when ready. */
export async function initAds(_config: AdsConfig): Promise<void> {
  // TODO: await AdMob.initialize({ ... })
}

/** Show interstitial ad after game ends. */
export async function showInterstitial(): Promise<void> {
  // TODO: await AdMob.prepareInterstitial({ adId: config.interstitialId })
  //       await AdMob.showInterstitial()
}

/** Show rewarded ad — future use. */
export async function showRewarded(): Promise<boolean> {
  // TODO: implement rewarded ad flow
  return false;
}

/** Show banner ad — call after game scene is ready. */
export async function showBanner(): Promise<void> {
  // TODO: await AdMob.showBanner({ adId: config.bannerId, position: BannerAdPosition.BOTTOM_CENTER })
}

/** Hide banner ad — call before returning to menu. */
export async function hideBanner(): Promise<void> {
  // TODO: await AdMob.hideBanner()
}
