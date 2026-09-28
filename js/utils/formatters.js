/* =====================================================
   PIPGO · FORMATTERS
   Formateo de texto, URLs, precios, tiempo, distancia
   y horarios. Funciones puras, sin side effects.
   ===================================================== */

window.Formatters = {

    /* ---------- Escape HTML ---------- */
    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    },

    /* ---------- URLs seguras ---------- */
    safeUrl(url) {
        if (!url) return '';
        try {
            const u = new URL(String(url), window.location.origin);
            if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
        } catch (e) {}
        return '';
    },

    /* ---------- Tiempo relativo ("hace 5 min") ---------- */
    formatRelativeTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
        return `hace ${Math.floor(diff / 86400)} días`;
    },

    /* ---------- Precio ---------- */
    formatPrice(value) {
        if (value == null || value === '') return '';
        let str = String(value).trim();
        str = str.replace(/^\$+/, '').trim();
        if (!str) return '';
        const num = parseFloat(str.replace(/,/g, ''));
        if (!isNaN(num) && /^[\d.,\s]+$/.test(str)) {
            return '$' + num.toLocaleString('es-MX', {
                minimumFractionDigits: num % 1 === 0 ? 0 : 2,
                maximumFractionDigits: 2
            });
        }
        return '$' + str;
    },

    /* Input de precio: solo dígitos y un punto decimal */
    sanitizePriceInput(value) {
        return String(value || '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    },

    /* =================================================
       DISTANCIA — Haversine (metros)
       Devuelve null si falta alguna coordenada.
       ================================================= */
    calculateDistance(lat1, lon1, lat2, lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
        const R = 6371000; // radio terrestre en metros
        const toRad = (d) => d * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    },

    /* Formatea metros → "850 m" o "2.3 km" */
    formatDistance(meters) {
        if (meters == null || isNaN(meters)) return '';
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
    },

    /* =================================================
       HORARIOS
       schedule = { days:[1..5], start:"08:00", end:"12:00" }
       ================================================= */

    /* Representación compacta para cards: "Lun–Vie · 08:00–12:00" */
    formatScheduleCompact(schedule) {
        if (!schedule || !schedule.days || !schedule.days.length ||
            !schedule.start || !schedule.end) return '';

        const days = schedule.days.slice().sort((a, b) => a - b);
        const isWeekdays = days.length === 5 && days.every(d => d >= 1 && d <= 5);
        const isWeekend = days.length === 2 && days.includes(0) && days.includes(6);
        const isAll = days.length === 7;

        let daysLabel;
        if (isWeekdays) daysLabel = 'Lun–Vie';
        else if (isWeekend) daysLabel = 'Sáb–Dom';
        else if (isAll) daysLabel = 'Todos los días';
        else {
            const map = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
            daysLabel = days.map(d => map[d]).join(', ');
        }
        return `${daysLabel} · ${schedule.start}–${schedule.end}`;
    },

    /* Representación completa para el sheet */
    formatScheduleFull(schedule) {
        if (!schedule || !schedule.days || !schedule.days.length ||
            !schedule.start || !schedule.end) return '';
        const map = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
        const days = schedule.days.slice().sort((a, b) => a - b).map(d => map[d]);
        return `${days.join(', ')} · ${schedule.start} – ${schedule.end}`;
    }
};