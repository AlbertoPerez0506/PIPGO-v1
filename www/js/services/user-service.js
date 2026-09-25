/* =====================================================
   PIPGO · USER SERVICE
   Perfiles de usuario, avatar, contadores.
   ===================================================== */

window.UserService = {
    async createProfileWithUsername({ uid, username, normalized, email }) {
        const userRef = db.collection(CONFIG.COLLECTIONS.USERS).doc(uid);
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
                createdAt: now,
                updatedAt: now,
                active: true
            });
        });
    },

    async getProfile(uid) {
        const snap = await db.collection(CONFIG.COLLECTIONS.USERS).doc(uid).get();
        return snap.exists ? snap.data() : null;
    },

    async updateAvatar(uid, avatarUrl) {
        await db.collection(CONFIG.COLLECTIONS.USERS).doc(uid).update({
            avatarUrl,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
};