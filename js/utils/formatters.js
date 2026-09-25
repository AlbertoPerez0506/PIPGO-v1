window.Formatters = {
    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    },

    safeUrl(url) {
        if (!url) return '';
        try {
            const u = new URL(String(url), window.location.origin);
            if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
        } catch (e) {}
        return '';
    },

    formatRelativeTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
        return `hace ${Math.floor(diff / 86400)} días`;
    },

    /* Formatea precio añadiendo $ automáticamente */
    formatPrice(value) {
        if (value == null || value === '') return '';
        let str = String(value).trim();
        // Quitar $ si el usuario lo puso (por si acaso)
        str = str.replace(/^\$+/, '').trim();
        if (!str) return '';
        // Si el usuario escribió solo números, formatear
        const num = parseFloat(str.replace(/,/g, ''));
        if (!isNaN(num) && /^[\d.,\s]+$/.test(str)) {
            // Formato con separador de miles para México
            return '$' + num.toLocaleString('es-MX', {
                minimumFractionDigits: num % 1 === 0 ? 0 : 2,
                maximumFractionDigits: 2
            });
        }
        return '$' + str;
    },

    /* Solo dígitos y punto decimal (para inputs de precio) */
    sanitizePriceInput(value) {
        return String(value || '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    }
};