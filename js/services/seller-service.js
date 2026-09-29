/* =====================================================
   PIPGO · SELLER SERVICE
   Solicitudes de vendedor (una sola cuenta, distintos permisos).
   ===================================================== */

window.SellerService = {

    async submitApplication(data) {
        if (!AppState.currentUser) throw new Error('Debes iniciar sesión.');
        const uid = AppState.currentUser.uid;
        const now = firebase.firestore.FieldValue.serverTimestamp();

        const payload = {
            uid,
            sellerType:    data.sellerType,      // "person" | "business"
            displayName:   data.displayName,
            businessName:  data.businessName || '',
            category:      data.category || '',
            description:   data.description || '',
            phone:         data.phone || '',
            city:          data.city || '',
            state:         data.state || '',
            socialUrl:     data.socialUrl || '',
            contactMethod: data.contactMethod || 'phone',
            termsAccepted: true,
            status:        'pending',
            rejectionReason: null,
            submittedAt:   now,
            updatedAt:     now,
            reviewedAt:    null,
            reviewedBy:    null
        };

        const batch = db.batch();
        batch.set(
            db.collection('solicitudesVendedor').doc(uid),
            payload
        );
        batch.update(
            db.collection(CONFIG.COLLECTIONS.USERS).doc(uid),
            { sellerStatus: 'pending', updatedAt: now }
        );
        await batch.commit();

        // Refrescar estado local
        if (AppState.currentProfile) {
            AppState.currentProfile.sellerStatus = 'pending';
        }
        AppState.currentSellerApplication = payload;
        return payload;
    },

    async getApplication(uid) {
        const snap = await db.collection('solicitudesVendedor').doc(uid).get();
        return snap.exists ? snap.data() : null;
    },

    /* Vista previa para admin (no implementada UI todavía) */
    async listPending() {
        const snap = await db.collection('solicitudesVendedor')
            .where('status', '==', 'pending')
            .orderBy('submittedAt', 'desc')
            .limit(50)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};