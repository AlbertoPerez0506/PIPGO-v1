/* =====================================================
   PIPGO · VALIDATORS
   Validación de datos de entrada. NO sanitiza.
   ===================================================== */

window.Validators = {
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

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    },

    validatePassword(password) {
        return String(password || '').length >= 6;
    },

    validatePublication(data) {
        if (!data.name || !data.price) return { valid: false, error: 'Completa al menos nombre y precio.' };
        if (!data.category) return { valid: false, error: 'Selecciona una categoría.' };
        if (!data.mainImage) return { valid: false, error: 'La imagen principal es obligatoria.' };
        return { valid: true };
    }
};