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
    formDirtyState: false,

    /* ---------- Seller ---------- */
    currentSellerApplication: null,

    /* ---------- Just-in-time auth ---------- */
    pendingAction: null,

    /* ---------- Realtime Home ---------- */
    homeSubscription: null,
    hasPendingHomeUpdates: false,
    pendingHomePublications: [],

    /* ---------- Preferencias ---------- */
    prefHapticsEnabled: true,
    prefSoundsEnabled: false,

    resetSession() {
        this.currentProfile = null;
        this.currentPublicProfile = null;
        this.favoriteIds = new Set();
        this.currentLocation = null;
        this.currentProduct = null;
        this.isSubmitting = false;
        this.formDirtyState = false;
        this.currentSellerApplication = null;
        this.pendingAction = null;
        this.hasPendingHomeUpdates = false;
        this.pendingHomePublications = [];
        // FIX: limpiar filtros activos para que no persistan entre sesiones.
        this.activeCategoryFilter = '';
    }
};