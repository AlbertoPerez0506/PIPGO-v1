/* =====================================================
   PIPGO · APP STATE
   Estado global compartido entre features.
   ===================================================== */

window.AppState = {
    /* ---------- Sesión ---------- */
    currentUser: null,
    currentProfile: null,

    /* ---------- Datos ---------- */
    currentPublications: [],
    favoriteIds: new Set(),

    /* ---------- Navegación / UI ---------- */
    currentView: 'home',
    currentProduct: null,

    /* ---------- Ubicación ---------- */
    currentLocation: null,        // Ubicación usada para la publicación en curso (form)
    userCity: null,               // Ciudad detectada (header)
    userCoords: null,             // { latitude, longitude } del usuario (para distancias)
    locationPermission: null,     // 'granted' | 'denied' | 'prompt'

    /* ---------- Filtros ---------- */
    activeCategoryFilter: '',

    /* ---------- Form ---------- */
    isSubmitting: false,

    /* Limpia estado dependiente de sesión */
    resetSession() {
        this.currentProfile = null;
        this.favoriteIds = new Set();
        this.currentLocation = null;
        this.currentProduct = null;
        this.isSubmitting = false;
        // userCity y userCoords se conservan (no dependen de sesión)
    }
};