/* =====================================================
   PIPGO · PROFILE UI
   Perfil rediseñado con tabs, modal de ajustes, ventas.
   ===================================================== */

(function () {
    let profileContent, avatarInput;
    let ownPublications = [];
    let favorites = [];
    let initialized = false;

    let settingsModal, settingsClose;

    function renderLoginPrompt() {
        profileContent.innerHTML = `
            <header class="profile-header-pro">
                <h2>Perfil</h2>
            </header>
            <div class="login-required">
                <i class="fa-solid fa-user-lock"></i>
                <h3>No has iniciado sesión</h3>
                <p>Inicia sesión para ver tu perfil y publicar.</p>
                <button class="btn-primary" id="btn-profile-login">Iniciar sesión</button>
            </div>`;
        const btn = document.getElementById('btn-profile-login');
        if (btn) btn.addEventListener('click', () => AuthUI.openAuthModal('login'));
    }

    async function renderProfile() {
        if (!AppState.currentUser) { renderLoginPrompt(); return; }

        profileContent.innerHTML = `
            <header class="profile-header-pro">
                <h2>Perfil</h2>
            </header>
            <p style="text-align:center;padding:40px;color:var(--text-tertiary);">Cargando perfil…</p>`;

        const uid = AppState.currentUser.uid;

        try {
            const profile = await UserService.getProfile(uid);
            if (!profile) {
                profileContent.innerHTML = `
                    <header class="profile-header-pro"><h2>Perfil</h2></header>
                    <div class="login-required">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <h3>Perfil no encontrado</h3>
                    </div>`;
                return;
            }

            AppState.currentProfile = profile;
            ownPublications = await PublicationService.getUserPublications(uid);
            favorites = await FavoriteService.getFavoritePublications(uid);

            const soldCount = ownPublications.filter(p => p.status === 'sold').length;
            const activeCount = ownPublications.filter(p => p.status === 'active').length;

            const avatarHtml = profile.avatarUrl
                ? `<img src="${Formatters.safeUrl(profile.avatarUrl)}" alt="Avatar">`
                : `<i class="fa-solid fa-user" style="font-size:38px;color:var(--text-tertiary);"></i>`;

            profileContent.innerHTML = `
                <header class="profile-header-pro">
                    <h2>Perfil</h2>
                    <button class="icon-btn" id="btn-open-settings" aria-label="Ajustes">
                        <i class="fa-solid fa-gear"></i>
                    </button>
                </header>

                <div class="profile-hero-pro">
                    <div class="profile-avatar" id="profile-avatar">${avatarHtml}</div>
                    <h3 class="profile-username">@${Formatters.escapeHtml(profile.username)}</h3>
                    <span class="user-badge-pro"><i class="fa-solid fa-circle-check"></i> Vendedor verificado</span>
                    <button class="btn-outline edit-profile-btn" id="btn-change-avatar">
                        <i class="fa-solid fa-camera"></i> Cambiar foto
                    </button>
                </div>

                <div class="profile-stats-pro">
                    <div class="stat-pro pub">
                        <i class="stat-icon fa-solid fa-box-open"></i>
                        <span class="stat-number">${activeCount}</span>
                        <span class="stat-label">Publicaciones</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-pro fav">
                        <i class="stat-icon fa-solid fa-bookmark"></i>
                        <span class="stat-number">${favorites.length}</span>
                        <span class="stat-label">Favoritos</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-pro sold">
                        <i class="stat-icon fa-solid fa-hand-holding-dollar"></i>
                        <span class="stat-number">${soldCount}</span>
                        <span class="stat-label">Ventas</span>
                    </div>
                </div>

                <div class="profile-tabs">
                    <button class="profile-tab active" data-panel="own">
                        <i class="fa-solid fa-box-open"></i> Mis publicaciones
                    </button>
                    <button class="profile-tab" data-panel="fav">
                        <i class="fa-solid fa-bookmark"></i> Favoritos
                    </button>
                </div>

                <div class="profile-panel active" id="panel-own">
                    <div id="user-products-grid" class="products-grid"></div>
                </div>
                <div class="profile-panel" id="panel-fav">
                    <div id="user-favorites-grid" class="products-grid"></div>
                </div>
            `;

            renderOwnPublications(ownPublications);
            renderFavoritePublications(favorites);

            document.getElementById('btn-change-avatar').addEventListener('click', () => avatarInput.click());
            document.getElementById('btn-open-settings').addEventListener('click', () => openSettings(profile));

            document.querySelectorAll('.profile-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    const panelId = tab.dataset.panel === 'own' ? 'panel-own' : 'panel-fav';
                    document.getElementById(panelId).classList.add('active');
                });
            });

        } catch (error) {
            Logger.error('Error cargando perfil', error);
            profileContent.innerHTML = `
                <header class="profile-header-pro"><h2>Perfil</h2></header>
                <div class="login-required">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <h3>No pudimos cargar tu perfil</h3>
                    <p>Inténtalo de nuevo más tarde.</p>
                </div>`;
        }
    }

    function buildCard(pub, options = {}) {
        const { withActions = false, showSold = false } = options;
        const card = document.createElement('article');
        card.className = 'product-card';
        card.dataset.id = pub.id;

        const safeImg = Formatters.safeUrl(pub.mainImage) || 'https://via.placeholder.com/300';
        const isSold = pub.status === 'sold';

        const imgWrap = document.createElement('div');
        imgWrap.className = 'product-img';

        const img = document.createElement('img');
        img.src = safeImg; img.alt = pub.name || ''; img.loading = 'lazy';
        imgWrap.appendChild(img);

        // Chip de categoría
        if (pub.category) {
            const chip = DOM.el('span', { class: 'product-category-chip' }, [pub.category]);
            imgWrap.appendChild(chip);
        }

        // Badge vendido
        if (isSold) {
            const soldBadge = DOM.el('span', { class: 'sold-badge' }, [
                DOM.el('i', { class: 'fa-solid fa-check' }), ' Vendido'
            ]);
            imgWrap.appendChild(soldBadge);
        }

        // Favorito
        const favBtn = DOM.el('button', { class: 'product-favorite', 'data-fav-id': pub.id, 'aria-label': 'Guardar' }, [
            DOM.el('i', { class: 'fa-regular fa-bookmark' })
        ]);
        imgWrap.appendChild(favBtn);

        const info = document.createElement('div');
        info.className = 'product-info';

        if (pub.storeName) {
            info.appendChild(DOM.el('span', { class: 'product-store' }, [
                DOM.el('i', { class: 'fa-solid fa-store' }), pub.storeName
            ]));
        }
        info.appendChild(DOM.el('h4', {}, [pub.name || '']));
        info.appendChild(DOM.el('span', { class: 'product-price' }, [Formatters.formatPrice(pub.price)]));

        if (withActions) {
            const actions = DOM.el('div', { class: 'card-actions' });
            const editBtn = DOM.el('button', { class: 'btn-edit', 'data-edit-id': pub.id }, ['Editar']);
            actions.appendChild(editBtn);
            if (pub.status === 'active') {
                const soldBtn = DOM.el('button', { class: 'btn-sold', 'data-sold-id': pub.id }, [
                    DOM.el('i', { class: 'fa-solid fa-check' }), 'Vendido'
                ]);
                actions.appendChild(soldBtn);
            }
            const delBtn = DOM.el('button', { class: 'btn-delete', 'data-delete-id': pub.id }, ['Eliminar']);
            actions.appendChild(delBtn);
            info.appendChild(actions);
        }

        card.appendChild(imgWrap);
        card.appendChild(info);

        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            PublicationUI.openProductSheet(pub);
        });

        return card;
    }

    function renderOwnPublications(list) {
        const container = document.getElementById('user-products-grid');
        if (!container) return;
        container.innerHTML = '';
        if (!list.length) {
            container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-tertiary);padding:20px;">No has publicado nada todavía.</p>';
            return;
        }
        list.forEach(pub => container.appendChild(buildCard(pub, { withActions: true })));
        FavoriteUI.updateAllButtons();
    }

    function renderFavoritePublications(list) {
        const container = document.getElementById('user-favorites-grid');
        if (!container) return;
        container.innerHTML = '';
        if (!list.length) {
            container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-tertiary);padding:20px;">Todavía no tienes favoritos.</p>';
            return;
        }
        list.forEach(pub => container.appendChild(buildCard(pub)));
        FavoriteUI.updateAllButtons();
    }

    function handleProfileClick(e) {
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            e.stopPropagation();
            const pub = ownPublications.find(p => p.id === editBtn.dataset.editId);
            if (pub) PublicationUI.openEditForm(pub);
            return;
        }
        const soldBtn = e.target.closest('.btn-sold');
        if (soldBtn) {
            e.stopPropagation();
            const pub = ownPublications.find(p => p.id === soldBtn.dataset.soldId);
            if (pub) markAsSold(pub);
            return;
        }
        const delBtn = e.target.closest('.btn-delete');
        if (delBtn) {
            e.stopPropagation();
            const pub = ownPublications.find(p => p.id === delBtn.dataset.deleteId);
            if (pub) PublicationUI.deletePublication(pub);
        }
    }

    async function markAsSold(pub) {
        const confirmed = window.confirm(
            `¿Marcar "${pub.name}" como vendido?\n\n` +
            `Aparecerá como vendido en tu perfil durante 24 horas y luego se ocultará automáticamente.`
        );
        if (!confirmed) return;
        try {
            await PublicationService.markAsSold(pub.id);
            Toast.success('¡Publicación marcada como vendida!');
            await PublicationUI.loadPublications();
            renderProfile();
        } catch (error) {
            Logger.error('Error marcando como vendido', error);
            Toast.error('No pudimos actualizar la publicación.');
        }
    }

    async function handleAvatarChange() {
        const file = avatarInput.files[0];
        if (!file) return;
        try {
            Toast.info('Subiendo avatar…');
            const compressed = await ImageService.compressImage(file);
            const upload = await ImageService.uploadImageToCloudinary(compressed);
            await UserService.updateAvatar(AppState.currentUser.uid, upload.secure_url);
            AppState.currentProfile.avatarUrl = upload.secure_url;
            renderProfile();
            Toast.success('Avatar actualizado.');
        } catch (error) {
            Logger.error('Error subiendo avatar', error);
            Toast.error('No pudimos subir el avatar.');
        } finally {
            avatarInput.value = '';
        }
    }

    function openSettings(profile) {
        const email = profile.email || (AppState.currentUser && AppState.currentUser.email) || '—';
        const list = document.getElementById('settings-list');
        list.innerHTML = '';

        list.innerHTML = `
            <div class="settings-row">
                <div class="s-icon"><i class="fa-solid fa-envelope"></i></div>
                <div class="s-text">
                    <span class="s-label">Correo electrónico</span>
                    <span class="s-value">${Formatters.escapeHtml(email)}</span>
                </div>
            </div>
            <div class="settings-row">
                <div class="s-icon"><i class="fa-solid fa-user"></i></div>
                <div class="s-text">
                    <span class="s-label">Username</span>
                    <span class="s-value">@${Formatters.escapeHtml(profile.username || '')}</span>
                </div>
            </div>
            <div class="settings-row">
                <div class="s-icon"><i class="fa-solid fa-shield-halved"></i></div>
                <div class="s-text">
                    <span class="s-label">Cuenta</span>
                    <span class="s-value">Activa</span>
                </div>
            </div>
            <div class="settings-row" style="justify-content:center;padding-top:20px;border:none;">
                <button class="btn-outline" id="btn-logout-pro" style="color:var(--danger-fg);border-color:var(--danger-fg);">
                    <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
                </button>
            </div>
        `;

        document.getElementById('btn-logout-pro').addEventListener('click', async () => {
            try {
                closeSettings();
                await AuthService.logout();
                Toast.success('Sesión cerrada.');
            } catch (e) {
                Toast.error('No pudimos cerrar la sesión.');
            }
        });

        settingsModal.classList.remove('hidden');
    }

    function closeSettings() {
        settingsModal.classList.add('hidden');
    }

    function isSettingsModalOpen() {
        return settingsModal && !settingsModal.classList.contains('hidden');
    }

    function init() {
        if (initialized) return;
        initialized = true;
        profileContent = document.getElementById('profile-content');
        avatarInput = document.getElementById('avatar-input');
        settingsModal = document.getElementById('settings-modal');
        settingsClose = document.getElementById('settings-close');

        profileContent.addEventListener('click', handleProfileClick);
        avatarInput.addEventListener('change', handleAvatarChange);
        settingsClose.addEventListener('click', closeSettings);
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettings();
        });
    }

    window.ProfileUI = {
        init,
        renderProfile,
        openSettings,
        closeSettings,
        isSettingsModalOpen
    };
})();