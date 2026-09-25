/* =====================================================
   PIPGO · PUBLICATION UI
   ===================================================== */

(function () {

    /* ---------- Referencias DOM ---------- */
    let publicationForm, stepType, typeCalle, typeEstablecimiento, btnBackType;
    let btnGetLocation, productRefInput, btnSubmit, btnSubmitText, formError;
    let loginRequired, formWrapper, productsGrid, searchResults, searchInput;
    let clearSearch, searchSuggestions, suggestionChips;
    let sheetBackdrop, productSheet;
    let sheetDragZone, galleryTrack, galleryDots, galleryClose, galleryPrev, galleryNext;
    let sheetCategory, sheetName, sheetStore, sheetPrice, sheetTime, sheetDesc;
    let sheetRefsBlock, sheetRefs, sheetRef;
    let sheetContactRow, sheetPhone, sheetCall;
    let btnDirections, sheetMapLink, btnChatV2;

    let lightbox, lightboxTrack, lightboxClose, lightboxCounter, lightboxDots;

    let photoSlots = [];

    let currentGalleryIndex = 0;
    let isSheetOpen = false;
    let isDraggingSheet = false;
    let sheetStartY = 0, sheetCurrentY = 0;
    let productSheetHistoryPushed = false;

    let filterModal, filterClose, filterApply, filterCategory, filterSeller;
    let activeFilterCategory = '';
    let activeFilterSeller = '';

    /* Lightbox state */
    let lightboxImages = [];
    let lightboxIndex = 0;
    let lbDragging = false, lbStartX = 0, lbCurX = 0;
    let lbPointers = new Map();
    let lbPinchStart = 0, lbPinchScale = 1, lbCurrentScale = 1, lbActiveImg = null;

    let initialized = false;

    /* =====================================================
       HELPERS
       ===================================================== */
    function showFormError(message) {
        formError.textContent = message;
        formError.classList.remove('hidden');
    }
    function hideFormError() { formError.classList.add('hidden'); }

    /* =====================================================
       AUTH
       ===================================================== */
    function updateAuthUI() {
        if (AppState.currentUser) {
            loginRequired.classList.add('hidden');
            formWrapper.classList.remove('hidden');
        } else {
            loginRequired.classList.remove('hidden');
            formWrapper.classList.add('hidden');
        }
    }

    /* =====================================================
       CARGA
       ===================================================== */
    async function loadPublications() {
        productsGrid.innerHTML = '<p style="text-align:center;padding:30px;color:var(--text-tertiary);">Cargando…</p>';
        try {
            AppState.currentPublications = await PublicationService.getActivePublications();
            renderProducts(productsGrid, AppState.currentPublications);
            renderHomeCategories(AppState.currentPublications);
            renderSearchSuggestions(AppState.currentPublications);
            if (AppState.currentView === 'search') {
                renderSearchResults(getFilteredList());
            }
        } catch (error) {
            Logger.error('Error cargando publicaciones', error);
            productsGrid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text-tertiary);">
                    <i class="fa-solid fa-cloud-exclamation" style="font-size:32px;display:block;margin-bottom:12px;"></i>
                    <p style="font-size:14px;">No pudimos cargar las publicaciones.</p>
                </div>`;
        }
    }

    function createProductCard(pub) {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.dataset.id = pub.id;

        const safeImg = Formatters.safeUrl(pub.mainImage) || 'https://via.placeholder.com/300';
        const categoryChip = pub.category
            ? `<span class="product-category-chip">${Formatters.escapeHtml(pub.category)}</span>`
            : '';
        const storeLine = pub.storeName
            ? `<span class="product-store"><i class="fa-solid fa-store"></i> ${Formatters.escapeHtml(pub.storeName)}</span>`
            : '';

        card.innerHTML = `
            <div class="product-img">
                <img src="${safeImg}" alt="${Formatters.escapeHtml(pub.name || '')}" loading="lazy">
                ${categoryChip}
                <button class="product-favorite" data-fav-id="${pub.id}" aria-label="Guardar"><i class="fa-regular fa-bookmark"></i></button>
            </div>
            <div class="product-info">
                ${storeLine}
                <h4>${Formatters.escapeHtml(pub.name || '')}</h4>
                <span class="product-price">${Formatters.formatPrice(pub.price)}</span>
                <div class="product-meta">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${Formatters.escapeHtml(pub.reference || 'Sin ubicación')}</span>
                    <span class="dot">·</span>
                    <span>${Formatters.formatRelativeTime(pub.createdAt)}</span>
                </div>
            </div>`;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.product-favorite')) return;
            openProductSheet(pub);
        });

        return card;
    }

    function renderProducts(container, list) {
        if (!container) return;
        container.innerHTML = '';
        if (!list.length) {
            container.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text-tertiary);">
                    <i class="fa-solid fa-magnifying-glass" style="font-size:32px;display:block;margin-bottom:12px;"></i>
                    <p style="font-size:14px;">No se encontraron publicaciones</p>
                </div>`;
            return;
        }
        list.forEach(pub => container.appendChild(createProductCard(pub)));
        FavoriteUI.updateAllButtons();
    }

    function renderSearchResults(list) { renderProducts(searchResults, list); }

    function showAllPublications() {
        searchInput.value = '';
        clearSearch.classList.remove('visible');
        searchSuggestions.style.display = 'block';
        activeFilterCategory = '';
        AppState.activeCategoryFilter = '';
        activeFilterSeller = '';
        renderFilterChips();
        renderCategoriesScroll();
        renderSearchResults(AppState.currentPublications);
    }

    function onEnterSearch() {
        renderCategoriesScroll();
        renderFilterChips();
    }

    /* =====================================================
       CATEGORÍAS DINÁMICAS
       ===================================================== */
    function getActiveCategories(publications) {
        const set = new Set();
        publications.forEach(p => { if (p.category) set.add(p.category); });
        return [...set];
    }

    function renderHomeCategories(publications) {
        const strip = document.getElementById('home-category-strip');
        if (!strip) return;
        const cats = getActiveCategories(publications).slice(0, 8);
        strip.innerHTML = '';
        if (!cats.length) { strip.style.display = 'none'; return; }
        strip.style.display = 'flex';
        cats.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-pill';
            btn.textContent = cat;
            btn.addEventListener('click', () => {
                AppState.activeCategoryFilter = cat;
                activeFilterCategory = cat;
                NavigationUI.switchView('search');
                setTimeout(() => {
                    renderCategoriesScroll();
                    renderSearchResults(getFilteredList());
                }, 120);
            });
            strip.appendChild(btn);
        });
    }

    function renderCategoriesScroll() {
        const scroll = document.getElementById('search-category-scroll');
        if (!scroll) return;
        const cats = getActiveCategories(AppState.currentPublications);
        scroll.innerHTML = '';

        const allBtn = document.createElement('button');
        allBtn.className = 'category-pill' + (!activeFilterCategory ? ' active' : '');
        allBtn.innerHTML = '<i class="fa-solid fa-border-all pill-ico"></i> Todas';
        allBtn.addEventListener('click', () => {
            activeFilterCategory = '';
            AppState.activeCategoryFilter = '';
            renderCategoriesScroll();
            renderSearchResults(getFilteredList());
            renderFilterChips();
        });
        scroll.appendChild(allBtn);

        cats.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-pill' + (activeFilterCategory === cat ? ' active' : '');
            btn.textContent = cat;
            btn.addEventListener('click', () => {
                activeFilterCategory = cat;
                AppState.activeCategoryFilter = cat;
                renderCategoriesScroll();
                renderSearchResults(getFilteredList());
                renderFilterChips();
            });
            scroll.appendChild(btn);
        });
    }

    function renderFilterChips() {
        const row = document.getElementById('filter-chip-row');
        if (!row) return;
        row.innerHTML = '';
        if (activeFilterSeller) {
            const chip = document.createElement('button');
            chip.className = 'filter-chip';
            const label = activeFilterSeller === 'calle' ? 'Puesto de calle' : 'Establecimiento';
            chip.innerHTML = `${label} <i class="fa-solid fa-xmark"></i>`;
            chip.addEventListener('click', () => {
                activeFilterSeller = '';
                renderFilterChips();
                renderSearchResults(getFilteredList());
            });
            row.appendChild(chip);
        }
    }

    /* =====================================================
       SUGERENCIAS DINÁMICAS
       ===================================================== */
    function renderSearchSuggestions(publications) {
        const suggestions = PublicationService.buildSuggestions(publications);
        suggestionChips.innerHTML = '';
        suggestions.forEach(text => {
            const chip = document.createElement('button');
            chip.className = 'suggestion-chip';
            chip.textContent = text;
            chip.addEventListener('click', () => {
                searchInput.value = text;
                handleSearchInput();
            });
            suggestionChips.appendChild(chip);
        });
    }

    /* =====================================================
       FILTROS
       ===================================================== */
    function openFilterModal() {
        const cats = getActiveCategories(AppState.currentPublications);
        filterCategory.innerHTML = '<option value="">Todas</option>';
        cats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat; opt.textContent = cat;
            filterCategory.appendChild(opt);
        });
        filterCategory.value = activeFilterCategory;
        filterSeller.value = activeFilterSeller;
        filterModal.classList.remove('hidden');
    }
    function closeFilterModal() { filterModal.classList.add('hidden'); }
    function isFilterModalOpen() { return !filterModal.classList.contains('hidden'); }

    function applyFilters() {
        activeFilterCategory = filterCategory.value;
        AppState.activeCategoryFilter = activeFilterCategory;
        activeFilterSeller = filterSeller.value;
        closeFilterModal();
        renderCategoriesScroll();
        renderFilterChips();
        handleSearchInput();
    }

    function getFilteredList() {
        const query = (searchInput.value || '').toLowerCase().trim();
        return AppState.currentPublications.filter(p => {
            const matchesQuery = !query ||
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.storeName && p.storeName.toLowerCase().includes(query)) ||
                (p.category && p.category.toLowerCase().includes(query)) ||
                (p.sellerType && p.sellerType.toLowerCase().includes(query)) ||
                (p.description && p.description.toLowerCase().includes(query));
            const matchesCategory = !activeFilterCategory || p.category === activeFilterCategory;
            const matchesSeller = !activeFilterSeller || p.sellerType === activeFilterSeller;
            return matchesQuery && matchesCategory && matchesSeller;
        });
    }

    function handleSearchInput() {
        const query = searchInput.value.trim();
        if (query) {
            clearSearch.classList.add('visible');
            searchSuggestions.style.display = 'none';
        } else {
            clearSearch.classList.remove('visible');
            searchSuggestions.style.display = 'block';
        }
        renderSearchResults(getFilteredList());
    }

    /* =====================================================
       FORMULARIO
       ===================================================== */
    function selectSellerType(button) {
        typeCalle.classList.remove('selected');
        typeEstablecimiento.classList.remove('selected');
        button.classList.add('selected');
        stepType.classList.add('hidden');
        publicationForm.classList.remove('hidden');
        publicationForm.dataset.editId = '';
        btnSubmitText.textContent = 'Publicar anuncio';
        publicationForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function resetFormMode() {
        publicationForm.dataset.editId = '';
        publicationForm.reset();
        photoSlots.forEach(resetSlot);
        stepType.classList.remove('hidden');
        publicationForm.classList.add('hidden');
        typeCalle.classList.remove('selected');
        typeEstablecimiento.classList.remove('selected');
        btnSubmitText.textContent = 'Publicar anuncio';
        hideFormError();
    }

    function resetSlot(slot) {
        slot.preview.classList.add('hidden');
        slot.preview.removeAttribute('src');
        if (slot.previewUrl) { URL.revokeObjectURL(slot.previewUrl); slot.previewUrl = null; }
        slot.blob = null; slot.uploadedUrl = '';
        slot.slot.querySelector('i').style.display = '';
        slot.slot.querySelector('span').style.display = '';
        slot.removeBtn.classList.add('hidden');
        slot.input.value = '';
    }

    function setSlotImageFromUrl(slot, url) {
        slot.uploadedUrl = url; slot.blob = null;
        if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
        slot.preview.src = url;
        slot.preview.classList.remove('hidden');
        slot.slot.querySelector('i').style.display = 'none';
        slot.slot.querySelector('span').style.display = 'none';
        slot.removeBtn.classList.remove('hidden');
    }

    async function processAndPreview(slot, source) {
        try {
            const compressed = await ImageService.compressImage(source);
            slot.blob = compressed; slot.uploadedUrl = '';
            if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
            slot.previewUrl = URL.createObjectURL(compressed);
            slot.preview.src = slot.previewUrl;
            slot.preview.classList.remove('hidden');
            slot.slot.querySelector('i').style.display = 'none';
            slot.slot.querySelector('span').style.display = 'none';
            slot.removeBtn.classList.remove('hidden');
            slot.input.value = '';
        } catch (error) {
            Logger.error('Error procesando imagen', error);
            Toast.error('No pudimos procesar la imagen.');
        }
    }

    /* =====================================================
       UBICACIÓN
       ===================================================== */
    async function handleGetLocation() {
        if (!AppState.currentUser) { AuthUI.openAuthModal('login'); return; }
        btnGetLocation.disabled = true;
        btnGetLocation.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Obteniendo ubicación…';
        try {
            const position = await LocationService.getCurrentPosition();
            AppState.locationPermission = 'granted';
            const geo = await LocationService.reverseGeocode(position.latitude, position.longitude);

            AppState.currentLocation = {
                latitude: position.latitude,
                longitude: position.longitude,
                accuracy: position.accuracy,
                address: geo && geo.address || '',
                shortAddress: geo && geo.shortAddress || '',
                city: geo && geo.city || '',
                state: geo && geo.state || '',
                country: geo && geo.country || ''
            };

            const displayValue = (geo && (geo.shortAddress || geo.address)) ||
                `Lat: ${position.latitude.toFixed(4)}, Lon: ${position.longitude.toFixed(4)}`;
            productRefInput.value = displayValue;
            Toast.success('Ubicación detectada. Puedes editarla si es necesario.');
        } catch (error) {
            Toast.error(error.message || 'No pudimos obtener la ubicación.');
        } finally {
            btnGetLocation.disabled = false;
            btnGetLocation.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Usar mi ubicación';
        }
    }

    /* =====================================================
       SUBMIT
       ===================================================== */
    async function handleSubmit(e) {
        e.preventDefault();
        hideFormError();

        if (AppState.isSubmitting) return;
        if (!AppState.currentUser || !auth.currentUser) {
            showFormError('Debes iniciar sesión para publicar.');
            return;
        }

        const editId = publicationForm.dataset.editId || '';
        const storeName = document.getElementById('store-name').value.trim();
        const name = document.getElementById('product-name').value.trim();
        const price = Formatters.sanitizePriceInput(document.getElementById('product-price').value);
        const category = document.getElementById('product-category').value;
        const phone = document.getElementById('product-phone').value.trim();
        const description = document.getElementById('product-desc').value.trim();
        const extraRefs = document.getElementById('product-extra-refs').value.trim();
        const reference = document.getElementById('product-ref').value.trim();
        const sellerType = typeCalle.classList.contains('selected') ? 'calle' : 'establecimiento';

        const validation = Validators.validatePublication({
            name, price, category,
            mainImage: photoSlots[0].blob || photoSlots[0].uploadedUrl
        });
        if (!validation.valid) { showFormError(validation.error); return; }

        const mainSlot = photoSlots[0];
        const secondarySlots = photoSlots.slice(1);

        AppState.isSubmitting = true;
        btnSubmit.disabled = true;
        btnSubmitText.textContent = 'Procesando…';

        try {
            let location = AppState.currentLocation;
            if (!location) {
                btnSubmitText.textContent = 'Obteniendo ubicación…';
                try {
                    const position = await LocationService.getCurrentPosition({ silent: true });
                    location = { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy };
                } catch (geoErr) {
                    location = { latitude: null, longitude: null, accuracy: null };
                }
                AppState.currentLocation = location;
            }

            let mainUrl = mainSlot.uploadedUrl;
            if (mainSlot.blob) {
                btnSubmitText.textContent = 'Subiendo imagen principal…';
                const upload = await ImageService.uploadImageToCloudinary(mainSlot.blob);
                mainUrl = upload.secure_url;
            }

            const imageUrls = [];
            for (const slot of secondarySlots) {
                if (slot.uploadedUrl) imageUrls.push(slot.uploadedUrl);
                else if (slot.blob) {
                    btnSubmitText.textContent = 'Subiendo imágenes…';
                    const upload = await ImageService.uploadImageToCloudinary(slot.blob);
                    imageUrls.push(upload.secure_url);
                }
            }

            const payload = {
                userId: AppState.currentUser.uid,
                sellerType,
                storeName: storeName || '',
                name, price, description,
                extraRefs: extraRefs || '',
                reference,
                phone: phone || '',
                category,
                mainImage: mainUrl,
                images: imageUrls,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy || null,
                address: location.address || '',
                city: location.city || '',
                state: location.state || '',
                country: location.country || ''
            };

            if (editId) {
                btnSubmitText.textContent = 'Guardando cambios…';
                await PublicationService.update(editId, payload);
                Toast.success('Publicación actualizada.');
            } else {
                btnSubmitText.textContent = 'Publicando…';
                await PublicationService.create(payload);
                Toast.success('Publicación creada.');
            }

            resetFormMode();
            AppState.currentLocation = null;
            await loadPublications();
            NavigationUI.switchView('home');
        } catch (error) {
            const msg = ErrorHandler.toUserMessage(error, { context: 'publication.submit' });
            showFormError(msg);
        } finally {
            AppState.isSubmitting = false;
            btnSubmit.disabled = false;
            btnSubmitText.textContent = publicationForm.dataset.editId ? 'Guardar cambios' : 'Publicar anuncio';
        }
    }

    /* =====================================================
       ELIMINAR / EDITAR
       ===================================================== */
    async function deletePublication(pub) {
        const confirmed = window.confirm('¿Eliminar esta publicación?\n\nEsta acción no se puede deshacer.');
        if (!confirmed) return;
        try {
            await PublicationService.softDelete(pub.id);
            Toast.success('Publicación eliminada.');
            await loadPublications();
            if (AppState.currentView === 'perfil') ProfileUI.renderProfile();
        } catch (error) {
            Logger.error('Error eliminando publicación', error);
            Toast.error('No pudimos eliminar la publicación.');
        }
    }

    function openEditForm(pub) {
        hideFormError();
        btnSubmitText.textContent = 'Guardar cambios';
        NavigationUI.switchView('anunciarme');

        publicationForm.dataset.editId = pub.id;
        stepType.classList.add('hidden');
        publicationForm.classList.remove('hidden');

        document.getElementById('store-name').value = pub.storeName || '';
        document.getElementById('product-category').value = pub.category || '';
        document.getElementById('product-name').value = pub.name || '';
        document.getElementById('product-price').value = pub.price || '';
        document.getElementById('product-phone').value = pub.phone || '';
        document.getElementById('product-desc').value = pub.description || '';
        document.getElementById('product-extra-refs').value = pub.extraRefs || '';
        document.getElementById('product-ref').value = pub.reference || '';

        typeCalle.classList.remove('selected');
        typeEstablecimiento.classList.remove('selected');
        if (pub.sellerType === 'calle') typeCalle.classList.add('selected');
        else typeEstablecimiento.classList.add('selected');

        photoSlots.forEach(resetSlot);
        const images = [pub.mainImage, ...(pub.images || [])].filter(Boolean);
        images.forEach((url, index) => {
            if (index < photoSlots.length) setSlotImageFromUrl(photoSlots[index], url);
        });

        AppState.currentLocation = {
            latitude: pub.latitude, longitude: pub.longitude, accuracy: pub.accuracy,
            address: pub.address, city: pub.city, state: pub.state, country: pub.country
        };

        publicationForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* =====================================================
       SHEET DE PRODUCTO
       ===================================================== */
    function openProductSheet(product) {
        AppState.currentProduct = product;
        currentGalleryIndex = 0;

        sheetCategory.textContent = product.category || 'Producto';
        sheetName.textContent = product.name || '';

        if (product.storeName) {
            sheetStore.innerHTML = `<i class="fa-solid fa-store"></i> ${Formatters.escapeHtml(product.storeName)}`;
            sheetStore.style.display = 'flex';
        } else {
            sheetStore.style.display = 'none';
        }

        sheetPrice.textContent = Formatters.formatPrice(product.price);
        sheetTime.innerHTML = `<i class="fa-solid fa-clock"></i> ${Formatters.formatRelativeTime(product.createdAt)}`;
        sheetDesc.textContent = product.description || 'Sin descripción.';

        if (product.extraRefs && product.extraRefs.trim()) {
            sheetRefsBlock.classList.remove('hidden');
            sheetRefs.textContent = product.extraRefs;
        } else {
            sheetRefsBlock.classList.add('hidden');
        }

        sheetRef.textContent = product.address || product.reference || 'Sin referencia';

        if (product.phone && product.phone.trim()) {
            sheetContactRow.classList.remove('hidden');
            sheetPhone.textContent = product.phone;
            sheetCall.href = `tel:${product.phone.replace(/\s+/g, '')}`;
        } else {
            sheetContactRow.classList.add('hidden');
        }

        const allImages = [product.mainImage, ...(product.images || [])].filter(Boolean);
        buildGallery(allImages);

        sheetBackdrop.classList.add('open');
        isSheetOpen = true;
        document.body.style.overflow = 'hidden';
        FavoriteUI.updateAllButtons();

        if (!productSheetHistoryPushed) {
            history.pushState(
                { view: AppState.currentView, overlay: 'product', productId: product.id },
                '', ''
            );
            productSheetHistoryPushed = true;
        }
    }

    function closeProductSheet(syncHistory = true) {
        sheetBackdrop.classList.remove('open');
        isSheetOpen = false;
        document.body.style.overflow = '';
        AppState.currentProduct = null;

        if (productSheetHistoryPushed) {
            if (syncHistory) history.replaceState({ view: AppState.currentView, overlay: null }, '', '');
            productSheetHistoryPushed = false;
        }
    }

    function buildGallery(images) {
        galleryTrack.innerHTML = '';
        galleryDots.innerHTML = '';
        lightboxImages = images.slice();

        if (!images.length) {
            const slide = document.createElement('div');
            slide.className = 'gallery-slide';
            slide.style.background = 'var(--bg)';
            galleryTrack.appendChild(slide);
        } else {
            images.forEach((imgUrl, index) => {
                const slide = document.createElement('div');
                slide.className = 'gallery-slide';
                const img = document.createElement('img');
                img.src = Formatters.safeUrl(imgUrl) || '';
                img.alt = `Imagen ${index + 1}`;
                img.loading = 'lazy';
                img.draggable = false;
                slide.appendChild(img);
                slide.addEventListener('click', () => openLightbox(index));
                galleryTrack.appendChild(slide);

                const dot = document.createElement('span');
                dot.className = `gallery-dot ${index === 0 ? 'active' : ''}`;
                dot.dataset.index = index;
                dot.addEventListener('click', (e) => { e.stopPropagation(); goToGallerySlide(index); });
                galleryDots.appendChild(dot);
            });
        }

        currentGalleryIndex = 0;
        updateGalleryTransform(false);
        updateGalleryDots();
    }

    function goToGallerySlide(index) {
        const total = galleryTrack.children.length;
        if (index < 0 || index >= total) return;
        currentGalleryIndex = index;
        updateGalleryTransform(true);
        updateGalleryDots();
    }

    function updateGalleryTransform(animate = true) {
        galleryTrack.style.transition = animate ? 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' : 'none';
        galleryTrack.style.transform = `translateX(-${currentGalleryIndex * 100}%)`;
    }

    function updateGalleryDots() {
        galleryDots.querySelectorAll('.gallery-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentGalleryIndex);
        });
    }

    /* ---------- Galería: swipe ---------- */
    let galStartX = 0, galCurX = 0, galSwiping = false;
    function handleGalleryPointerDown(e) {
        if (e.pointerType !== 'touch') return;
        galSwiping = true;
        galStartX = e.clientX; galCurX = e.clientX;
        galleryTrack.style.transition = 'none';
    }
    function handleGalleryPointerMove(e) {
        if (!galSwiping) return;
        galCurX = e.clientX;
        const dx = galCurX - galStartX;
        const baseOffset = -currentGalleryIndex * galleryTrack.offsetWidth;
        galleryTrack.style.transform = `translateX(${baseOffset + dx}px)`;
    }
    function handleGalleryPointerUp() {
        if (!galSwiping) return;
        galSwiping = false;
        const dx = galCurX - galStartX;
        const threshold = galleryTrack.offsetWidth * 0.2;
        const total = galleryTrack.children.length;
        if (dx < -threshold && currentGalleryIndex < total - 1) currentGalleryIndex++;
        else if (dx > threshold && currentGalleryIndex > 0) currentGalleryIndex--;
        updateGalleryTransform(true);
        updateGalleryDots();
    }

    /* =====================================================
       LIGHTBOX
       ===================================================== */
    function openLightbox(index) {
        if (!lightboxImages.length) return;
        lightboxImages = lightboxImages.slice();
        lightboxIndex = index;
        lightboxTrack.innerHTML = '';
        lightboxDots.innerHTML = '';

        lightboxImages.forEach((url, i) => {
            const slide = document.createElement('div');
            slide.className = 'lightbox-slide';
            const img = document.createElement('img');
            img.src = Formatters.safeUrl(url);
            img.alt = `Imagen ${i + 1}`;
            img.draggable = false;
            slide.appendChild(img);
            lightboxTrack.appendChild(slide);

            const dot = document.createElement('span');
            dot.className = `gallery-dot ${i === index ? 'active' : ''}`;
            dot.dataset.index = i;
            dot.addEventListener('click', (e) => { e.stopPropagation(); goToLightbox(i); });
            lightboxDots.appendChild(dot);
        });

        lightbox.classList.remove('hidden');
        goToLightbox(index, false);
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.add('hidden');
        lightboxTrack.innerHTML = '';
        lightboxDots.innerHTML = '';
        lightboxImages = [];
        lbCurrentScale = 1;
        if (isSheetOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
    }

    function isLightboxOpen() {
        return lightbox && !lightbox.classList.contains('hidden');
    }

    function goToLightbox(index, animate = true) {
        const total = lightboxImages.length;
        if (index < 0 || index >= total) return;
        lightboxIndex = index;
        lightboxTrack.style.transition = animate ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' : 'none';
        lightboxTrack.style.transform = `translateX(-${index * 100}%)`;
        lightboxCounter.textContent = `${index + 1} / ${total}`;
        lightboxDots.querySelectorAll('.gallery-dot').forEach((d, i) => {
            d.classList.toggle('active', i === index);
        });
        lbCurrentScale = 1;
        lbActiveImg = null;
        lightboxTrack.querySelectorAll('img').forEach(im => {
            im.style.transform = 'scale(1)';
        });
    }

    function handleLightboxDown(e) {
        lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (lbPointers.size === 1) {
            lbDragging = true;
            lbStartX = e.clientX; lbCurX = e.clientX;
            lightboxTrack.style.transition = 'none';
        } else if (lbPointers.size === 2) {
            lbDragging = false;
            const [a, b] = [...lbPointers.values()];
            lbPinchStart = Math.hypot(b.x - a.x, b.y - a.y);
            lbActiveImg = lightboxTrack.children[lightboxIndex]?.querySelector('img') || null;
            if (lbActiveImg) lbActiveImg.style.transition = 'none';
        }
    }
    function handleLightboxMove(e) {
        if (!lbPointers.has(e.pointerId)) return;
        lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (lbPointers.size === 1 && lbDragging) {
            lbCurX = e.clientX;
            const dx = lbCurX - lbStartX;
            const base = -lightboxIndex * lightboxTrack.offsetWidth;
            lightboxTrack.style.transform = `translateX(${base + dx}px)`;
        } else if (lbPointers.size === 2) {
            const [a, b] = [...lbPointers.values()];
            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            lbCurrentScale = Math.min(Math.max(lbPinchScale * (dist / lbPinchStart), 1), 4);
            if (lbActiveImg) lbActiveImg.style.transform = `scale(${lbCurrentScale})`;
        }
    }
    function handleLightboxUp(e) {
        if (!lbPointers.has(e.pointerId)) return;
        lbPointers.delete(e.pointerId);

        if (lbPointers.size < 2 && lbActiveImg) {
            lbPinchScale = lbCurrentScale;
            if (lbPointers.size === 0) lbPinchStart = 0;
        }

        if (lbPointers.size === 0 && lbDragging) {
            lbDragging = false;
            const dx = lbCurX - lbStartX;
            const threshold = lightboxTrack.offsetWidth * 0.2;
            if (dx < -threshold && lightboxIndex < lightboxImages.length - 1) goToLightbox(lightboxIndex + 1);
            else if (dx > threshold && lightboxIndex > 0) goToLightbox(lightboxIndex - 1);
            else goToLightbox(lightboxIndex);
        } else if (lbPointers.size === 0) {
            goToLightbox(lightboxIndex);
        }
    }

    /* =====================================================
       DRAG DEL SHEET
       ===================================================== */
    function startDragSheet(e) {
        if (!isSheetOpen || productSheet.scrollTop > 0) return;
        isDraggingSheet = true;
        sheetStartY = e.clientY; sheetCurrentY = e.clientY;
        sheetBackdrop.classList.add('dragging');
        productSheet.style.transition = 'none';
        if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    }
    function moveDragSheet(e) {
        if (!isDraggingSheet) return;
        sheetCurrentY = e.clientY;
        const dy = sheetCurrentY - sheetStartY;
        if (dy > 0) productSheet.style.transform = `translateY(${dy}px)`;
    }
    function endDragSheet(e) {
        if (!isDraggingSheet) return;
        isDraggingSheet = false;
        sheetBackdrop.classList.remove('dragging');
        productSheet.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
        const dy = sheetCurrentY - sheetStartY;
        if (dy > 100) {
            closeProductSheet();
            productSheet.style.transform = '';
        } else {
            productSheet.style.transform = 'translateY(0)';
        }
        sheetCurrentY = 0;
        if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    }

    /* =====================================================
       NAVEGACIÓN EXTERNA
       ===================================================== */
    function openDirections(product) {
        if (!product) return;
        const lat = product.latitude, lon = product.longitude;
        if (lat == null || lon == null) {
            Toast.warning('Esta publicación no tiene coordenadas.');
            return;
        }
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
        if (window.cordova && window.cordova.InAppBrowser) {
            cordova.InAppBrowser.open(url, '_system');
        } else {
            window.open(url, '_blank', 'noopener');
        }
    }

    /* =====================================================
       INIT
       ===================================================== */
    function init() {
        if (initialized) return;
        initialized = true;

        publicationForm = document.getElementById('publication-form');
        stepType = document.getElementById('step-type');
        typeCalle = document.getElementById('type-calle');
        typeEstablecimiento = document.getElementById('type-establecimiento');
        btnBackType = document.getElementById('btn-back-type');
        btnGetLocation = document.getElementById('btn-get-location');
        productRefInput = document.getElementById('product-ref');
        btnSubmit = document.getElementById('btn-submit');
        btnSubmitText = document.getElementById('btn-submit-text');
        formError = document.getElementById('form-error');
        loginRequired = document.getElementById('login-required');
        formWrapper = document.getElementById('form-wrapper');
        productsGrid = document.getElementById('products-grid');
        searchResults = document.getElementById('search-results');
        searchInput = document.getElementById('search-input');
        clearSearch = document.getElementById('clear-search');
        searchSuggestions = document.getElementById('search-suggestions');
        suggestionChips = document.getElementById('suggestion-chips');
        sheetBackdrop = document.getElementById('sheet-backdrop');
        productSheet = document.getElementById('product-sheet');
        sheetDragZone = document.getElementById('sheet-drag-zone');
        galleryTrack = document.getElementById('gallery-track');
        galleryDots = document.getElementById('gallery-dots');
        galleryClose = document.getElementById('gallery-close');
        galleryPrev = document.getElementById('gallery-prev');
        galleryNext = document.getElementById('gallery-next');
        sheetCategory = document.getElementById('sheet-category');
        sheetName = document.getElementById('sheet-name');
        sheetStore = document.getElementById('sheet-store');
        sheetPrice = document.getElementById('sheet-price');
        sheetTime = document.getElementById('sheet-time');
        sheetDesc = document.getElementById('sheet-desc');
        sheetRefsBlock = document.getElementById('sheet-refs-block');
        sheetRefs = document.getElementById('sheet-refs');
        sheetRef = document.getElementById('sheet-ref');
        sheetContactRow = document.getElementById('sheet-contact-row');
        sheetPhone = document.getElementById('sheet-phone');
        sheetCall = document.getElementById('sheet-call');
        btnDirections = document.getElementById('btn-directions');
        sheetMapLink = document.getElementById('sheet-map-link');
        btnChatV2 = document.getElementById('btn-chat-v2');

        lightbox = document.getElementById('lightbox');
        lightboxTrack = document.getElementById('lightbox-track');
        lightboxClose = document.getElementById('lightbox-close');
        lightboxCounter = document.getElementById('lightbox-counter');
        lightboxDots = document.getElementById('lightbox-dots');

        photoSlots = [
            { slot: document.getElementById('photo-slot-main'), input: document.getElementById('photo-input-main'), preview: document.getElementById('photo-preview-main'), removeBtn: document.querySelector('[data-preview="photo-preview-main"]'), blob: null, previewUrl: null, uploadedUrl: '' },
            { slot: document.getElementById('photo-slot-2'), input: document.getElementById('photo-input-2'), preview: document.getElementById('photo-preview-2'), removeBtn: document.querySelector('[data-preview="photo-preview-2"]'), blob: null, previewUrl: null, uploadedUrl: '' },
            { slot: document.getElementById('photo-slot-3'), input: document.getElementById('photo-input-3'), preview: document.getElementById('photo-preview-3'), removeBtn: document.querySelector('[data-preview="photo-preview-3"]'), blob: null, previewUrl: null, uploadedUrl: '' },
            { slot: document.getElementById('photo-slot-4'), input: document.getElementById('photo-input-4'), preview: document.getElementById('photo-preview-4'), removeBtn: document.querySelector('[data-preview="photo-preview-4"]'), blob: null, previewUrl: null, uploadedUrl: '' },
            { slot: document.getElementById('photo-slot-5'), input: document.getElementById('photo-input-5'), preview: document.getElementById('photo-preview-5'), removeBtn: document.querySelector('[data-preview="photo-preview-5"]'), blob: null, previewUrl: null, uploadedUrl: '' }
        ];

        filterModal = document.getElementById('filter-modal');
        filterClose = document.getElementById('filter-close');
        filterApply = document.getElementById('filter-apply');
        filterCategory = document.getElementById('filter-category');
        filterSeller = document.getElementById('filter-seller');

        const priceInput = document.getElementById('product-price');
        priceInput.addEventListener('input', (e) => {
            e.target.value = Formatters.sanitizePriceInput(e.target.value);
        });

        typeCalle.addEventListener('click', () => selectSellerType(typeCalle));
        typeEstablecimiento.addEventListener('click', () => selectSellerType(typeEstablecimiento));
        btnBackType.addEventListener('click', resetFormMode);

        photoSlots.forEach(slot => {
            slot.slot.addEventListener('click', () => { if (!slot.uploadedUrl) slot.input.click(); });
            slot.input.addEventListener('change', e => {
                const file = e.target.files[0];
                if (file) processAndPreview(slot, file);
            });
            slot.removeBtn.addEventListener('click', e => { e.stopPropagation(); resetSlot(slot); });
        });

        btnGetLocation.addEventListener('click', handleGetLocation);
        publicationForm.addEventListener('submit', handleSubmit);

        searchInput.addEventListener('input', handleSearchInput);
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch.classList.remove('visible');
            searchSuggestions.style.display = 'block';
            handleSearchInput();
        });

        const btnFilters = document.getElementById('btn-search-filters');
        if (btnFilters) btnFilters.addEventListener('click', openFilterModal);
        if (filterClose) filterClose.addEventListener('click', closeFilterModal);
        if (filterApply) filterApply.addEventListener('click', applyFilters);

        galleryClose.addEventListener('click', () => closeProductSheet());
        galleryPrev.addEventListener('click', (e) => { e.stopPropagation(); goToGallerySlide(currentGalleryIndex - 1); });
        galleryNext.addEventListener('click', (e) => { e.stopPropagation(); goToGallerySlide(currentGalleryIndex + 1); });
        sheetDragZone.addEventListener('pointerdown', startDragSheet);
        sheetDragZone.addEventListener('pointermove', moveDragSheet);
        sheetDragZone.addEventListener('pointerup', endDragSheet);
        sheetDragZone.addEventListener('pointercancel', endDragSheet);
        sheetBackdrop.addEventListener('click', e => { if (e.target === sheetBackdrop) closeProductSheet(); });

        galleryTrack.addEventListener('pointerdown', handleGalleryPointerDown);
        galleryTrack.addEventListener('pointermove', handleGalleryPointerMove);
        galleryTrack.addEventListener('pointerup', handleGalleryPointerUp);
        galleryTrack.addEventListener('pointercancel', handleGalleryPointerUp);

        btnDirections.addEventListener('click', () => openDirections(AppState.currentProduct));
        sheetMapLink.addEventListener('click', () => openDirections(AppState.currentProduct));

        btnChatV2.addEventListener('click', () => {
            Toast.info('Los mensajes directos llegarán en la V2.');
        });

        lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        lightboxTrack.addEventListener('pointerdown', handleLightboxDown);
        lightboxTrack.addEventListener('pointermove', handleLightboxMove);
        lightboxTrack.addEventListener('pointerup', handleLightboxUp);
        lightboxTrack.addEventListener('pointercancel', handleLightboxUp);
    }

    window.PublicationUI = {
        init,
        updateAuthUI,
        loadPublications,
        renderProducts,
        renderSearchResults,
        showAllPublications,
        onEnterSearch,
        openProductSheet,
        closeProductSheet,
        openLightbox,
        closeLightbox,
        openEditForm,
        deletePublication,
        isProductSheetOpen: () => isSheetOpen,
        isLightboxOpen,
        isFilterModalOpen,
        closeFilterModal
    };
})();