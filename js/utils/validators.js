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
    }
};