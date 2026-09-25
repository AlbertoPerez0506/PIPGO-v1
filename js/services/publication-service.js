/* =====================================================
   PIPGO · PUBLICATION SERVICE
   CRUD de publicaciones. Sin lógica de UI.
   Soporta status: 'active' | 'sold' | 'deleted'
   ===================================================== */

window.PublicationService = {
    async create(data) {
        return await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).add({
            ...data,
            status: 'active',
            soldAt: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async getActivePublications() {
        const snapshot = await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(60)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getUserPublications(uid) {
        const snapshot = await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS)
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(pub => {
                if (pub.status === 'deleted') return false;
                if (pub.status === 'sold' && pub.soldAt) {
                    // Mostrar solo si fue vendido hace menos de 24h
                    const soldMs = pub.soldAt.toDate ? pub.soldAt.toDate().getTime() : new Date(pub.soldAt).getTime();
                    return (Date.now() - soldMs) < 24 * 60 * 60 * 1000;
                }
                return true;
            });
    },

    async getPublicationById(id) {
        const snap = await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).get();
        return snap.exists ? { id: snap.id, ...snap.data() } : null;
    },

    async update(id, data) {
        const updateData = { ...data };
        delete updateData.userId;
        delete updateData.createdAt;
        delete updateData.status;
        delete updateData.soldAt;
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).update(updateData);
    },

    async markAsSold(id) {
        await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).update({
            status: 'sold',
            soldAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async softDelete(id) {
        await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).update({
            status: 'deleted',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    /* Extrae sugerencias dinámicas (productos + categorías + tiendas) */
    buildSuggestions(publications) {
        const counter = new Map();
        const add = (val) => {
            if (!val) return;
            const key = String(val).trim();
            if (!key || key.length < 2) return;
            counter.set(key, (counter.get(key) || 0) + 1);
        };
        publications.forEach(p => {
            add(p.name);
            add(p.storeName);
        });
        return [...counter.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([value]) => value);
    }
};