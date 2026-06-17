/** Sincroniza contas entre a janela principal e janelas pop-out do mesmo platformId. */
export function broadcastAccountSync(platformId, sourceWindowId) {
    if (!platformId || !sourceWindowId) return;
    try {
        const ch = new BroadcastChannel(`cpa-sync-${platformId}`);
        ch.postMessage({ type: 'accounts-updated', source: sourceWindowId });
        ch.close();
    } catch {
        /* BroadcastChannel indisponível */
    }
}

export function subscribeAccountSync(platformId, sourceWindowId, onUpdate) {
    if (!platformId) return () => {};
    try {
        const ch = new BroadcastChannel(`cpa-sync-${platformId}`);
        ch.onmessage = (e) => {
            if (e.data?.type === 'accounts-updated' && e.data?.source !== sourceWindowId) {
                onUpdate();
            }
        };
        return () => ch.close();
    } catch {
        return () => {};
    }
}

export function buildPopoutUrl({ cardKey, platformId, cycle }) {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('popout', cardKey);
    url.searchParams.set('platformId', platformId);
    url.searchParams.set('cycle', String(cycle));
    return url.toString();
}

function getWindowFeatures(cardKey) {
    const width = Math.min(1280, window.screen.availWidth - 48);
    const height = Math.min(860, window.screen.availHeight - 48);
    const offset = cardKey === 'daughter' ? 40 : 0;
    return [
        'popup=yes',
        'toolbar=no',
        'menubar=no',
        'location=no',
        'status=no',
        'directories=no',
        'scrollbars=yes',
        'resizable=yes',
        `width=${width}`,
        `height=${height}`,
        `left=${32 + offset}`,
        `top=${32 + offset}`,
    ].join(',');
}

function navigatePopoutWindow(win, url) {
    if (!win) return false;
    try {
        win.location.replace(url);
        return true;
    } catch {
        try {
            win.location.href = url;
            return true;
        } catch {
            return false;
        }
    }
}

function openViaAnchor(url, winName) {
    const link = document.createElement('a');
    link.href = url;
    link.target = winName;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Abre pop-out na mesma ação do clique (síncrono).
 * Retorna { window, url, winName, usedAnchorFallback }.
 */
export function openAccountPopoutWindow({ cardKey, platformId, cycle }) {
    const url = buildPopoutUrl({ cardKey, platformId, cycle });
    const winName = `cpa-popout-${platformId}-${cardKey}`;
    const features = getWindowFeatures(cardKey);

    let win = window.open('about:blank', winName, features);
    if (win) {
        const ok = navigatePopoutWindow(win, url);
        if (ok && !win.closed) {
            return { window: win, url, winName, usedAnchorFallback: false };
        }
        try { win.close(); } catch { /* */ }
    }

    win = window.open(url, winName, features);
    if (win && !win.closed) {
        return { window: win, url, winName, usedAnchorFallback: false };
    }

    openViaAnchor(url, winName);
    return { window: null, url, winName, usedAnchorFallback: true };
}
