(function () {
    let views, navItems, mainContent, homeSearchBtn, btnVerTodos;
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

        // Reset del header inteligente al entrar a Home
        if (viewName === 'home' && window.PipGoHomeHeader) {
            window.PipGoHomeHeader.reset();
        }

        if (viewName === 'anunciarme') PublicationUI.updateAuthUI();
        if (viewName === 'perfil') ProfileUI.renderProfile();
        if (viewName === 'search') PublicationUI.onEnterSearch();

        if (push) {
            const last = navigationStack[navigationStack.length - 1];
            if (viewName !== last) {
                navigationStack.push(viewName);
                history.pushState({ view: viewName }, '', '');
            }
        }
    }

    function closeAllOverlays() {
        if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
            PublicationUI.closeProductSheet(true);
            return true;
        }
        if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
            PublicationUI.closeLightbox();
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
        return false;
    }

    function onBackButton(e) {
        if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
            e.preventDefault(); PublicationUI.closeLightbox(); return;
        }
        if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
            e.preventDefault();
            PublicationUI.closeProductSheet(false);
            history.back();
            return;
        }
        if (closeAllOverlays()) { e.preventDefault(); return; }
        if (navigationStack.length > 1) { e.preventDefault(); history.back(); return; }
        if (window.cordova && navigator.app) { e.preventDefault(); navigator.app.exitApp(); }
    }

    function handlePopState(event) {
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
        btnVerTodos = document.getElementById('btn-ver-todos');

        navigationStack = ['home'];
        history.replaceState({ view: 'home' }, '', '');

        navItems.forEach(item => {
            item.addEventListener('click', () => switchView(item.dataset.view, { push: true }));
        });

        if (homeSearchBtn) {
            homeSearchBtn.addEventListener('click', () => {
                switchView('search', { push: true });
                setTimeout(() => {
                    const input = document.getElementById('search-input');
                    if (input) input.focus();
                }, 320);
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