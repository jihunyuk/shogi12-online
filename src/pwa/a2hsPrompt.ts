/**
 * A2HS (Add to Home Screen) Prompt
 *
 * - Android(Chrome): beforeinstallprompt 네이티브 이벤트 활용
 * - iOS(Safari): 직접 안내 배너 표시 (네이티브 이벤트 없음)
 * - 닫기 후 7일간 재표시 안 함
 */

const STORAGE_KEY = 'shogi12_a2hs_dismissed';
const DISMISS_DAYS = 7;

// ── 디바이스 감지 ─────────────────────────────────────────────────────────────

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>)['MSStream'];
}

function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/** standalone 모드(이미 설치됨)인지 확인 */
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

// ── 해제 상태 관리 ────────────────────────────────────────────────────────────

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const until = parseInt(raw, 10);
    return Date.now() < until;
  } catch {
    return false;
  }
}

function dismiss(): void {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(until));
  } catch { /* ignore */ }
}

// ── DOM 배너 생성 ─────────────────────────────────────────────────────────────

function createBanner(html: string, onClose: () => void): HTMLElement {
  const overlay = document.getElementById('a2hs-overlay') as HTMLElement;
  overlay.innerHTML = '';
  overlay.style.cssText = '';

  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    background: linear-gradient(180deg, #2a1508 0%, #1e0f07 100%);
    border-top: 1px solid #c8a45a44;
    padding: 14px 16px 20px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-family: 'Noto Sans KR', sans-serif;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.6);
    animation: a2hs-slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes a2hs-slide-up {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .a2hs-close {
      background: none; border: none; cursor: pointer;
      color: #888; font-size: 20px; line-height: 1;
      padding: 0 4px; flex-shrink: 0; margin-top: -2px;
    }
    .a2hs-close:hover { color: #ccc; }
    .a2hs-icon {
      width: 44px; height: 44px; border-radius: 10px;
      background: #3d1f0e; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
      font-size: 24px;
    }
    .a2hs-body { flex: 1; }
    .a2hs-title {
      color: #c8a45a; font-size: 14px; font-weight: 700;
      margin-bottom: 4px;
    }
    .a2hs-desc {
      color: #aaa; font-size: 12px; line-height: 1.5;
    }
    .a2hs-step {
      display: inline-block; background: #3d1f0e;
      border: 1px solid #c8a45a66; border-radius: 4px;
      padding: 1px 6px; margin: 1px 2px;
      color: #c8a45a; font-size: 11px;
    }
  `;
  document.head.appendChild(style);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'a2hs-close';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', '닫기');
  closeBtn.addEventListener('click', () => {
    dismiss();
    onClose();
    banner.style.animation = 'none';
    banner.style.transform = 'translateY(100%)';
    banner.style.opacity = '0';
    banner.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
    setTimeout(() => overlay.innerHTML = '', 300);
  });

  banner.innerHTML = html;
  banner.appendChild(closeBtn);
  overlay.appendChild(banner);

  return banner;
}

// ── Android 네이티브 설치 버튼 ────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let _deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredPrompt = e as BeforeInstallPromptEvent;
});

function showAndroidBanner(): void {
  const html = `
    <div class="a2hs-icon">将</div>
    <div class="a2hs-body">
      <div class="a2hs-title">앱처럼 설치하기</div>
      <div class="a2hs-desc">
        Chrome 우측 상단 <span class="a2hs-step">⋮</span> 메뉴 →
        <span class="a2hs-step">홈 화면에 추가</span>
        를 선택하면 앱으로 즐길 수 있어요.
      </div>
    </div>
  `;

  createBanner(html, () => { /* dismissed */ });

  // 네이티브 프롬프트가 있으면 배너에 설치 버튼 추가
  if (_deferredPrompt) {
    const overlay = document.getElementById('a2hs-overlay') as HTMLElement;
    const btn = document.createElement('button');
    btn.style.cssText = `
      position: absolute; bottom: 14px; right: 48px;
      background: #c8a45a; color: #1e0f07; border: none;
      border-radius: 6px; padding: 6px 14px; font-size: 12px;
      font-weight: 700; cursor: pointer; font-family: inherit;
    `;
    btn.textContent = '설치';
    btn.addEventListener('click', async () => {
      if (!_deferredPrompt) return;
      await _deferredPrompt.prompt();
      const { outcome } = await _deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        dismiss();
        overlay.innerHTML = '';
      }
      _deferredPrompt = null;
    });
    overlay.firstElementChild?.appendChild(btn);
  }
}

function showIOSBanner(): void {
  const html = `
    <div class="a2hs-icon">将</div>
    <div class="a2hs-body">
      <div class="a2hs-title">홈 화면에 추가하기</div>
      <div class="a2hs-desc">
        Safari 하단 <span class="a2hs-step">공유 □↑</span> 버튼 →
        <span class="a2hs-step">홈 화면에 추가</span>
        를 선택하면 앱으로 즐길 수 있어요.
      </div>
    </div>
  `;
  createBanner(html, () => { /* dismissed */ });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * 게임 로딩 후 적절한 시점에 호출.
 * 이미 standalone 설치 상태이거나 7일 이내 닫은 경우 무시.
 */
export function initA2HSPrompt(): void {
  if (isStandalone() || isDismissed()) return;

  // 로딩 완료 후 2초 대기 (게임 경험 방해 최소화)
  setTimeout(() => {
    if (isIOS()) {
      showIOSBanner();
    } else if (isAndroid()) {
      showAndroidBanner();
    } else {
      // 데스크톱 Chrome 등: beforeinstallprompt가 있을 때만 표시
      if (_deferredPrompt) showAndroidBanner();
    }
  }, 2000);
}
