window.AppState = {
    currentUser: null,
    currentProfile: null,

    currentPublications: [],
    favoriteIds: new Set(),

    currentView: 'home',
    currentProduct: null,

    // Ubicación
    currentLocation: null,       // temporal para el form
    userCity: null,              // ciudad detectada (header)
    locationPermission: null,    // 'granted' | 'denied' | 'prompt'

    // Categorías activas (filtro de búsqueda)
    activeCategoryFilter: '',

    isSubmitting: false,

    resetSession() {
        this.currentProfile = null;
        this.favoriteIds = new Set();
        this.currentLocation = null;
        this.currentProduct = null;
        this.isSubmitting = false;
        // userCity se conserva (no depende de sesión)
    }
};