/* =====================================================
   PIPGO · APP BOOTSTRAP
   ===================================================== */

(function () {
    'use strict';

    function initializeFeatures() {
        AuthUI.init();
        ProfileUI.init();
        PublicationUI.init();
        FavoriteUI.init();
        SellerUI.init();
        AdminUI.init();          // ← NUEVO
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
        try {
            const { cityName } = await LocationService.detectUserCity();
            if (cityName) {
                AppState.userCity = cityName;
                Storage.set('user_city', cityName);
                updateLocationChip(cityName);
                return;
            }
        } catch (e) {}

        const cached = Storage.get('user_city', null);
        if (cached) {
            AppState.userCity = cached;
            updateLocationChip(cached);
        } else {
            updateLocationChip('Emiliano Zapata');
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

        setTimeout(detectAndUpdateCity, 800);
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

    async function bootstrap() {
        try {
            initializeFeatures();
            NavigationUI.init();
            initLocationHeader();
            initHomeHeaderScroll();
            initializeAuthObserver();
            PublicationUI.loadPublications();
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