/* =====================================================
   PIPGO · USER SERVICE
   Perfiles de usuario + perfil público + avatar.
   ===================================================== */

window.UserService = {

    async createProfileWithUsername({ uid, username, normalized, email }) {
        const userRef     = db.collection(CONFIG.COLLECTIONS.USERS).doc(uid);
        const publicRef   = db.collection('perfilesPublicos').doc(uid);
        const usernameRef = db.collection(CONFIG.COLLECTIONS.USERNAMES).doc(normalized);

        await db.runTransaction(async (transaction) => {
            const snap = await transaction.get(usernameRef);
            if (snap.exists) throw new Error('El username no está disponible.');

            const now = firebase.firestore.FieldValue.serverTimestamp();

            transaction.set(usernameRef, { uid, username, createdAt: now });

            transaction.set(userRef, {
                uid,
                username,
                usernameNormalized: normalized,
                email,
                avatarUrl: '',
                role: 'user',
                sellerStatus: 'none',
                active: true,
                admin: false,
                createdAt: now,
                updatedAt: now
            });

            transaction.set(publicRef, {
                uid,
                username,
                usernameNormalized: normalized,
                avatarUrl: ''
            });
        });
    },

    async getProfile(uid) {
        const snap = await db.collection(CONFIG.COLLECTIONS.USERS).doc(uid).get();
        return snap.exists ? snap.data() : null;
    },

    async getPublicProfile(uid) {
        const snap = await db.collection('perfilesPublicos').doc(uid).get();
        return snap.exists ? snap.data() : null;
    },

    async updateAvatar(uid, avatarUrl) {
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const batch = db.batch();
        batch.update(db.collection(CONFIG.COLLECTIONS.USERS).doc(uid), {
            avatarUrl, updatedAt: now
        });
        batch.update(db.collection('perfilesPublicos').doc(uid), { avatarUrl });
        await batch.commit();
    }
};