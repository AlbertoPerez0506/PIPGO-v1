/* =====================================================
   PIPGO · MESSAGING UI
   Inbox + chat overlay en tiempo real.
   - Abrir desde publicación: crea o reutiliza conversación
     y solo la primera vez inserta "Vi tu publicación de X."
   - Abrir desde Mensajes (vendedor seguido): abre chat
     SIN mensaje automático.
   ===================================================== */

(function () {
    'use strict';

    /* ---------- Estado ---------- */
    let initialized = false;

    // Inbox
    let searchInput, clearSearchBtn, contentEl;

    // Chat overlay
    let overlay, headerEl, backBtn, sellerInfoBtn,
        chatAvatar, chatUsername, chatRole,
        contextBanner, contextName, contextOpenBtn,
        messagesEl, newMessagesEl, newMessagesText,
        inputEl, sendBtn,
        messageMenuEl;

    let conversations = [];
    let currentChat = {
        conversationId: null,
        otherUid: null,
        otherProfile: null,
        publicationContext: null,
        unsubscribe: null,
        messages: [],
        oldestCreatedAt: null,
        hasMore: true,
        loadedOnce: false,
        menuMessage: null
    };

    let suppressPopstate = false;
    let chatHistoryPushed = false;
    let bodyLockPrev = '';

    /* ---------- Utils ---------- */
    function isNearBottom(el, threshold = 80) {
        if (!el) return true;
        return (el.scrollHeight - el.scrollTop - el.clientHeight) < threshold;
    }

    function scrollToBottom(behavior = 'auto') {
        if (!messagesEl) return;
        messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior });
    }

    function two(n) { return n < 10 ? '0' + n : '' + n; }

    function formatDayHeader(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        if (sameDay) return 'Hoy';
        const yest = new Date(now); yest.setDate(now.getDate() - 1);
        if (d.toDateString() === yest.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function formatHour(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return `${two(d.getHours())}:${two(d.getMinutes())}`;
    }

    function timeAgoShort(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const diff = Date.now() - d.getTime();
        if (diff < 60_000) return 'ahora';
        if (diff < 3600_000) return `${Math.floor(diff/60_000)} min`;
        if (diff < 86_400_000) return `${Math.floor(diff/3600_000)} h`;
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    }

    function avatarHtml(url, fallbackIcon = 'fa-user') {
        if (url) {
            return `<img src="${Formatters.safeUrl(url)}" alt="">`;
        }
        return `<i class="fa-solid ${fallbackIcon}"></i>`;
    }

    /* =====================================================
       ENTRAR A LA VISTA MENSAJES
       ===================================================== */
    async function onEnterMessaging() {
        renderSkeleton();
        if (!AppState.currentUser) {
            renderVisitorState();
            return;
        }
        try {
            conversations = await ConversationService.listConversationsForUser(AppState.currentUser.uid, 30);
            renderInbox();
        } catch (e) {
            Logger.error('MessagingUI.onEnterMessaging', e);
            renderInboxError();
        }
    }

    function renderSkeleton() {
        contentEl.innerHTML = `
            <div class="msg-skel-list">
                ${Array.from({ length: 4 }).map(() => `
                    <div class="msg-skel-row">
                        <div class="msg-skel-avatar"></div>
                        <div class="msg-skel-body">
                            <div class="msg-skel-line w-40"></div>
                            <div class="msg-skel-line w-80"></div>
                        </div>
                    </div>`).join('')}
            </div>`;
    }

    function renderInboxError() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-cloud-exclamation"></i></div>
                <h4>No pudimos cargar tus mensajes</h4>
                <p>Revisa tu conexión e inténtalo de nuevo.</p>
            </div>`;
    }

    function renderVisitorState() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-comments"></i></div>
                <h4>Inicia sesión para ver tus mensajes</h4>
                <p>Cuando contactes a un vendedor, tus conversaciones aparecerán aquí.</p>
                <button class="btn-primary" id="msg-go-auth" type="button">
                    <i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión
                </button>
            </div>`;
        const b = document.getElementById('msg-go-auth');
        if (b) b.addEventListener('click', () => AuthUI.openAuthModal('login'));
    }

    function renderInboxEmpty() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-comment-dots"></i></div>
                <h4>Aún no tienes conversaciones</h4>
                <p>Cuando contactes a un vendedor, aparecerá aquí.</p>
            </div>`;
    }

    function renderNoFollowedSellers() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-user-plus"></i></div>
                <h4>Aún no sigues vendedores</h4>
                <p>Cuando sigas a un vendedor, podrás iniciar una conversación directamente desde Mensajes.</p>
            </div>`;
    }

    function renderInbox() {
        if (!conversations.length) { renderInboxEmpty(); return; }

        const list = document.createElement('div');
        list.className = 'msg-inbox';

        conversations.forEach(conv => {
            list.appendChild(buildConversationRow(conv));
        });

        contentEl.innerHTML = '';
        contentEl.appendChild(list);
    }

    function buildConversationRow(conv) {
        const otherUid = ConversationService.otherParticipantId(conv, AppState.currentUser.uid);
        const expired = ConversationService.isLastMessageExpired(conv);
        const unread = ConversationService.hasUnread(conv, AppState.currentUser.uid);

        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'msg-row' + (unread ? ' unread' : '');
        row.dataset.convId = conv.id;
        row.dataset.otherUid = otherUid || '';

        row.innerHTML = `
            <div class="msg-avatar">
                <i class="fa-solid fa-user"></i>
            </div>
            <div class="msg-body">
                <div class="msg-body-top">
                    <span class="msg-username" data-uid="${otherUid}">@—</span>
                    <span class="msg-time">${timeAgoShort(conv.lastMessageAt)}</span>
                </div>
                <div class="msg-preview">${expired ? 'Sin mensajes recientes' : (Formatters.escapeHtml(conv.lastMessage || '…'))}</div>
            </div>
            ${unread ? '<span class="msg-unread-dot"></span>' : ''}
        `;

        row.addEventListener('click', () => {
            openChat({ conversationId: conv.id, otherUid });
        });

        // Hidratar identidad pública (cache)
        if (otherUid) {
            SellerProfileService.getPublicProfile(otherUid).then(profile => {
                if (!profile) return;
                const avatarEl = row.querySelector('.msg-avatar');
                const userEl = row.querySelector('.msg-username');
                if (profile.avatarUrl) avatarEl.innerHTML = avatarHtml(profile.avatarUrl);
                if (profile.username) {
                    userEl.textContent = '@' + profile.username;
                }
            });
        }

        return row;
    }

    /* =====================================================
       BÚSQUEDA — SOLO VENDEDORES SEGUIDOS
       Follow aún NO funcional: no existen datos. Se muestra
       el estado vacío correspondiente.
       ===================================================== */
    function onSearchInput() {
        const q = (searchInput.value || '').trim();
        clearSearchBtn.classList.toggle('visible', !!q);

        if (!q) { renderInbox(); return; }

        // Aún sin seguidos: siempre vacío hasta que Follow exista.
        renderNoFollowedSellers();
    }

    /* =====================================================
       ABRIR CHAT
       ===================================================== */

    /**
     * Abre un chat concreto.
     * @param {Object} opts
     * @param {string} [opts.conversationId]
     * @param {string} [opts.otherUid]
     * @param {Object} [opts.publicationContext]  { id, name, mainImage }
     * @param {boolean} [opts.fromPublication]    si viene desde Product Sheet
     */
    async function openChat({ conversationId, otherUid, publicationContext = null, fromPublication = false } = {}) {
        if (!AppState.currentUser) {
            AuthUI.openAuthModal('login');
            return;
        }

        // Resolver otherUid si solo tenemos conversationId
        let conv = null;
        if (conversationId) {
            conv = conversations.find(c => c.id === conversationId) || null;
            if (!conv) conv = await ConversationService.getConversation(conversationId);
            if (conv) otherUid = otherUid || ConversationService.otherParticipantId(conv, AppState.currentUser.uid);
        }

        if (!otherUid) { Toast.error('No pudimos abrir la conversación.'); return; }

        currentChat.otherUid = otherUid;
        currentChat.publicationContext = publicationContext;
        currentChat.messages = [];
        currentChat.oldestCreatedAt = null;
        currentChat.hasMore = true;
        currentChat.loadedOnce = false;

        // Reset UI
        messagesEl.innerHTML = `<div class="chat-loading"><i class="fa-solid fa-spinner fa-spin"></i> Abriendo conversación…</div>`;
        inputEl.value = '';
        autoResizeInput();
        renderContextBanner();
        newMessagesEl.classList.add('hidden');

        // Perfil del vendedor
        try {
            currentChat.otherProfile = await SellerProfileService.getPublicProfile(otherUid);
        } catch (e) { currentChat.otherProfile = null; }
        renderChatHeader();

        // Mostrar overlay
        openOverlay();

        // Crear conversación si no existe
        if (!conversationId) {
            try {
                const { conversation, created } = await ConversationService.getOrCreateConversation(
                    AppState.currentUser.uid, otherUid
                );
                currentChat.conversationId = conversation.id;

                // Si venimos desde una publicación y es la primera vez,
                // insertar mensaje contextual.
                if (fromPublication && created && publicationContext && publicationContext.id && publicationContext.name) {
                    try {
                        await MessageService.sendMessage(conversation.id, {
                            senderId: AppState.currentUser.uid,
                            text: `Vi tu publicación de ${publicationContext.name}.`,
                            type: 'publication_context',
                            publicationId: publicationContext.id,
                            publicationName: publicationContext.name
                        });
                    } catch (e) {
                        Logger.error('Mensaje contextual falló', e);
                    }
                }
            } catch (e) {
                Logger.error('openChat getOrCreate', e);
                Toast.error('No pudimos abrir la conversación.');
                closeOverlay();
                return;
            }
        } else {
            currentChat.conversationId = conversationId;
        }

        // Limpieza oportunista de expirados (no bloquea el render)
        MessageService.cleanupExpiredMessages(currentChat.conversationId).catch(() => {});

        // Suscribirse a mensajes
        subscribeCurrentChat();

        // Marcar como leído
        ConversationService.markAsRead(currentChat.conversationId, AppState.currentUser.uid).catch(() => {});
    }

    /**
     * Punto de entrada usado por Product Sheet y Seller Profile.
     */
    async function openChatWith(sellerUid, { fromPublication = false, publicationContext = null } = {}) {
        if (!sellerUid) { Toast.warning('Vendedor no disponible.'); return; }
        if (!AppState.currentUser) {
            AppState.pendingAction = {
                type: 'openChatWith',
                sellerUid,
                fromPublication,
                publicationContext
            };
            AuthUI.openAuthModal('login');
            Toast.info('Inicia sesión para contactar al vendedor.');
            return;
        }
        return openChat({ otherUid: sellerUid, publicationContext, fromPublication });
    }

    function renderChatHeader() {
        const profile = currentChat.otherProfile || {};
        const username = profile.username ? '@' + profile.username : '@usuario';
        chatUsername.textContent = username;
        chatRole.textContent = 'Vendedor';
        chatAvatar.innerHTML = avatarHtml(profile.avatarUrl, 'fa-user');
    }

    function renderContextBanner() {
        const ctx = currentChat.publicationContext;
        if (ctx && ctx.id && ctx.name) {
            contextBanner.classList.remove('hidden');
            contextName.textContent = ctx.name;
        } else {
            contextBanner.classList.add('hidden');
        }
    }

    function subscribeCurrentChat() {
        if (currentChat.unsubscribe) {
            try { currentChat.unsubscribe(); } catch (e) {}
            currentChat.unsubscribe = null;
        }
        currentChat.unsubscribe = MessageService.subscribeMessages(
            currentChat.conversationId,
            {
                onChange: (list) => handleMessagesChange(list),
                onError: () => Toast.error('No pudimos actualizar el chat.')
            }
        );
    }

    function handleMessagesChange(rawList) {
        const uid = AppState.currentUser.uid;

        // Filtrado: expirados y ocultos para mí
        const visible = rawList.filter(m =>
            !MessageService.isExpired(m) &&
            !(Array.isArray(m.hiddenFor) && m.hiddenFor.includes(uid))
        );

        const wasAtBottom = isNearBottom(messagesEl, 120);
        const hadMessages = currentChat.messages.length > 0;
        const prevLastId = hadMessages ? currentChat.messages[currentChat.messages.length - 1].id : null;

        currentChat.messages = visible;
        if (visible.length) {
            currentChat.oldestCreatedAt = visible[0].createdAt;
        }

        renderMessages({ preserveScroll: hadMessages && !wasAtBottom });

        const newLastId = visible.length ? visible[visible.length - 1].id : null;
        const incoming = newLastId && newLastId !== prevLastId;

        if (incoming) {
            if (wasAtBottom) scrollToBottom('smooth');
            else showNewMessagePill();
        }

        // Marcar leído al llegar mensajes nuevos y estoy al fondo
        if (incoming && wasAtBottom) {
            ConversationService.markAsRead(currentChat.conversationId, uid).catch(() => {});
        }
    }

    function showNewMessagePill() {
        newMessagesText.textContent = '1 mensaje nuevo';
        newMessagesEl.classList.remove('hidden');
    }

    function hideNewMessagePill() {
        newMessagesEl.classList.add('hidden');
    }

    /* =====================================================
       RENDER DE MENSAJES
       ===================================================== */
    function renderMessages({ preserveScroll = false } = {}) {
        const prevScrollHeight = preserveScroll ? messagesEl.scrollHeight : 0;
        const prevScrollTop = preserveScroll ? messagesEl.scrollTop : 0;

        messagesEl.innerHTML = '';

        if (!currentChat.messages.length) {
            const empty = document.createElement('div');
            empty.className = 'chat-empty';
            empty.innerHTML = `
                <p>Inicia la conversación.</p>`;
            messagesEl.appendChild(empty);
            return;
        }

        let lastDay = '';
        currentChat.messages.forEach(msg => {
            const day = formatDayHeader(msg.createdAt);
            if (day !== lastDay) {
                const sep = document.createElement('div');
                sep.className = 'chat-day-sep';
                sep.textContent = day;
                messagesEl.appendChild(sep);
                lastDay = day;
            }
            messagesEl.appendChild(buildMessageBubble(msg));
        });

        if (preserveScroll) {
            const newScrollHeight = messagesEl.scrollHeight;
            messagesEl.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
        } else {
            scrollToBottom('auto');
        }
    }

    function buildMessageBubble(msg) {
        const uid = AppState.currentUser.uid;
        const isOwn = msg.senderId === uid;
        const wrap = document.createElement('div');
        wrap.className = 'chat-msg ' + (isOwn ? 'own' : 'other');
        wrap.dataset.msgId = msg.id;

        if (msg.deletedForEveryone) {
            wrap.classList.add('deleted');
            wrap.innerHTML = `
                <div class="chat-bubble">
                    <em>Este mensaje fue eliminado</em>
                    <span class="chat-time">${formatHour(msg.createdAt)}</span>
                </div>`;
            return wrap;
        }

        const text = Formatters.escapeHtml(msg.text || '');
        const editedTag = msg.edited ? ' <span class="chat-edited">Editado</span>' : '';
        wrap.innerHTML = `
            <div class="chat-bubble">
                <span class="chat-text">${text}</span>
                <span class="chat-time">${formatHour(msg.createdAt)}${editedTag}</span>
            </div>`;

        // Contexto de publicación (mensaje automático)
        if (msg.type === 'publication_context' && msg.publicationName) {
            const ref = document.createElement('div');
            ref.className = 'chat-context-mini';
            ref.innerHTML = `<i class="fa-solid fa-tag"></i> ${Formatters.escapeHtml(msg.publicationName)}`;
            wrap.querySelector('.chat-bubble').appendChild(ref);
        }

        // Menú contextual (long-press / click derecho)
        wrap.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openMessageMenu(msg, e.clientX, e.clientY);
        });
        // Long-press táctil
        let pressTimer = null;
        wrap.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                const t = e.touches[0];
                openMessageMenu(msg, t.clientX, t.clientY);
            }, 450);
        }, { passive: true });
        ['touchend','touchmove','touchcancel'].forEach(ev =>
            wrap.addEventListener(ev, () => clearTimeout(pressTimer), { passive: true })
        );

        return wrap;
    }

    /* =====================================================
       MENÚ CONTEXTUAL
       ===================================================== */
    function openMessageMenu(msg, x, y) {
        currentChat.menuMessage = msg;
        const isOwn = msg.senderId === AppState.currentUser.uid;
        const canEdit = isOwn && !msg.deletedForEveryone && !MessageService.isExpired(msg);

        messageMenuEl.innerHTML = '';
        const mk = (action, icon, label, danger) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.action = action;
            b.className = danger ? 'danger' : '';
            b.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
            b.addEventListener('click', () => handleMenuAction(action));
            return b;
        };

        messageMenuEl.appendChild(mk('copy', 'fa-copy', 'Copiar'));
        if (canEdit) {
            messageMenuEl.appendChild(mk('edit', 'fa-pen', 'Editar'));
        }
        messageMenuEl.appendChild(mk('delete-me', 'fa-eye-slash', 'Eliminar para mí'));
        if (isOwn) {
            messageMenuEl.appendChild(mk('delete-all', 'fa-trash', 'Eliminar para todos', true));
        }

        messageMenuEl.classList.remove('hidden');

        const rect = messageMenuEl.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 12;
        const maxY = window.innerHeight - rect.height - 12;
        messageMenuEl.style.left = Math.min(x, maxX) + 'px';
        messageMenuEl.style.top = Math.min(y, maxY) + 'px';
    }

    function closeMessageMenu() {
        messageMenuEl.classList.add('hidden');
        currentChat.menuMessage = null;
    }

    async function handleMenuAction(action) {
        const msg = currentChat.menuMessage;
        if (!msg) return;
        const uid = AppState.currentUser.uid;

        closeMessageMenu();

        try {
            if (action === 'copy') {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(msg.text || '');
                    Toast.success('Mensaje copiado.');
                } else {
                    Toast.warning('No se pudo copiar.');
                }
            } else if (action === 'edit') {
                openEditFlow(msg);
            } else if (action === 'delete-me') {
                await MessageService.deleteForMe(currentChat.conversationId, msg.id, uid);
                Toast.success('Mensaje oculto.');
            } else if (action === 'delete-all') {
                const ok = await ConfirmDialog.open({
                    title: 'Eliminar mensaje',
                    text: '¿Eliminar este mensaje para todos?',
                    okText: 'Eliminar',
                    cancelText: 'Cancelar',
                    danger: true
                });
                if (!ok) return;
                await MessageService.deleteForEveryone(currentChat.conversationId, msg.id, uid);
                Toast.success('Mensaje eliminado.');
            }
        } catch (e) {
            Logger.error('handleMenuAction', e);
            Toast.error(ErrorHandler.toUserMessage(e, { context: 'messaging.menu' }));
        }
    }

    function openEditFlow(msg) {
        const current = msg.text || '';
        const newText = window.prompt('Editar mensaje:', current);
        if (newText == null) return;
        const check = MessageService.sanitizeText(newText);
        if (!check.valid) { Toast.error(check.error); return; }

        MessageService.editMessage(
            currentChat.conversationId, msg.id, AppState.currentUser.uid, check.value
        ).then(() => Toast.success('Mensaje actualizado.'))
         .catch((e) => Toast.error(ErrorHandler.toUserMessage(e, { context: 'messaging.edit' })));
    }

    /* =====================================================
       ENVIAR
       ===================================================== */
    function autoResizeInput() {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    }

    async function sendCurrent() {
        const raw = inputEl.value || '';
        const check = MessageService.sanitizeText(raw);
        if (!check.valid) {
            if (raw.trim() === '') return; // ignorar vacío silenciosamente
            Toast.warning(check.error);
            return;
        }
        if (!currentChat.conversationId) return;

        sendBtn.disabled = true;
        inputEl.value = '';
        autoResizeInput();

        try {
            await MessageService.sendMessage(currentChat.conversationId, {
                senderId: AppState.currentUser.uid,
                text: check.value
            });
            scrollToBottom('smooth');
            hideNewMessagePill();
        } catch (e) {
            Logger.error('sendCurrent', e);
            Toast.error(ErrorHandler.toUserMessage(e, { context: 'messaging.send' }));
            // Restaurar el texto si falla
            inputEl.value = check.value;
            autoResizeInput();
        } finally {
            sendBtn.disabled = false;
            inputEl.focus();
        }
    }

    /* =====================================================
       OVERLAY / NAV
       ===================================================== */
    function openOverlay() {
        overlay.classList.remove('hidden');
        bodyLockPrev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (!chatHistoryPushed) {
            history.pushState({ view: AppState.currentView, overlay: 'chat' }, '', '');
            chatHistoryPushed = true;
        }
        setTimeout(() => inputEl.focus(), 60);
    }

    function closeOverlay(syncHistory = true) {
        overlay.classList.add('hidden');
        document.body.style.overflow = bodyLockPrev || '';
        bodyLockPrev = '';

        if (currentChat.unsubscribe) {
            try { currentChat.unsubscribe(); } catch (e) {}
            currentChat.unsubscribe = null;
        }

        if (chatHistoryPushed) {
            chatHistoryPushed = false;
            if (syncHistory) {
                suppressPopstate = true;
                try { history.back(); } catch (e) {}
            }
        }

        // Refrescar inbox al salir
        if (AppState.currentView === 'messaging') onEnterMessaging();
    }

    /* =====================================================
       INIT
       ===================================================== */
    function init() {
        if (initialized) return;
        initialized = true;

        searchInput = document.getElementById('messaging-search-input');
        clearSearchBtn = document.getElementById('messaging-clear-search');
        contentEl = document.getElementById('messaging-content');

        overlay = document.getElementById('chat-overlay');
        headerEl = document.getElementById('chat-header');
        backBtn = document.getElementById('chat-back');
        sellerInfoBtn = document.getElementById('chat-seller-info');
        chatAvatar = document.getElementById('chat-avatar');
        chatUsername = document.getElementById('chat-seller-username');
        chatRole = document.getElementById('chat-seller-role');
        contextBanner = document.getElementById('chat-context-banner');
        contextName = document.getElementById('chat-context-name');
        contextOpenBtn = document.getElementById('chat-context-open');
        messagesEl = document.getElementById('chat-messages');
        newMessagesEl = document.getElementById('chat-new-messages');
        newMessagesText = document.getElementById('chat-new-messages-text');
        inputEl = document.getElementById('chat-input');
        sendBtn = document.getElementById('chat-send');
        messageMenuEl = document.getElementById('chat-message-menu');

        if (searchInput) {
            searchInput.addEventListener('input', onSearchInput);
        }
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            });
        }

        if (backBtn) backBtn.addEventListener('click', () => closeOverlay());

        if (sellerInfoBtn) {
            sellerInfoBtn.addEventListener('click', () => {
                if (!currentChat.otherUid) return;
                SellerProfileUI.open(currentChat.otherUid, { preload: currentChat.otherProfile });
            });
        }

        if (contextOpenBtn) {
            contextOpenBtn.addEventListener('click', () => {
                const ctx = currentChat.publicationContext;
                if (!ctx || !ctx.id) return;
                closeOverlay();
                setTimeout(async () => {
                    const pub = await PublicationService.getPublicationById(ctx.id);
                    if (pub) PublicationUI.openProductSheet(pub);
                }, 200);
            });
        }

        if (newMessagesEl) {
            newMessagesEl.addEventListener('click', () => {
                scrollToBottom('smooth');
                hideNewMessagePill();
                if (currentChat.conversationId) {
                    ConversationService.markAsRead(
                        currentChat.conversationId, AppState.currentUser.uid
                    ).catch(() => {});
                }
            });
        }

        if (inputEl) {
            inputEl.addEventListener('input', autoResizeInput);
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendCurrent();
                }
            });
        }
        if (sendBtn) sendBtn.addEventListener('click', sendCurrent);

        // Cerrar menú contextual al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!messageMenuEl || messageMenuEl.classList.contains('hidden')) return;
            if (messageMenuEl.contains(e.target)) return;
            closeMessageMenu();
        });
        document.addEventListener('scroll', () => closeMessageMenu(), true);

        // Cerrar overlay con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (messageMenuEl && !messageMenuEl.classList.contains('hidden')) {
                e.preventDefault();
                closeMessageMenu();
                return;
            }
            if (overlay && !overlay.classList.contains('hidden')) {
                e.preventDefault();
                closeOverlay();
            }
        });
    }

    window.MessagingUI = {
        init,
        onEnterMessaging,
        openChat,
        openChatWith,
        isChatOpen: () => overlay && !overlay.classList.contains('hidden'),
        closeChat: closeOverlay,
        consumeSuppressPopstate: () => {
            if (suppressPopstate) { suppressPopstate = false; return true; }
            return false;
        }
    };
})();