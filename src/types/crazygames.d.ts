/**
 * CrazyGames SDK v3 — Global Type Declarations
 * https://docs.crazygames.com/sdk/html5/
 */

interface CrazyGamesAdCallbacks {
  adStarted?:  () => void;
  adError?:    (error: unknown) => void;
  adFinished?: () => void;
  /** Rewarded ad only — called when player fully watched the ad */
  adViewed?:   () => void;
}

interface CrazyGamesAdSDK {
  requestAd(type: 'midgame' | 'rewarded', callbacks?: CrazyGamesAdCallbacks): void;
  hasAdblock(): Promise<boolean>;
}

interface CrazyGamesGameSDK {
  gameplayStart(): void;
  gameplayStop(): void;
  sdkGameLoadingStart(): void;
  sdkGameLoadingStop(): void;
  happytime(): void;
}

interface CrazyGamesUserSDK {
  getUser(): Promise<{
    userId: string;
    username: string;
    profilePictureUrl: string;
    isAccountLinked: boolean;
  } | null>;
  isUserAccountAvailable: boolean;
  showAuthPrompt(): Promise<void>;
  showAccountLinkPrompt(): Promise<void>;
}

/** Same API as localStorage — backed by cloud for logged-in users */
interface CrazyGamesDataSDK {
  clear(): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

interface CrazyGamesSDK {
  init(): Promise<void>;
  ad:   CrazyGamesAdSDK;
  game: CrazyGamesGameSDK;
  user: CrazyGamesUserSDK;
  data: CrazyGamesDataSDK;
}

interface CrazyGamesNamespace {
  SDK: CrazyGamesSDK;
}

declare global {
  interface Window {
    CrazyGames?: CrazyGamesNamespace;
  }
}

export {};
