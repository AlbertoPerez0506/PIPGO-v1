/* =====================================================
   PIPGO · AUTH SERVICE
   ===================================================== */

window.AuthService = {
    async register({ username, email, password }) {
        const usernameValidation = Validators.validateUsername(username);
        if (!usernameValidation.valid) throw new Error(usernameValidation.error);
        if (!Validators.validateEmail(email)) throw new Error('Correo electrónico inválido.');
        if (!Validators.validatePassword(password)) throw new Error('La contraseña debe tener al menos 6 caracteres.');

        const normalized = Validators.normalizeUsername(usernameValidation.value);

        let credential;
        try {
            credential = await auth.createUserWithEmailAndPassword(email, password);
        } catch (error) {
            throw new Error(this.getAuthErrorMessage(error));
        }

        const uid = credential.user.uid;

        try {
            await UserService.createProfileWithUsername({
                uid,
                username: usernameValidation.value,
                normalized,
                email
            });
            return credential.user;
        } catch (error) {
            try {
                await credential.user.delete();
                await auth.signOut();
            } catch (cleanupError) {
                Logger.error('Rollback de cuenta falló', cleanupError);
            }
            throw error;
        }
    },

    async login(email, password) {
        try {
            return await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            throw new Error(this.getAuthErrorMessage(error));
        }
    },

    logout() { return auth.signOut(); },

    onAuthStateChanged(callback) { return auth.onAuthStateChanged(callback); },

    /* -------------------------------------------------
       RECUPERACIÓN DE CONTRASEÑA
       ------------------------------------------------- */

    /**
     * El usuario pide recuperar contraseña. Se crea una
     * solicitud en Firestore que el admin debe aprobar.
     * No requiere estar autenticado.
     */
    async requestPasswordReset(rawEmail) {
        const email = String(rawEmail || '').trim().toLowerCase();
        if (!Validators.validateEmail(email)) {
            throw new Error('Correo electrónico inválido.');
        }

        try {
            await db.collection('solicitudesRecuperacion').add({
                email,
                status: 'pending',
                requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
                reviewedAt: null,
                reviewedBy: null,
                emailSentAt: null,
                rejectionReason: null
            });
        } catch (error) {
            Logger.error('Error creando solicitud de recuperación', error);
            throw new Error('No pudimos registrar tu solicitud. Inténtalo de nuevo.');
        }
    },

    /**
     * Envía el correo estándar de Firebase para resetear
     * contraseña. Lo invoca el admin al aprobar una solicitud.
     */
    async sendPasswordResetEmail(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            return true;
        } catch (error) {
            Logger.error('sendPasswordResetEmail falló', error);
            throw new Error(this.getAuthErrorMessage(error));
        }
    },

    getAuthErrorMessage(error) {
        const code = error && error.code;
        const map = {
            'auth/invalid-email': 'Correo electrónico inválido.',
            'auth/email-already-in-use': 'Este correo ya está registrado.',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
            'auth/user-not-found': 'No existe una cuenta con este correo.',
            'auth/wrong-password': 'Contraseña incorrecta.',
            'auth/invalid-credential': 'Correo o contraseña incorrectos.',
            'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
            'auth/network-request-failed': 'No pudimos conectar. Revisa tu conexión a Internet.',
            'auth/operation-not-allowed': 'El registro con correo no está habilitado.'
        };
        return map[code] || 'No pudimos completar la autenticación. Inténtalo de nuevo.';
    }
};