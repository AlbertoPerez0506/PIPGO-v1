(function () {
    let profileContent, avatarInput;
    let ownPublications = [];
    let favorites = [];
    let soldPublications = [];
    let initialized = false;

    let settingsModal, settingsClose;

    /* -----------------------------------------------------
       LOGIN PROMPT
       ----------------------------------------------------- */
    function renderLoginPrompt() {
        profileContent.innerHTML = `
            <header class="profile-header-pro">
                <div class="profile-header-row">
                    <div class="profile-heading">
                        <div class="title-row">
                            <h2>Perfil</h2>
                        </div>
                    </div>
                </div>
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

    /* -----------------------------------------------------
       RENDER PRINCIPAL
       ----------------------------------------------------- */
    async function renderProfile() {
        if (!AppState.currentUser) { renderLoginPrompt(); return; }

        profileContent.innerHTML = `
            <header class="profile-header-pro">
                <div class="profile-header-row">
                    <div class="profile-heading">
                        <div class="title-row">
                            <h2>Perfil</h2>
                        </div>
                    </div>
                </div>
            </header>
            <p style="text-align:center;padding:40px;color:var(--text-tertiary);">Cargando perfil…</p>`;

        const uid = AppState.currentUser.uid;

        try {
            const profile = await UserService.getProfile(uid);
            if (!profile) {
                profileContent.innerHTML = `
                    <header class="profile-header-pro">
                        <div class="profile-header-row">
                            <div class="profile-heading">
                                <div class="title-row">
                                    <h2>Perfil</h2>
                                </div>
                            </div>
                        </div>
                    </header>
                    <div class="login-required">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <h3>Perfil no encontrado</h3>
                    </div>`;
                return;
            }

            AppState.currentProfile = profile;
            ownPublications = await PublicationService.getUserPublications(uid);
            favorites = await FavoriteService.getFavoritePublications(uid);
            soldPublications = ownPublications.filter(p => p.status === 'sold');

            const activeCount = ownPublications.filter(p => p.status === 'active').length;

            const avatarHtml = profile.avatarUrl
                ? `<img src="${Formatters.safeUrl(profile.avatarUrl)}" alt="Avatar">`
                : `<i class="fa-solid fa-user profile-avatar-fallback-icon"></i>`;

            profileContent.innerHTML = `
                <header class="profile-header-pro">
                    <div class="profile-header-row">
                        <div class="profile-heading">
                            <div class="title-row">
                                <h2>Perfil</h2>
                                <button class="profile-settings-btn" id="btn-open-settings" aria-label="Ajustes">
                                    <i class="fa-solid fa-gear"></i>
                                </button>
                            </div>
                            <p class="profile-username">@${Formatters.escapeHtml(profile.username)}</p>
                        </div>

                        <div class="profile-avatar-wrap">
                            <div class="profile-avatar" id="profile-avatar">${avatarHtml}</div>
                            <button class="profile-avatar-edit" id="btn-change-avatar" aria-label="Cambiar foto">
                                <i class="fa-solid fa-camera"></i>
                            </button>
                        </div>
                    </div>

                    <div class="profile-stats-pro" role="list">
                        <div class="stat-pro pub" role="listitem">
                            <span class="stat-number">${activeCount}</span>
                            <span class="stat-label">Publicaciones</span>
                        </div>
                        <div class="stat-pro fav" role="listitem">
                            <span class="stat-number">${favorites.length}</span>
                            <span class="stat-label">Favoritos</span>
                        </div>
                        <div class="stat-pro sold" role="listitem">
                            <span class="stat-number">${soldPublications.length}</span>
                            <span class="stat-label">Ventas</span>
                        </div>
                    </div>
                </header>

                <div class="profile-tabs" role="tablist">
                    <button class="profile-tab active" data-panel="own" role="tab">
                        <i class="fa-solid fa-box-open"></i> Mis publicaciones
                    </button>
                    <button class="profile-tab" data-panel="fav" role="tab">
                        <i class="fa-solid fa-bookmark"></i> Favoritos
                    </button>
                    <button class="profile-tab" data-panel="sold" role="tab">
                        <i class="fa-solid fa-hand-holding-dollar"></i> Ventas
                    </button>
                </div>

                <div class="profile-panel active" id="panel-own">
                    <div id="user-products-grid" class="products-grid"></div>
                </div>
                <div class="profile-panel" id="panel-fav">
                    <div id="user-favorites-grid" class="products-grid"></div>
                </div>
                <div class="profile-panel" id="panel-sold">
                    <div id="user-sold-grid" class="products-grid"></div>
                </div>
            `;

            renderOwnPublications(ownPublications);
            renderFavoritePublications(favorites);
            renderSoldPublications(soldPublications);

            document.getElementById('btn-change-avatar').addEventListener('click', () => avatarInput.click());
            document.getElementById('btn-open-settings').addEventListener('click', () => openSettings(profile));

            document.querySelectorAll('.profile-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    const panelMap = { own: 'panel-own', fav: 'panel-fav', sold: 'panel-sold' };
                    const panelId = panelMap[tab.dataset.panel];
                    if (panelId) document.getElementById(panelId).classList.add('active');
                });
            });

        } catch (error) {
            Logger.error('Error cargando perfil', error);
            profileContent.innerHTML = `
                <header class="profile-header-pro">
                    <div class="profile-header-row">
                        <div class="profile-heading">
                            <div class="title-row">
                                <h2>Perfil</h2>
                            </div>
                        </div>
                    </div>
                </header>
                <div class="login-required">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>No pudimos cargar tu perfil</h3>
                    <p>Inténtalo de nuevo más tarde.</p>
                </div>`;
        }
    }

    /* -----------------------------------------------------
       TARJETA DE PRODUCTO
       ----------------------------------------------------- */
    function buildCard(pub, options = {}) {
        const { withActions = false } = options;
        const card = document.createElement('article');
        card.className = 'product-card';
        card.dataset.id = pub.id;

        const safeImg = Formatters.safeUrl(pub.mainImage) || 'https://via.placeholder.com/300';
        const isSold = pub.status === 'sold';

        const imgWrap = document.createElement('div');
        imgWrap.className = 'product-img';

        const img = document.createElement('img');
        img.src = safeImg;
        img.alt = pub.name || '';
        img.loading = 'lazy';
        imgWrap.appendChild(img);

        if (pub.category) {
            imgWrap.appendChild(DOM.el('span', { class: 'product-category-chip' }, [pub.category]));
        }
        if (isSold) {
            imgWrap.appendChild(DOM.el('span', { class: 'sold-badge' }, [
                DOM.el('i', { class: 'fa-solid fa-check' }), ' Vendido'
            ]));
        }

        const favBtn = DOM.el('button', {
            class: 'product-favorite',
            'data-fav-id': pub.id,
            'aria-label': 'Guardar'
        }, [ DOM.el('i', { class: 'fa-regular fa-bookmark' }) ]);
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

            // Editar: icono + label (el label se oculta en móvil vía CSS)
            const editBtn = DOM.el('button', {
                class: 'card-action-btn btn-edit',
                'data-edit-id': pub.id,
                'aria-label': 'Editar'
            }, [
                DOM.el('i', { class: 'fa-solid fa-pen-to-square' }),
                DOM.el('span', { class: 'card-action-label' }, ['Editar'])
            ]);
            actions.appendChild(editBtn);

            // Vendido: icono + label (solo si está activa)
            if (pub.status === 'active') {
                const soldBtn = DOM.el('button', {
                    class: 'card-action-btn btn-sold',
                    'data-sold-id': pub.id,
                    'aria-label': 'Marcar como vendido'
                }, [
                    DOM.el('i', { class: 'fa-solid fa-hand-holding-dollar' }),
                    DOM.el('span', { class: 'card-action-label' }, ['Vendido'])
                ]);
                actions.appendChild(soldBtn);
            }

            // Eliminar: solo icono siempre (con aria-label)
            const delBtn = DOM.el('button', {
                class: 'card-action-btn btn-delete',
                'data-delete-id': pub.id,
                'aria-label': 'Eliminar'
            }, [ DOM.el('i', { class: 'fa-solid fa-trash' }) ]);
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

    /* -----------------------------------------------------
       RENDER DE PANELES
       ----------------------------------------------------- */
    function emptyState({ icon, title, text, actionLabel, actionId }) {
        const el = DOM.el('div', { class: 'empty-state' });
        el.innerHTML = `
            <div class="empty-state-icon"><i class="fa-solid ${icon}"></i></div>
            <h4>${Formatters.escapeHtml(title)}</h4>
            <p>${Formatters.escapeHtml(text)}</p>
            ${actionLabel ? `<button class="empty-action" id="${actionId}">
                <i class="fa-solid fa-arrow-right"></i> ${Formatters.escapeHtml(actionLabel)}
            </button>` : ''}
        `;
        return el;
    }

    function renderOwnPublications(list) {
        const container = document.getElementById('user-products-grid');
        if (!container) return;
        container.innerHTML = '';
        if (!list.length) {
            const empty = emptyState({
                icon: 'fa-box-open',
                title: 'Aún no tienes publicaciones',
                text: 'Publica tu primer producto para empezar a vender.',
                actionLabel: 'Crear publicación',
                actionId: 'empty-create-pub'
            });
            container.appendChild(empty);
            const btn = document.getElementById('empty-create-pub');
            if (btn) btn.addEventListener('click', () => NavigationUI.switchView('anunciarme'));
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
            const empty = emptyState({
                icon: 'fa-bookmark',
                title: 'Sin favoritos todavía',
                text: 'Guarda publicaciones que te interesen para verlas aquí.',
                actionLabel: 'Explorar',
                actionId: 'empty-explore-fav'
            });
            container.appendChild(empty);
            const btn = document.getElementById('empty-explore-fav');
            if (btn) btn.addEventListener('click', () => NavigationUI.switchView('search'));
            return;
        }
        list.forEach(pub => container.appendChild(buildCard(pub)));
        FavoriteUI.updateAllButtons();
    }

    function renderSoldPublications(list) {
        const container = document.getElementById('user-sold-grid');
        if (!container) return;
        container.innerHTML = '';
        if (!list.length) {
            container.appendChild(emptyState({
                icon: 'fa-hand-holding-dollar',
                title: 'Sin ventas recientes',
                text: 'Cuando vendas una publicación aparecerá aquí durante 24 horas.'
            }));
            return;
        }
        list.forEach(pub => container.appendChild(buildCard(pub)));
        FavoriteUI.updateAllButtons();
    }

    /* -----------------------------------------------------
       ACCIONES DE CARD
       ----------------------------------------------------- */
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

    /* -----------------------------------------------------
       AVATAR
       ----------------------------------------------------- */
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

    /* -----------------------------------------------------
       AJUSTES — modal agrupado
       ----------------------------------------------------- */
    function openSettings(profile) {
        const email = profile.email || (AppState.currentUser && AppState.currentUser.email) || '—';
        const list = document.getElementById('settings-list');

        list.innerHTML = `
            <div class="settings-group">
                <span class="settings-group-title">Cuenta</span>
                <div class="settings-group-card">
                    <div class="settings-row">
                        <div class="s-icon tone-coffee"><i class="fa-solid fa-at"></i></div>
                        <div class="s-text">
                            <span class="s-label">Username</span>
                            <span class="s-value">@${Formatters.escapeHtml(profile.username || '')}</span>
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="s-icon tone-warm"><i class="fa-solid fa-envelope"></i></div>
                        <div class="s-text">
                            <span class="s-label">Correo electrónico</span>
                            <span class="s-value">${Formatters.escapeHtml(email)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-group">
                <span class="settings-group-title">Estado</span>
                <div class="settings-group-card">
                    <div class="settings-row">
                        <div class="s-icon tone-green"><i class="fa-solid fa-shield-halved"></i></div>
                        <div class="s-text">
                            <span class="s-label">Cuenta</span>
                            <span class="s-value">Activa</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-group">
                <span class="settings-group-title">Sesión</span>
                <div class="settings-group-card">
                    <button class="btn-logout-pro" id="btn-logout-pro" type="button">
                        <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
                    </button>
                </div>
            </div>
        `;

        const logoutBtn = document.getElementById('btn-logout-pro');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    closeSettings();
                    await AuthService.logout();
                    Toast.success('Sesión cerrada.');
                } catch (e) {
                    Toast.error('No pudimos cerrar la sesión.');
                }
            });
        }

        settingsModal.classList.remove('hidden');
    }

    function closeSettings() {
        settingsModal.classList.add('hidden');
    }

    function isSettingsModalOpen() {
        return settingsModal && !settingsModal.classList.contains('hidden');
    }

    /* -----------------------------------------------------
       INIT
       ----------------------------------------------------- */
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