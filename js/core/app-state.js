/* =====================================================
   PIPGO · APP STATE
   ===================================================== */

window.AppState = {
    /* ---------- Sesión ---------- */
    currentUser: null,
    currentProfile: null,
    currentPublicProfile: null,

    /* ---------- Datos ---------- */
    currentPublications: [],
    favoriteIds: new Set(),

    /* ---------- Navegación / UI ---------- */
    currentView: 'home',
    currentProduct: null,

    /* ---------- Ubicación ---------- */
    currentLocation: null,
    userCity: null,
    userCoords: null,
    locationPermission: null,

    /* ---------- Filtros ---------- */
    activeCategoryFilter: '',

    /* ---------- Form ---------- */
    isSubmitting: false,

    /* ---------- Seller ---------- */
    currentSellerApplication: null,

    /* ---------- Just-in-time auth ---------- */
    pendingAction: null,

    resetSession() {
        this.currentProfile = null;
        this.currentPublicProfile = null;
        this.favoriteIds = new Set();
        this.currentLocation = null;
        this.currentProduct = null;
        this.isSubmitting = false;
        this.currentSellerApplication = null;
        this.pendingAction = null;
    }
};