/* =====================================================
   PIPGO · APP BOOTSTRAP
   ===================================================== */

(function () {
    'use strict';

    /* Lock para evitar que detectAndUpdateCity se ejecute
       dos veces en paralelo (boot + click del chip). */
    let cityDetectionInFlight = null;

    function initializeFeatures() {
        AuthUI.init();
        ProfileUI.init();
        PublicationUI.init();
        FavoriteUI.init();
        SellerUI.init();
        AdminUI.init();
    }

    function getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    }

    function updateHomeGreeting(user) {
        const greetingEl = document.getElementById('home-greeting');
        if (!greetingEl) return;
        const prefix = getTimeGreeting();
        if (user && AppState.currentProfile && AppState.currentProfile.username) {
            greetingEl.textContent = `${prefix}, ${AppState.currentProfile.username}`;
        } else {
            greetingEl.textContent = prefix;
        }
    }

    function updateLocationChip(cityName) {
        const textEl = document.getElementById('location-text');
        if (!textEl) return;
        textEl.textContent = cityName || 'Sin ubicación';
    }

    async function detectAndUpdateCity() {
        if (cityDetectionInFlight) return cityDetectionInFlight;

        cityDetectionInFlight = (async () => {
            try {
                const { cityName } = await LocationService.detectUserCity();
                if (cityName) {
                    AppState.userCity = cityName;
                    Storage.set('user_city', cityName);
                    updateLocationChip(cityName);
                    return;
                }
            } catch (e) { /* silencioso */ }

            const cached = Storage.get('user_city', null);
            if (cached) {
                AppState.userCity = cached;
                updateLocationChip(cached);
            } else {
                updateLocationChip('Emiliano Zapata');
            }
        })();

        try {
            return await cityDetectionInFlight;
        } finally {
            cityDetectionInFlight = null;
        }
    }

    function initLocationHeader() {
        const cached = Storage.get('user_city', null);
        if (cached) {
            AppState.userCity = cached;
            updateLocationChip(cached);
        } else {
            updateLocationChip('Detectando…');
        }

        const chip = document.getElementById('location-chip');
        if (chip) {
            chip.addEventListener('click', async () => {
                Toast.info('Detectando tu ubicación…');
                await detectAndUpdateCity();
                if (AppState.userCity) Toast.success(`Ubicación: ${AppState.userCity}`);
            });
        }

        // Solo intentar refrescar si no hay caché reciente,
        // evitando gastar GPS innecesariamente.
        if (!cached) {
            setTimeout(detectAndUpdateCity, 800);
        }
    }

    function initHomeHeaderScroll() {
        const main = document.getElementById('main-content');
        const header = document.getElementById('home-header');
        const hero = document.getElementById('home-hero');
        if (!main || !header || !hero) return;

        let lastY = 0;
        let ticking = false;
        const THRESHOLD = 6;
        const MIN_Y = 60;

        function reset() {
            header.classList.remove('hero-hidden');
            lastY = main.scrollTop;
        }

        main.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = main.scrollTop;

                if (AppState.currentView !== 'home') {
                    header.classList.remove('hero-hidden');
                    lastY = y;
                    ticking = false;
                    return;
                }

                const diff = y - lastY;

                if (y <= 4) {
                    header.classList.remove('hero-hidden');
                } else if (diff > THRESHOLD && y > MIN_Y) {
                    header.classList.add('hero-hidden');
                } else if (diff < -THRESHOLD) {
                    header.classList.remove('hero-hidden');
                }

                lastY = y;
                ticking = false;
            });
        }, { passive: true });

        window.PipGoHomeHeader = { reset };
    }

    /* ---------- Pull-to-refresh ---------- */
    function initPullToRefresh() {
        const main = document.getElementById('main-content');
        if (!main) return;

        const indicator = document.createElement('div');
        indicator.className = 'ptr-indicator';
        indicator.innerHTML = '<i class="fa-solid fa-arrow-rotate-right"></i>';
        main.appendChild(indicator);

        let startY = 0;
        let pulling = false;
        let refreshing = false;
        const THRESHOLD = 70;
        const MAX_PULL = 110;

        main.addEventListener('touchstart', (e) => {
            if (main.scrollTop > 0 || refreshing) return;
            if (e.touches.length !== 1) return;
            startY = e.touches[0].clientY;
            pulling = true;
        }, { passive: true });

        main.addEventListener('touchmove', (e) => {
            if (!pulling || refreshing) return;
            const dy = e.touches[0].clientY - startY;
            if (dy <= 0) { pulling = false; return; }

            const clamped = Math.min(dy * 0.5, MAX_PULL);
            indicator.classList.add('visible', 'pulling');
            indicator.style.transform = `translateY(${clamped - 60}px)`;
            indicator.style.setProperty('--ptr-deg', (clamped * 2).toFixed(0));
        }, { passive: true });

        main.addEventListener('touchend', async () => {
            if (!pulling || refreshing) { pulling = false; return; }
            pulling = false;

            const currentY = parseFloat((indicator.style.transform.match(/-?\d+(\.\d+)?/) || [0])[0]) + 60;

            if (currentY >= THRESHOLD * 0.5) {
                refreshing = true;
                indicator.classList.remove('pulling');
                indicator.classList.add('refreshing');
                indicator.style.transform = 'translateY(20px)';

                try {
                    if (window.HapticsService) HapticsService.light();

                    if (AppState.currentView === 'home' && window.PublicationUI) {
                        const pubs = await PublicationService.getActivePublications();
                        AppState.currentPublications = pubs;
                        PublicationUI.onEnterHome();
                        PublicationUI.renderHomeFilters(pubs);
                    } else if (AppState.currentView === 'search') {
                        const pubs = await PublicationService.getActivePublications();
                        AppState.currentPublications = pubs;
                        PublicationUI.onEnterSearch();
                        PublicationUI.renderSearchResults(
                            AppState.currentPublications
                        );
                    } else if (AppState.currentView === 'perfil' && window.ProfileUI) {
                        await ProfileUI.renderProfile();
                    } else if (AppState.currentView === 'anunciarme' && window.PermissionService) {
                        // no-op
                    }
                } catch (e) {
                    if (window.Logger) Logger.warn('Pull-to-refresh error', e);
                } finally {
                    setTimeout(() => {
                        indicator.classList.remove('visible', 'refreshing');
                        indicator.style.transform = '';
                        refreshing = false;
                    }, 400);
                }
            } else {
                indicator.classList.remove('visible', 'pulling');
                indicator.style.transform = '';
            }
        });
    }

    function runPendingAction() {
        const action = AppState.pendingAction;
        AppState.pendingAction = null;
        if (!action) return;

        switch (action.type) {
            case 'toggleFavorite':
                if (window.FavoriteUI) FavoriteUI.toggleFavorite(action.publicationId);
                break;
            case 'openChat':
                Toast.info('Los mensajes directos llegarán en la V2.');
                break;
            case 'openSellerForm':
                if (window.SellerUI) SellerUI.open();
                break;
        }
    }

    function initializeAuthObserver() {
        AuthService.onAuthStateChanged(async (user) => {
            const wasAuthenticated = !!AppState.currentUser;
            AppState.currentUser = user;

            if (user) {
                try {
                    const profile = await UserService.getProfile(user.uid);
                    AppState.currentProfile = profile;
                    await FavoriteUI.loadFavorites(user.uid);
                } catch (error) {
                    Logger.error('Error cargando perfil al autenticar', error);
                    AppState.currentProfile = null;
                }
            } else {
                AppState.resetSession();
                if (wasAuthenticated && window.PublicationUI &&
                    PublicationUI.stopHomeSubscription) {
                    PublicationUI.stopHomeSubscription();
                }
            }

            updateHomeGreeting(user);
            PublicationUI.updateAuthUI();
            ProfileUI.renderProfile();
            FavoriteUI.updateAllButtons();

            if (user && AppState.pendingAction) {
                setTimeout(runPendingAction, 180);
            }
        });
    }

    /* =====================================================
       HANDLER GLOBAL DE ESCAPE
       Cierra overlays en orden de jerarquía. Los modales
       con lógica propia (ConfirmDialog) gestionan su
       Escape por su cuenta y NO se tocan aquí.
       ===================================================== */
    function initGlobalEscapeHandler() {
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            // Orden: overlays superpuestos primero.
            if (window.PublicationUI) {
                if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
                    e.preventDefault();
                    PublicationUI.closeLightbox();
                    return;
                }
                if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
                    e.preventDefault();
                    PublicationUI.closeProductSheet();
                    return;
                }
                if (PublicationUI.isPreviewModalOpen && PublicationUI.isPreviewModalOpen()) {
                    e.preventDefault();
                    PublicationUI.closePreview();
                    return;
                }
                if (PublicationUI.isFilterModalOpen && PublicationUI.isFilterModalOpen()) {
                    e.preventDefault();
                    PublicationUI.closeFilterModal();
                    return;
                }
            }

            if (window.AdminUI && AdminUI.isConfirmModalOpen && AdminUI.isConfirmModalOpen()) {
                e.preventDefault();
                AdminUI.closeConfirm();
                return;
            }

            if (window.AuthUI && AuthUI.isAuthModalOpen && AuthUI.isAuthModalOpen()) {
                e.preventDefault();
                AuthUI.closeAuthModal();
                return;
            }

            if (window.ProfileUI && ProfileUI.isSettingsModalOpen && ProfileUI.isSettingsModalOpen()) {
                e.preventDefault();
                ProfileUI.closeSettings();
                return;
            }

            // Modales sin lógica colateral: se cierran directo.
            ['draft-modal', 'seller-modal'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.classList.contains('hidden')) {
                    e.preventDefault();
                    el.classList.add('hidden');
                }
            });
        });
    }

    async function bootstrap() {
        try {
            ConnectivityService.init();

            AppState.prefHapticsEnabled = Storage.get('pref_haptics_enabled', true);
            AppState.prefSoundsEnabled = Storage.get('pref_sounds_enabled', false);

            initializeFeatures();

            NavigationUI.init();
            initLocationHeader();
            initHomeHeaderScroll();
            initPullToRefresh();
            initGlobalEscapeHandler();
            initializeAuthObserver();
            PublicationUI.loadPublications();
            ConnectivityUI.init();
        } catch (error) {
            Logger.error('Error durante el bootstrap de PipGo', error);
            Toast.error('Ocurrió un problema al iniciar la aplicación.');
        }
    }

    if (window.cordova) {
        document.addEventListener('deviceready', bootstrap, { once: true });
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    } else {
        bootstrap();
    }
})();