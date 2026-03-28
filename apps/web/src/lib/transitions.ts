import { Page } from '../types';

export type TransitionKind = 'tab' | 'tab_home' | 'push' | 'immersive' | 'sheet' | 'replace';

export interface NavigationTransition {
  direction: number;
  kind: TransitionKind;
}

const tabPages: Page[] = ['home', 'records', 'community', 'profile'];

const pageDepth: Record<Page, number> = {
  home: 0,
  records: 0,
  community: 0,
  profile: 0,
  camera: 1,
  analysis: 2,
  result: 2,
  record_detail: 1,
  consultations: 1,
  appointments: 1,
  settings: 1,
  about: 1,
  community_post_detail: 1,
  community_expert: 1,
  community_create: 1,
  diary: 1,
  history: 1,
};

const immersivePages = new Set<Page>(['camera', 'analysis', 'result']);
const sheetPages = new Set<Page>(['community_create', 'consultations', 'appointments', 'settings', 'about']);

export const pagePresenceMode = 'sync';

export function isTabPage(page: Page) {
  return tabPages.includes(page);
}

export function getPageDepth(page: Page) {
  return pageDepth[page] ?? 0;
}

export function resolveTransition(from: Page, to: Page): NavigationTransition {
  if (from === to) {
    return { direction: 0, kind: 'replace' };
  }

  if (isTabPage(from) && isTabPage(to)) {
    return {
      direction: Math.sign(tabPages.indexOf(to) - tabPages.indexOf(from)) || 1,
      kind: to === 'home' || from === 'home' ? 'tab_home' : 'tab',
    };
  }

  if (immersivePages.has(from) || immersivePages.has(to)) {
    const direction = getPageDepth(to) >= getPageDepth(from) ? 1 : -1;
    return {
      direction,
      kind: 'immersive',
    };
  }

  if (sheetPages.has(from) || sheetPages.has(to)) {
    return {
      direction: getPageDepth(to) >= getPageDepth(from) ? 1 : -1,
      kind: 'sheet',
    };
  }

  const depthDiff = getPageDepth(to) - getPageDepth(from);
  if (depthDiff !== 0) {
    return {
      direction: depthDiff > 0 ? 1 : -1,
      kind: 'push',
    };
  }

  return {
    direction: 1,
    kind: 'replace',
  };
}

export function getPageTransition(kind: TransitionKind, direction: number, reducedMotion: boolean) {
  if (reducedMotion) {
    return {
      initial: { opacity: 0, x: direction * 8, scale: 1 },
      animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
      },
      exit: {
        opacity: 0,
        x: direction * -6,
        scale: 1,
        transition: { duration: 0.6, ease: [0.4, 0, 1, 1] },
      },
    };
  }

  const tabTransition = {
    initial: {
      opacity: 1,
      x: direction * 20,
      scale: 1,
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.2, 0.9, 0.2, 1] },
    },
    exit: {
      opacity: 1,
      x: direction * -20,
      scale: 1,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const homeTabTransition = {
    initial: {
      opacity: 1,
      x: direction * 12,
      scale: 1,
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
      opacity: 1,
      x: direction * -12,
      scale: 1,
      transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const pushTransition = {
    initial: {
      opacity: 0,
      x: direction * 64,
      scale: 1,
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
    exit: {
      opacity: 0.92,
      x: direction * -52,
      scale: 1,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const immersiveTransition = {
    initial: {
      opacity: 0,
      x: direction > 0 ? 54 : -54,
      scale: 1,
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.18, 1, 0.32, 1] },
    },
    exit: {
      opacity: 0.9,
      x: direction > 0 ? -44 : 44,
      scale: 1,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const sheetTransition = {
    initial: {
      opacity: 0,
      x: direction > 0 ? 58 : -58,
      scale: 1,
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
    exit: {
      opacity: 0.9,
      x: direction > 0 ? -46 : 46,
      scale: 1,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    },
  };

  if (kind === 'push') {
    return pushTransition;
  }
  if (kind === 'tab_home') {
    return homeTabTransition;
  }
  if (kind === 'immersive') {
    return immersiveTransition;
  }
  if (kind === 'sheet') {
    return sheetTransition;
  }
  if (kind === 'replace') {
    return {
      initial: { opacity: 0, x: direction * 28, scale: 1 },
      animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
      },
      exit: {
        opacity: 0.92,
        x: direction * -24,
        scale: 1,
        transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
      },
    };
  }
  return tabTransition;
}
