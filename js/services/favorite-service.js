/* =====================================================
   PIPGO · FAVORITE SERVICE
   Favoritos por usuario, resiliente a publicaciones
   eliminadas / no accesibles.
   ===================================================== */

window.FavoriteService = {
    _favRef(uid) {
        return db.collection(CONFIG.COLLECTIONS.USERS).doc(uid)
                 .collection(CONFIG.COLLECTIONS.FAVORITES);
    },

    async getFavoriteIds(uid) {
        const snapshot = await this._favRef(uid).get();
        return new Set(snapshot.docs.map(doc => doc.id));
    },

    async toggleFavorite(uid, publicationId) {
        const ref = this._favRef(uid).doc(publicationId);
        const snap = await ref.get();
        if (snap.exists) {
            await ref.delete();
            return false;
        }
        await ref.set({
            publicationId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    },

    async getFavoritePublications(uid) {
        const ids = await this.getFavoriteIds(uid);
        if (ids.size === 0) return [];

        const results = await Promise.all([...ids].map(async (id) => {
            try {
                const doc = await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).get();
                if (!doc.exists) return { status: 'missing', id };
                const data = doc.data();
                if (data.status === 'deleted') return { status: 'deleted', id };
                return { status: 'ok', id, data: { id, ...data } };
            } catch (error) {
                Logger.warn('Favorito no accesible', id, error);
                return { status: 'error', id };
            }
        }));

        // Auto-limpieza silenciosa de favoritos rotos
        results
            .filter(r => r.status === 'deleted' || r.status === 'missing')
            .forEach(r => this._favRef(uid).doc(r.id).delete().catch(() => {}));

        return results.filter(r => r.status === 'ok').map(r => r.data);
    }
};