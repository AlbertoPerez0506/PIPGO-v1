/* =====================================================
   PIPGO · AUTH UI
   Login + Registro + Recuperar contraseña.
   ===================================================== */

(function () {
    let authModal, loginForm, registerForm, recoverView;
    let authTabsWrap, authTabs, authError, authSuccess, authClose;
    let heroIcon, heroTitle, heroSubtitle;
    let btnForgotPassword, btnBackToLogin, btnSubmitRecover;
    let loginEmailInput, loginPasswordInput;
    let registerUsernameInput, registerEmailInput, registerPasswordInput;
    let recoverEmailInput;
    let initialized = false;

    /* ---------- UI helpers ---------- */
    function setHeroVariant(variant) {
        heroIcon.classList.remove('variant-register', 'variant-recover');
        if (variant === 'register') heroIcon.classList.add('variant-register');
        else if (variant === 'recover') heroIcon.classList.add('variant-recover');

        if (variant === 'login') {
            heroIcon.innerHTML = '<i class="fa-solid fa-store"></i>';
            heroTitle.textContent = 'Bienvenido a PipGo';
            heroSubtitle.textContent = 'Compra y vende cerca de ti';
        } else if (variant === 'register') {
            heroIcon.innerHTML = '<i class="fa-solid fa-user-plus"></i>';
            heroTitle.textContent = 'Crea tu cuenta';
            heroSubtitle.textContent = 'Encuentra productos cerca de ti';
        } else if (variant === 'recover') {
            heroIcon.innerHTML = '<i class="fa-solid fa-key"></i>';
            heroTitle.textContent = 'Recuperar contraseña';
            heroSubtitle.textContent = 'Un administrador revisará tu solicitud';
        }
    }

    function showError(message) {
        authSuccess.classList.add('hidden');
        authSuccess.textContent = '';
        authError.innerHTML = message
            ? `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(message)}`
            : '';
        authError.classList.toggle('hidden', !message);
    }

    function showSuccess(message) {
        authError.classList.add('hidden');
        authError.textContent = '';
        authSuccess.innerHTML = message
            ? `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`
            : '';
        authSuccess.classList.toggle('hidden', !message);
    }

    function clearMessages() {
        authError.classList.add('hidden');
        authError.textContent = '';
        authSuccess.classList.add('hidden');
        authSuccess.textContent = '';
    }

    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    /* ---------- Vistas ---------- */
    function showLoginView() {
        authTabsWrap.classList.remove('hidden');
        authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.auth === 'login'));
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        recoverView.classList.add('hidden');
        setHeroVariant('login');
        clearMessages();
    }

    function showRegisterView() {
        authTabsWrap.classList.remove('hidden');
        authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.auth === 'register'));
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        recoverView.classList.add('hidden');
        setHeroVariant('register');
        clearMessages();
    }

    function showRecoverView() {
        authTabsWrap.classList.add('hidden');
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        recoverView.classList.remove('hidden');
        setHeroVariant('recover');
        clearMessages();
        setTimeout(() => recoverEmailInput && recoverEmailInput.focus(), 60);
    }

    function switchAuthTab(mode) {
        if (mode === 'register') showRegisterView();
        else showLoginView();
    }

    /* ---------- Modal ---------- */
    function openAuthModal(mode = 'login') {
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (mode === 'register') showRegisterView();
        else if (mode === 'recover') showRecoverView();
        else showLoginView();
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
        document.body.style.overflow = '';
        clearMessages();
        // Limpiar campos sensibles
        if (loginPasswordInput) loginPasswordInput.value = '';
        if (registerPasswordInput) registerPasswordInput.value = '';
    }

    /* ---------- Handlers ---------- */
    async function handleRegister(e) {
        e.preventDefault();
        const username = registerUsernameInput.value;
        const email = registerEmailInput.value;
        const password = registerPasswordInput.value;
        clearMessages();

        try {
            await AuthService.register({ username, email, password });
            closeAuthModal();
            Toast.success('Cuenta creada correctamente.');
        } catch (error) {
            showError(error.message || 'No se pudo crear la cuenta.');
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        clearMessages();

        try {
            await AuthService.login(email, password);
            closeAuthModal();
            Toast.success('Sesión iniciada.');
        } catch (error) {
            showError(error.message || 'No se pudo iniciar sesión.');
        }
    }

    async function handleSubmitRecover() {
        const email = recoverEmailInput.value.trim();
        clearMessages();

        if (!email) {
            showError('Escribe tu correo electrónico.');
            return;
        }

        btnSubmitRecover.disabled = true;
        const originalHTML = btnSubmitRecover.innerHTML;
        btnSubmitRecover.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando…';

        try {
            await AuthService.requestPasswordReset(email);
            showSuccess(
                `Tu solicitud fue enviada. Cuando un administrador la apruebe, recibirás un correo en <strong>${escapeHtml(email)}</strong> con un enlace para definir tu nueva contraseña.`
            );
            recoverEmailInput.value = '';
        } catch (error) {
            showError(error.message || 'No pudimos enviar la solicitud.');
        } finally {
            btnSubmitRecover.disabled = false;
            btnSubmitRecover.innerHTML = originalHTML;
        }
    }

    function handleTogglePassword(btn) {
        const targetId = btn.dataset.toggle;
        const input = document.getElementById(targetId);
        if (!input) return;
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) icon.className = 'fa-solid fa-eye-slash';
        } else {
            input.type = 'password';
            if (icon) icon.className = 'fa-solid fa-eye';
        }
    }

    /* ---------- Init ---------- */
    function init() {
        if (initialized) return;
        initialized = true;

        authModal         = document.getElementById('auth-modal');
        loginForm         = document.getElementById('login-form');
        registerForm      = document.getElementById('register-form');
        recoverView       = document.getElementById('recover-view');
        authTabsWrap      = document.getElementById('auth-tabs-pro');
        authTabs          = document.querySelectorAll('.auth-tab-pro');
        authError         = document.getElementById('auth-error');
        authSuccess       = document.getElementById('auth-success');
        authClose         = document.getElementById('auth-close');
        heroIcon          = document.getElementById('auth-hero-icon');
        heroTitle         = document.getElementById('auth-hero-title');
        heroSubtitle      = document.getElementById('auth-hero-subtitle');

        loginEmailInput     = document.getElementById('login-email');
        loginPasswordInput  = document.getElementById('login-password');
        registerUsernameInput = document.getElementById('register-username');
        registerEmailInput    = document.getElementById('register-email');
        registerPasswordInput = document.getElementById('register-password');
        recoverEmailInput     = document.getElementById('recover-email');

        btnForgotPassword = document.getElementById('btn-forgot-password');
        btnBackToLogin    = document.getElementById('btn-back-to-login');
        btnSubmitRecover  = document.getElementById('btn-submit-recover');

        authTabs.forEach(tab => {
            tab.addEventListener('click', () => switchAuthTab(tab.dataset.auth));
        });

        authClose.addEventListener('click', closeAuthModal);
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeAuthModal();
        });

        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);

        if (btnForgotPassword) btnForgotPassword.addEventListener('click', showRecoverView);
        if (btnBackToLogin)    btnBackToLogin.addEventListener('click', showLoginView);
        if (btnSubmitRecover)  btnSubmitRecover.addEventListener('click', handleSubmitRecover);

        // Toggle password visibility
        document.querySelectorAll('.auth-input-toggle').forEach(btn => {
            btn.addEventListener('click', () => handleTogglePassword(btn));
        });
    }

    window.AuthUI = {
        init,
        openAuthModal,
        closeAuthModal,
        setError: showError,
        setSuccess: showSuccess,
        isAuthModalOpen: () => authModal && !authModal.classList.contains('hidden')
    };
})();