/* =====================================================
   PIPGO · LOCATION SERVICE
   Geolocalización + reverse geocoding (Nominatim).
   Detecta la ciudad del usuario para el header.
   ===================================================== */

window.LocationService = {

    getCurrentPosition(options = {}) {
        const { silent = false } = options;
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada en este dispositivo.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                }),
                (error) => {
                    const msg = this.getGeolocationErrorMessage(error);
                    const err = new Error(msg);
                    err.code = error.code;
                    if (!silent) Logger.warn('Geolocation error', msg);
                    reject(err);
                },
                { enableHighAccuracy: true, timeout: CONFIG.GEO_TIMEOUT_MS, maximumAge: 60000 }
            );
        });
    },

    getGeolocationErrorMessage(error) {
        switch (error.code) {
            case 1: return 'Permiso de ubicación denegado. Actívalo en ajustes.';
            case 2: return 'No se pudo obtener la ubicación actual.';
            case 3: return 'El GPS tardó demasiado en responder.';
            default: return error.message || 'Error al obtener ubicación.';
        }
    },

    async reverseGeocode(lat, lon) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.REVERSE_GEO_TIMEOUT_MS);

            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`;
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeout);

            if (!response.ok) return null;
            const data = await response.json();
            if (data && data.address) {
                const addr = data.address;
                // Prioridad: ciudad → pueblo → villa → municipio → condado → estado
                const cityName =
                    addr.city ||
                    addr.town ||
                    addr.village ||
                    addr.municipality ||
                    addr.county ||
                    addr.state_district ||
                    addr.state ||
                    '';
                return {
                    address: data.display_name || '',
                    shortAddress: this._buildShortAddress(addr),
                    city: cityName,
                    town: addr.town || '',
                    village: addr.village || '',
                    state: addr.state || '',
                    country: addr.country || '',
                    postcode: addr.postcode || '',
                    raw: addr
                };
            }
            return null;
        } catch (error) {
            Logger.warn('Reverse geocoding falló', error);
            return null;
        }
    },

    _buildShortAddress(addr) {
        const parts = [];
        if (addr.road) parts.push(addr.road);
        if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        return parts.filter(Boolean).join(', ');
    },

    /* Devuelve solo el nombre de ciudad/pueblo listo para mostrar */
    async detectUserCity() {
        const position = await this.getCurrentPosition({ silent: true });
        const geo = await this.reverseGeocode(position.latitude, position.longitude);
        const cityName = geo && geo.city ? geo.city : null;
        return { position, geo, cityName };
    }
};