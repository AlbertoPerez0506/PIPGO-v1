(function () {
    let views, navItems, mainContent, homeSearchBtn, homeSearchTrigger, btnVerTodos;
    let navigationStack = ['home'];
    let initialized = false;

    function switchView(viewName, { push = false } = {}) {
        if (viewName === AppState.currentView && !push) return;

        AppState.currentView = viewName;

        views.forEach(v => v.classList.remove('active'));
        const target = document.getElementById(`view-${viewName}`);
        if (target) target.classList.add('active');

        navItems.forEach(item => item.classList.toggle('active', item.dataset.view === viewName));

        mainContent.scrollTo({ top: 0, behavior: 'smooth' });

        // Reset del header inteligente + sincronización de chips al entrar a Home
        if (viewName === 'home') {
            if (window.PipGoHomeHeader) window.PipGoHomeHeader.reset();
            if (window.PublicationUI && PublicationUI.onEnterHome) PublicationUI.onEnterHome();
        }

        if (viewName === 'anunciarme') PublicationUI.updateAuthUI();
        if (viewName === 'perfil') ProfileUI.renderProfile();
        if (viewName === 'search') PublicationUI.onEnterSearch();
        if (viewName === 'admin' && window.AdminUI) AdminUI.onEnterAdmin();

        if (push) {
            const last = navigationStack[navigationStack.length - 1];
            if (viewName !== last) {
                navigationStack.push(viewName);
                history.pushState({ view: viewName }, '', '');
            }
        }
    }

    function focusSearchInput(delay = 320) {
        setTimeout(() => {
            const input = document.getElementById('search-input');
            if (input) input.focus();
        }, delay);
    }

    function closeAllOverlays() {
        if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
            PublicationUI.closeProductSheet(true);
            return true;
        }
        if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
            PublicationUI.closeLightbox(true);
            return true;
        }
        if (AuthUI.isAuthModalOpen && AuthUI.isAuthModalOpen()) {
            AuthUI.closeAuthModal();
            return true;
        }
        if (PublicationUI.isFilterModalOpen && PublicationUI.isFilterModalOpen()) {
            PublicationUI.closeFilterModal();
            return true;
        }
        if (ProfileUI.isSettingsModalOpen && ProfileUI.isSettingsModalOpen()) {
            ProfileUI.closeSettings();
            return true;
        }
        if (window.AdminUI && AdminUI.isConfirmModalOpen && AdminUI.isConfirmModalOpen()) {
            AdminUI.closeConfirm();
            return true;
        }
        if (window.SellerUI) {
            const sellerModal = document.getElementById('seller-modal');
            if (sellerModal && !sellerModal.classList.contains('hidden')) {
                SellerUI.close();
                return true;
            }
        }
        return false;
    }

    /* Botón atrás nativo (Cordova / Android hardware) */
    function onBackButton(e) {
        if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
            e.preventDefault();
            PublicationUI.closeLightbox();   // syncHistory=true → hace history.back() con supresión
            return;
        }
        if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
            e.preventDefault();
            PublicationUI.closeProductSheet(); // syncHistory=true → idem
            return;
        }
        if (closeAllOverlays()) { e.preventDefault(); return; }
        if (navigationStack.length > 1) { e.preventDefault(); history.back(); return; }
        if (window.cordova && navigator.app) { e.preventDefault(); navigator.app.exitApp(); }
    }

    /* Popstate: gesto back (iOS/Android moderno) y history.back() propio */
    function handlePopState(event) {
        // 1) Si el popstate lo disparamos nosotros (cierre manual de overlay),
        //    lo ignoramos para no cerrar otros overlays por error.
        if (PublicationUI.consumeSuppressPopstate && PublicationUI.consumeSuppressPopstate()) {
            return;
        }

        // 2) Overlays tienen prioridad sobre el cambio de vista.
        //    Cerramos sin llamar a history.back() (ya estamos en el estado previo).
        if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
            PublicationUI.closeLightbox(false);
            return;
        }
        if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
            PublicationUI.closeProductSheet(false);
            return;
        }
        if (window.AdminUI && AdminUI.isConfirmModalOpen && AdminUI.isConfirmModalOpen()) {
            AdminUI.closeConfirm();
            return;
        }

        // 3) Navegación normal entre vistas
        const view = event.state && event.state.view;
        if (!view) {
            navigationStack = ['home'];
            if (AppState.currentView !== 'home') switchView('home', { push: false });
            return;
        }
        const idx = navigationStack.indexOf(view);
        if (idx >= 0) navigationStack = navigationStack.slice(0, idx + 1);
        else navigationStack = [view];
        switchView(view, { push: false });
    }

    function init() {
        if (initialized) return;
        initialized = true;

        views = document.querySelectorAll('.view');
        navItems = document.querySelectorAll('.nav-item');
        mainContent = document.getElementById('main-content');
        homeSearchBtn = document.getElementById('home-search-btn');
        homeSearchTrigger = document.getElementById('home-search-trigger');
        btnVerTodos = document.getElementById('btn-ver-todos');

        navigationStack = ['home'];
        history.replaceState({ view: 'home' }, '', '');

        navItems.forEach(item => {
            item.addEventListener('click', () => switchView(item.dataset.view, { push: true }));
        });

        if (homeSearchBtn) {
            homeSearchBtn.addEventListener('click', () => {
                switchView('search', { push: true });
                focusSearchInput();
            });
        }

        if (homeSearchTrigger) {
            homeSearchTrigger.addEventListener('click', () => {
                switchView('search', { push: true });
                focusSearchInput();
            });
        }

        if (btnVerTodos) {
            btnVerTodos.addEventListener('click', () => {
                switchView('search', { push: true });
                PublicationUI.showAllPublications();
            });
        }

        window.addEventListener('popstate', handlePopState);

        if (window.cordova) {
            document.addEventListener('backbutton', onBackButton, false);
        }
    }

    window.NavigationUI = {
        init,
        switchView: (name) => switchView(name, { push: true })
    };
})();