/* =====================================================
   PIPGO · ERROR HANDLER
   Traduce errores técnicos a mensajes humanos.
   Clasifica por código y contexto. Registra internamente.
   ===================================================== */

(function () {

    /* Mapa de códigos → mensaje de usuario */
    const MESSAGES = {
        NETWORK_OFFLINE: 'No pudimos conectarnos a Internet. Revisa tu conexión e inténtalo nuevamente.',
        NETWORK_TIMEOUT: 'La operación tardó demasiado. Verifica tu conexión e inténtalo de nuevo.',
        REQUEST_FAILED: 'No pudimos conectar con el servidor. Inténtalo nuevamente.',
        UNAUTHORIZED: 'Debes iniciar sesión para continuar.',
        FORBIDDEN: 'No tienes permisos para realizar esta acción.',
        NOT_FOUND: 'No encontramos la información solicitada.',
        SERVER_ERROR: 'Ocurrió un problema en el servidor. Inténtalo más tarde.',
        VALIDATION_ERROR: 'Revisa los datos ingresados e inténtalo nuevamente.',
        AUTH_ERROR: 'No pudimos completar la autenticación. Inténtalo de nuevo.',
        STORAGE_ERROR: 'Hubo un problema con el almacenamiento del dispositivo.',
        UPLOAD_ERROR: 'No pudimos subir la imagen. Inténtalo de nuevo.',
        IMAGE_PROCESSING_ERROR: 'No pudimos procesar la imagen seleccionada.',
        DATABASE_ERROR: 'Hubo un problema al guardar o leer los datos.',
        PARSE_ERROR: 'Recibimos una respuesta inesperada del servidor.',
        UNKNOWN_ERROR: 'Ocurrió un error inesperado. Inténtalo nuevamente.'
    };

    /* Mapeo de códigos Firebase → nuestros códigos */
    function classifyFirebaseError(error) {
        const code = error && error.code;
        if (!code) return null;
        if (code.startsWith('auth/')) return 'AUTH_ERROR';
        if (code === 'permission-denied') return 'FORBIDDEN';
        if (code === 'unavailable' || code === 'deadline-exceeded') return 'NETWORK_TIMEOUT';
        if (code === 'not-found') return 'NOT_FOUND';
        if (code === 'resource-exhausted') return 'SERVER_ERROR';
        if (code === 'failed-precondition') return 'DATABASE_ERROR';
        return 'DATABASE_ERROR';
    }

    /* Clasificación genérica */
    function classify(error) {
        if (!error) return 'UNKNOWN_ERROR';
        if (typeof error === 'string') return 'UNKNOWN_ERROR';
        if (error.code && typeof error.code === 'string') {
            const fb = classifyFirebaseError(error);
            if (fb) return fb;
        }
        if (error.name === 'AbortError') return 'NETWORK_TIMEOUT';
        if (error.name === 'TypeError' && /fetch/i.test(error.message || '')) return 'NETWORK_OFFLINE';
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'NETWORK_OFFLINE';
        return 'UNKNOWN_ERROR';
    }

    window.ErrorHandler = {
        /**
         * Clasifica, registra y devuelve un mensaje de usuario.
         * @param {*} error  Error original.
         * @param {Object} options { context: string, fallbackMessage?: string }
         * @returns {string} Mensaje listo para mostrar.
         */
        toUserMessage(error, { context = 'app', fallbackMessage } = {}) {
            const code = classify(error);
            const userMessage = fallbackMessage || MESSAGES[code] || MESSAGES.UNKNOWN_ERROR;

            // Log interno (nunca mostrado al usuario)
            Logger.error(`[${context}] code=${code}`, {
                message: error && error.message,
                stack: error && error.stack,
                originalCode: error && error.code
            });

            return userMessage;
        },

        /**
         * Clasifica sin mostrar. Útil para lógica condicional.
         */
        classify,

        /**
         * Mensajes base accesibles si otro módulo los necesita.
         */
        MESSAGES
    };
})();