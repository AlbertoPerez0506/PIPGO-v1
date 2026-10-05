/* =====================================================
   PIPGO · SELLER PROFILE SERVICE
   Lectura + cache de perfilesPublicos/{uid}.
   Resolución de identidad de vendedor para publicaciones
   (compatibilidad con publicaciones antiguas).
   ===================================================== */

(function () {
    'use strict';

    const CACHE_TTL_MS = 5 * 60 * 1000;
    const cache = new Map(); // uid -> { data, at }

    function isFresh(entry) {
        return entry && (Date.now() - entry.at) < CACHE_TTL_MS;
    }

    async function getPublicProfile(uid, { force = false } = {}) {
        if (!uid) return null;
        const hit = cache.get(uid);
        if (!force && isFresh(hit)) return hit.data;

        try {
            const snap = await db.collection(CONFIG.COLLECTIONS.PUBLIC_PROFILES).doc(uid).get();
            const data = snap.exists ? { uid, ...snap.data() } : null;
            cache.set(uid, { data, at: Date.now() });
            return data;
        } catch (e) {
            Logger.error('SellerProfileService.getPublicProfile', e);
            return hit ? hit.data : null;
        }
    }

    /**
     * Devuelve la identidad mínima del vendedor para renderizar.
     * Fast path: si la publicación ya trae sellerUsername/sellerAvatarUrl,
     * se usa eso. Fallback: perfilesPublicos/{userId}.
     */
    async function resolveIdentity(publication) {
        if (!publication) return null;
        const uid = publication.userId;
        if (!uid) return null;

        if (publication.sellerUsername || publication.sellerAvatarUrl) {
            return {
                uid,
                username: publication.sellerUsername || '',
                avatarUrl: publication.sellerAvatarUrl || '',
                displayName: publication.sellerDisplayName || ''
            };
        }

        const pub = await getPublicProfile(uid);
        return {
            uid,
            username: (pub && pub.username) || '',
            avatarUrl: (pub && pub.avatarUrl) || '',
            displayName: (pub && pub.displayName) || ''
        };
    }

    function clearCache() { cache.clear(); }

    window.SellerProfileService = {
        getPublicProfile,
        resolveIdentity,
        clearCache
    };
})();