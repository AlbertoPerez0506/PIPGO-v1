/* =====================================================
   PIPGO · SELLER PROFILE UI
   Bottom sheet con el perfil público del vendedor.
   Reutilizado desde Product Sheet y Chat Header.

   FIX:
   - suppressPopstate: al cerrar con history.back(), el
     handler global de popstate no cierra también el chat
     que esté debajo.
   ===================================================== */

(function () {
    'use strict';

    let backdrop, sheet, contentEl;
    let initialized = false;
    let historyPushed = false;
    let currentUid = null;
    let openingLock = false;   // evita doble apertura por doble tap
    let suppressPopstate = false;

    function open(uid, { preload = null } = {}) {
        if (!uid) { Toast.warning('Vendedor no disponible.'); return; }
        if (openingLock) return;
        if (isOpen()) return; // ya está abierto
        openingLock = true;
        setTimeout(() => { openingLock = false; }, 350);

        currentUid = uid;
        backdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
        render(uid, preload);
        if (!historyPushed) {
            history.pushState({ view: AppState.currentView, overlay: 'sellerProfile' }, '', '');
            historyPushed = true;
        }
    }

    function close(syncHistory = true) {
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
        currentUid = null;
        if (historyPushed) {
            historyPushed = false;
            if (syncHistory) {
                // Marca de supresión: el popstate que dispara el
                // history.back() no debe cerrar otros overlays.
                suppressPopstate = true;
                try { history.back(); } catch (e) {}
            }
        }
    }

    function isOpen() {
        return backdrop && backdrop.classList.contains('open');
    }

    function escapeHtml(v) {
        return Formatters.escapeHtml(v);
    }

    function renderSkeleton() {
        contentEl.innerHTML = `
            <div class="seller-profile-body">
                <div class="sp-skel-avatar"></div>
                <div class="sp-skel-line w-40"></div>
                <div class="sp-skel-line w-60"></div>
                <div class="sp-skel-line w-80"></div>
            </div>`;
    }

    async function render(uid, preload) {
        renderSkeleton();

        let profile = preload;
        if (!profile) {
            try { profile = await SellerProfileService.getPublicProfile(uid); }
            catch (e) { profile = null; }
        }

        // Si mientras cargaba el usuario cerró el sheet, no pintar
        if (!isOpen() || currentUid !== uid) return;

        if (!profile || !profile.username) {
            contentEl.innerHTML = `
                <div class="seller-profile-body">
                    <div class="seller-profile-empty">
                        <i class="fa-solid fa-store-slash"></i>
                        <h4>Información no disponible</h4>
                        <p>Este vendedor aún no ha completado su perfil público.</p>
                    </div>
                </div>`;
            return;
        }

        const username = escapeHtml(profile.username);
        const displayName = profile.displayName ? escapeHtml(profile.displayName) : '';
        const description = profile.description ? escapeHtml(profile.description) : '';
        const avatarHtml = profile.avatarUrl
            ? `<img src="${Formatters.safeUrl(profile.avatarUrl)}" alt="">`
            : `<i class="fa-solid fa-user"></i>`;

        const contacts = [];
        if (profile.phone) {
            contacts.push(`
                <a class="sp-contact-btn" href="tel:${escapeHtml(String(profile.phone).replace(/\s+/g,''))}">
                    <i class="fa-solid fa-phone"></i> Llamar
                </a>`);
        }
        if (profile.phone && profile.contactMethod === 'whatsapp') {
            const phone = String(profile.phone).replace(/\D/g, '');
            const norm = phone.length === 10 ? '52' + phone : phone;
            contacts.push(`
                <a class="sp-contact-btn sp-wa" target="_blank" rel="noopener"
                   href="https://wa.me/${norm}">
                    <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </a>`);
        }
        if (profile.socialUrl) {
            const host = (() => {
                try { return new URL(profile.socialUrl).hostname.replace('www.',''); }
                catch (e) { return 'Enlace'; }
            })();
            contacts.push(`
                <a class="sp-contact-btn" target="_blank" rel="noopener"
                   href="${Formatters.safeUrl(profile.socialUrl)}">
                    <i class="fa-solid fa-link"></i> ${escapeHtml(host)}
                </a>`);
        }

        const locationHtml = [profile.city, profile.state].filter(Boolean).join(', ');

        contentEl.innerHTML = `
            <div class="seller-profile-body">
                <div class="sp-avatar">${avatarHtml}</div>
                <div class="sp-identity">
                    <span class="sp-username">@${username}</span>
                    <span class="sp-role"><i class="fa-solid fa-store"></i> Vendedor</span>
                </div>
                ${displayName ? `<h3 class="sp-display-name">${displayName}</h3>` : ''}
                ${profile.category ? `<span class="sp-category">${escapeHtml(profile.category)}</span>` : ''}
                ${description ? `<p class="sp-description">${description}</p>` : ''}
                ${locationHtml ? `<p class="sp-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(locationHtml)}</p>` : ''}

                <button class="sp-follow-btn" id="sp-follow" type="button">
                    <i class="fa-solid fa-user-plus"></i> Seguir
                </button>

                ${contacts.length ? `<div class="sp-contacts">${contacts.join('')}</div>` : ''}

                <button class="sp-message-btn" id="sp-message" type="button">
                    <i class="fa-solid fa-comment-dots"></i> Enviar mensaje
                </button>
            </div>`;

        const followBtn = contentEl.querySelector('#sp-follow');
        if (followBtn) followBtn.addEventListener('click', () => {
            Toast.info('Próximamente podrás seguir vendedores.');
        });

        const msgBtn = contentEl.querySelector('#sp-message');
        if (msgBtn) msgBtn.addEventListener('click', () => {
            // Cerramos el sheet primero (con syncHistory para que
            // el popstate interno no cierre el chat que está debajo).
            close();
            setTimeout(() => {
                if (window.MessagingUI && MessagingUI.openChatWith) {
                    MessagingUI.openChatWith(uid, { fromPublication: false });
                }
            }, 180);
        });
    }

    function init() {
        if (initialized) return;
        initialized = true;

        backdrop = document.getElementById('seller-profile-backdrop');
        sheet = document.getElementById('seller-profile-sheet');
        contentEl = document.getElementById('seller-profile-content');
        if (!backdrop || !contentEl) {
            Logger.error('SellerProfileUI: contenedores no encontrados.');
            return;
        }

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) close();
        });

        // Drag para cerrar
        const dragZone = sheet.querySelector('.sheet-drag-zone');
        let startY = 0, curY = 0, dragging = false;
        dragZone.addEventListener('pointerdown', (e) => {
            dragging = true;
            startY = e.clientY; curY = e.clientY;
            sheet.style.transition = 'none';
            dragZone.setPointerCapture && dragZone.setPointerCapture(e.pointerId);
        });
        dragZone.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            curY = e.clientY;
            const dy = Math.max(0, curY - startY);
            sheet.style.transform = `translateY(${dy}px)`;
        });
        const endDrag = () => {
            if (!dragging) return;
            dragging = false;
            const dy = curY - startY;
            sheet.style.transition = '';
            if (dy > 100) { close(); sheet.style.transform = ''; }
            else sheet.style.transform = '';
        };
        dragZone.addEventListener('pointerup', endDrag);
        dragZone.addEventListener('pointercancel', endDrag);
    }

    window.SellerProfileUI = {
        init,
        open,
        close,
        isOpen,
        consumeSuppressPopstate: () => {
            if (suppressPopstate) { suppressPopstate = false; return true; }
            return false;
        }
    };
})();