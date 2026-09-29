/* =====================================================
   PIPGO · ADMIN SERVICE
   Única fuente de verdad para operaciones administrativas.
   ===================================================== */

window.AdminService = {

    ADMIN_EMAIL: (window.CONFIG && CONFIG.ADMIN_EMAIL) ||
                 'ivanalbertoperezramirez@gmail.com',

    /* -------------------------------------------------
       IDENTIDAD
       ------------------------------------------------- */
    isAdmin() {
        const u = AppState.currentUser;
        if (!u || !u.email) return false;
        return String(u.email).toLowerCase() === this.ADMIN_EMAIL.toLowerCase();
    },

    getAdminUid() {
        return AppState.currentUser ? AppState.currentUser.uid : null;
    },

    /* -------------------------------------------------
       DASHBOARD
       ------------------------------------------------- */
    async getDashboardStats() {
        const [usersSnap, appsSnap, recoveriesSnap] = await Promise.all([
            db.collection(CONFIG.COLLECTIONS.USERS).get(),
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).get(),
            db.collection('solicitudesRecuperacion').where('status', '==', 'pending').get()
        ]);

        let pending = 0, approved = 0, rejected = 0, needsInfo = 0;

        appsSnap.forEach(doc => {
            const s = doc.data().status;
            if (s === 'pending')         pending++;
            else if (s === 'approved')   approved++;
            else if (s === 'rejected')   rejected++;
            else if (s === 'needs_info') needsInfo++;
        });

        return {
            totalUsers: usersSnap.size,
            pending,
            approved,
            rejected,
            needsInfo,
            pendingRecoveries: recoveriesSnap.size
        };
    },

    /* -------------------------------------------------
       SOLICITUDES DE VENDEDOR
       ------------------------------------------------- */
    async listApplications(filter = 'all') {
        let query = db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS);
        if (filter && filter !== 'all') {
            query = query.where('status', '==', filter);
        }

        const snap = await query.get();
        const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (!apps.length) return [];

        const usersSnap = await db.collection(CONFIG.COLLECTIONS.USERS).get();
        const usersById = {};
        usersSnap.forEach(u => { usersById[u.id] = u.data(); });

        const enriched = apps.map(app => {
            const uid = app.uid || app.id;
            return { ...app, id: uid, user: usersById[uid] || {} };
        });

        enriched.sort((a, b) => {
            const ta = a.submittedAt && a.submittedAt.toDate ? a.submittedAt.toDate().getTime() : 0;
            const tb = b.submittedAt && b.submittedAt.toDate ? b.submittedAt.toDate().getTime() : 0;
            return tb - ta;
        });

        return enriched;
    },

    /* -------------------------------------------------
       USUARIOS
       ------------------------------------------------- */
    async listUsers() {
        const snap = await db.collection(CONFIG.COLLECTIONS.USERS).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /* -------------------------------------------------
       ACCIÓN: APROBAR VENDEDOR
       ------------------------------------------------- */
    async approve(uid) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');
        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        const batch = db.batch();
        batch.update(db.collection(CONFIG.COLLECTIONS.USERS).doc(uid), {
            role: 'seller',
            sellerStatus: 'approved',
            updatedAt: now
        });
        batch.set(
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).doc(uid),
            {
                status: 'approved',
                reviewedAt: now,
                reviewedBy: adminUid,
                rejectionReason: null,
                adminNote: null,
                updatedAt: now
            },
            { merge: true }
        );
        await batch.commit();
    },

    /* -------------------------------------------------
       ACCIÓN: RECHAZAR VENDEDOR
       ------------------------------------------------- */
    async reject(uid, reason) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');
        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        const batch = db.batch();
        batch.update(db.collection(CONFIG.COLLECTIONS.USERS).doc(uid), {
            sellerStatus: 'rejected',
            updatedAt: now
        });
        batch.set(
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).doc(uid),
            {
                status: 'rejected',
                rejectionReason: reason || '',
                reviewedAt: now,
                reviewedBy: adminUid,
                updatedAt: now
            },
            { merge: true }
        );
        await batch.commit();
    },

    /* -------------------------------------------------
       ACCIÓN: SOLICITAR INFORMACIÓN
       ------------------------------------------------- */
    async requestInfo(uid, note) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');
        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        const batch = db.batch();
        batch.update(db.collection(CONFIG.COLLECTIONS.USERS).doc(uid), {
            sellerStatus: 'needs_info',
            updatedAt: now
        });
        batch.set(
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).doc(uid),
            {
                status: 'needs_info',
                adminNote: note || '',
                reviewedAt: now,
                reviewedBy: adminUid,
                updatedAt: now
            },
            { merge: true }
        );
        await batch.commit();
    },

    /* =================================================
       RECUPERACIÓN DE CONTRASEÑA
       ================================================= */

    /**
     * Lista solicitudes de recuperación por estado.
     * @param {'pending'|'approved'|'rejected'|'all'} filter
     */
    async listPasswordResetRequests(filter = 'pending') {
        let query = db.collection('solicitudesRecuperacion');
        if (filter && filter !== 'all') {
            query = query.where('status', '==', filter);
        }

        const snap = await query.get();
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        list.sort((a, b) => {
            const ta = a.requestedAt && a.requestedAt.toDate ? a.requestedAt.toDate().getTime() : 0;
            const tb = b.requestedAt && b.requestedAt.toDate ? b.requestedAt.toDate().getTime() : 0;
            return tb - ta;
        });

        return list;
    },

    /**
     * Aprueba una solicitud y dispara el email estándar
     * de Firebase al usuario para que cambie su contraseña.
     */
    async approvePasswordReset(docId, email) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');

        // 1) Primero enviamos el email (si falla, no marcamos como aprobado).
        await AuthService.sendPasswordResetEmail(email);

        // 2) Marcamos la solicitud como aprobada.
        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        await db.collection('solicitudesRecuperacion').doc(docId).update({
            status: 'approved',
            reviewedAt: now,
            reviewedBy: adminUid,
            emailSentAt: now,
            rejectionReason: null
        });
    },

    /**
     * Rechaza una solicitud de recuperación.
     */
    async rejectPasswordReset(docId, reason) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');
        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        await db.collection('solicitudesRecuperacion').doc(docId).update({
            status: 'rejected',
            reviewedAt: now,
            reviewedBy: adminUid,
            rejectionReason: reason || ''
        });
    }
};