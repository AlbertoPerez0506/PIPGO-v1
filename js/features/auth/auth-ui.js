(function () {
    let authModal, loginForm, registerForm, authTabs, authError, authClose, btnGoAuth;
    let initialized = false;

    function openAuthModal(mode = 'login') {
        authModal.classList.remove('hidden');
        switchAuthTab(mode);
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
        setError('');
    }

    function switchAuthTab(mode) {
        authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.auth === mode));
        loginForm.classList.toggle('hidden', mode !== 'login');
        registerForm.classList.toggle('hidden', mode !== 'register');
        setError('');
    }

    function setError(message) {
        authError.textContent = message || '';
        authError.classList.toggle('hidden', !message);
    }

    async function handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        setError('');

        try {
            await AuthService.register({ username, email, password });
            closeAuthModal();
            Toast.success('Cuenta creada correctamente.');
        } catch (error) {
            setError(error.message || 'No se pudo crear la cuenta.');
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        setError('');

        try {
            await AuthService.login(email, password);
            closeAuthModal();
            Toast.success('Sesión iniciada.');
        } catch (error) {
            setError(error.message || 'No se pudo iniciar sesión.');
        }
    }

    function init() {
        if (initialized) return;
        initialized = true;

        authModal = document.getElementById('auth-modal');
        loginForm = document.getElementById('login-form');
        registerForm = document.getElementById('register-form');
        authTabs = document.querySelectorAll('.auth-tab');
        authError = document.getElementById('auth-error');
        authClose = document.getElementById('auth-close');
        btnGoAuth = document.getElementById('btn-go-auth');

        authTabs.forEach(tab => tab.addEventListener('click', () => switchAuthTab(tab.dataset.auth)));
        authClose.addEventListener('click', closeAuthModal);
        if (btnGoAuth) btnGoAuth.addEventListener('click', () => openAuthModal('login'));
        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);
    }

    window.AuthUI = {
        init,
        openAuthModal,
        closeAuthModal,
        setError,
        isAuthModalOpen: () => !authModal.classList.contains('hidden')
    };
})();