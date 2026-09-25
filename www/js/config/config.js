/* =====================================================
   PIPGO · APP CONFIG
   ===================================================== */

window.CONFIG = {
    appName: 'PipGo',

    // =============================================
    // CLOUDINARY (Unsigned upload)
    // =============================================
    CLOUDINARY_CLOUD_NAME: 'tugqycpq',
    CLOUDINARY_UPLOAD_PRESET: 'pipgo_images',

    // Límites de procesamiento de imágenes
    IMAGE_MAX_DIM: 1280,
    IMAGE_QUALITY: 0.75,
    IMAGE_TIMEOUT_MS: 30000,
    GEO_TIMEOUT_MS: 15000,
    REVERSE_GEO_TIMEOUT_MS: 6000,

    // Firestore collections
    COLLECTIONS: {
        USERS: 'usuarios',
        USERNAMES: 'usernames',
        PUBLICATIONS: 'publicaciones',
        FAVORITES: 'favoritos'
    }
};