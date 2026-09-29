/* =====================================================
   PIPGO · VALIDATORS
   Validación de datos de entrada. NO sanitiza.
   Mensajes específicos, sin culpar al usuario.
   ===================================================== */

window.Validators = {

    /* ---------- Username ---------- */
    normalizeUsername(username) {
        return String(username || '').trim().toLowerCase();
    },

    validateUsername(username) {
        const value = String(username || '').trim();
        if (value.length < 3) return { valid: false, error: 'El username debe tener al menos 3 caracteres.' };
        if (value.length > 20) return { valid: false, error: 'El username no puede superar 20 caracteres.' };
        if (!/^[a-zA-Z0-9._]+$/.test(value)) return { valid: false, error: 'Solo letras, números, "_" y ".". Sin espacios.' };
        return { valid: true, value };
    },

    /* ---------- Email ---------- */
    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    },

    /* ---------- Password ---------- */
    validatePassword(password) {
        return String(password || '').length >= 6;
    },

    /* =================================================
       PUBLICACIÓN — mensajes específicos
       ================================================= */
    validatePublication(data) {
        if (!data.name || !String(data.name).trim()) {
            return { valid: false, error: 'Agrega el nombre del producto.' };
        }
        if (data.price == null || data.price === '') {
            return { valid: false, error: 'Agrega un precio.' };
        }
        if (!data.category) {
            return { valid: false, error: 'Selecciona una categoría.' };
        }
        if (!data.mainImage) {
            return { valid: false, error: 'La foto principal es obligatoria.' };
        }
        return { valid: true };
    },

    /* =================================================
       HORARIO — opcional
       Si no hay schedule, siempre válido.
       ================================================= */
    validateSchedule(schedule) {
        if (!schedule) return { valid: true };
        if (!schedule.days || !schedule.days.length) {
            return { valid: false, error: 'Selecciona al menos un día para el horario.' };
        }
        if (!schedule.start || !schedule.end) {
            return { valid: false, error: 'Indica la hora de inicio y de fin.' };
        }
        if (schedule.start >= schedule.end) {
            return { valid: false, error: 'La hora de inicio debe ser anterior a la de fin.' };
        }
        return { valid: true };
    },

    /* =================================================
       SOLICITUD DE VENDEDOR
       ================================================= */
    validateSellerApplication(data) {
        if (!data.sellerType || !['person', 'business'].includes(data.sellerType)) {
            return { valid: false, error: 'Selecciona el tipo de vendedor.' };
        }
        if (!data.displayName || data.displayName.trim().length < 2) {
            return { valid: false, error: 'Ingresa un nombre público (mínimo 2 caracteres).' };
        }
        if (data.displayName.trim().length > 100) {
            return { valid: false, error: 'El nombre público no puede superar 100 caracteres.' };
        }
        if (data.sellerType === 'business' && (!data.businessName || data.businessName.trim().length < 2)) {
            return { valid: false, error: 'Ingresa el nombre del negocio.' };
        }
        if (!data.category || data.category.trim().length < 2) {
            return { valid: false, error: 'Indica la categoría principal.' };
        }
        if (data.category.trim().length > 80) {
            return { valid: false, error: 'La categoría no puede superar 80 caracteres.' };
        }
        if (!data.description || data.description.trim().length < 10) {
            return { valid: false, error: 'Describe brevemente tu actividad (mínimo 10 caracteres).' };
        }
        if (data.description.trim().length > 1000) {
            return { valid: false, error: 'La descripción no puede superar 1000 caracteres.' };
        }
        if (!data.phone || data.phone.trim().length < 7) {
            return { valid: false, error: 'Ingresa un teléfono de contacto.' };
        }
        if (data.phone.trim().length > 30) {
            return { valid: false, error: 'El teléfono no puede superar 30 caracteres.' };
        }
        if (!data.city || !data.city.trim()) {
            return { valid: false, error: 'Ingresa tu ciudad.' };
        }
        if (!data.state || !data.state.trim()) {
            return { valid: false, error: 'Ingresa tu estado.' };
        }
        if (!['phone', 'whatsapp'].includes(data.contactMethod || 'phone')) {
            return { valid: false, error: 'Selecciona el método de contacto.' };
        }
        if (data.socialUrl && data.socialUrl.trim()) {
            try {
                const u = new URL(data.socialUrl.trim());
                if (!['http:', 'https:'].includes(u.protocol)) {
                    return { valid: false, error: 'La URL debe empezar con http:// o https://.' };
                }
            } catch (e) {
                return { valid: false, error: 'La URL de la red social no es válida.' };
            }
        }
        if (!data.termsAccepted) {
            return { valid: false, error: 'Debes aceptar los términos para continuar.' };
        }
        return { valid: true };
    }
};