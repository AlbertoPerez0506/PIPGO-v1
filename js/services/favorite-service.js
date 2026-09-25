/* =====================================================
   PIPGO · FAVORITE SERVICE
   Favoritos por usuario (subcolección).
   ===================================================== */

window.FavoriteService = {
    _favRef(uid) {
        return db.collection(CONFIG.COLLECTIONS.USERS).doc(uid).collection(CONFIG.COLLECTIONS.FAVORITES);
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
        const docs = await Promise.all(
            [...ids].map(id => db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).get())
        );
        return docs
            .filter(d => d.exists && d.data().status !== 'deleted')
            .map(d => ({ id: d.id, ...d.data() }));
    }
};