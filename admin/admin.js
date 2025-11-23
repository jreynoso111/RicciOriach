document.addEventListener('DOMContentLoaded', () => {
    // --- Login Logic ---
    const validUser = 'admin';
    const validPass = 'adminriccie';
    const defaultImage = 'assets/hero.png';
    // --- Floating background for admin pages ---
    const adminCanvas = document.getElementById('admin-canvas-bg');
    if (adminCanvas) {
        const ctx = adminCanvas.getContext('2d');
        let particlesArray = [];
        let speedMultiplier = 1;
        let scrollTimeout;

        const resizeCanvas = () => {
            adminCanvas.width = window.innerWidth;
            adminCanvas.height = window.innerHeight;
            initParticles();
        };

        class Particle {
            constructor() {
                const hues = [90, 110, 135, 155, 180];
                this.x = Math.random() * adminCanvas.width;
                this.y = Math.random() * adminCanvas.height;
                this.size = Math.random() * 3 + 0.5;
                const depthSpeed = this.size * 0.15;
                this.speedX = (Math.random() * 2 - 1) * depthSpeed;
                this.speedY = (Math.random() * 2 - 1) * depthSpeed;
                const hue = hues[Math.floor(Math.random() * hues.length)];
                const lightness = 45 + Math.random() * 35;
                const alpha = 0.18 + Math.random() * 0.32;
                this.color = `hsla(${hue}, 70%, ${lightness}%, ${alpha})`;
            }
            update() {
                this.x += this.speedX * speedMultiplier;
                this.y += this.speedY * speedMultiplier;
                if (this.x > adminCanvas.width) this.x = 0; else if (this.x < 0) this.x = adminCanvas.width;
                if (this.y > adminCanvas.height) this.y = 0; else if (this.y < 0) this.y = adminCanvas.height;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        const initParticles = () => {
            particlesArray = [];
            const numberOfParticles = (adminCanvas.height * adminCanvas.width) / 9000;
            for (let i = 0; i < numberOfParticles; i++) {
                particlesArray.push(new Particle());
            }
        };

        const animateParticles = () => {
            requestAnimationFrame(animateParticles);
            ctx.clearRect(0, 0, adminCanvas.width, adminCanvas.height);
            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
                particlesArray[i].draw();
            }
        };

        const resetMultiplier = () => {
            speedMultiplier = 1;
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('wheel', () => {
            speedMultiplier = 3;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(resetMultiplier, 250);
        });

        resizeCanvas();
        animateParticles();
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');

            if (username === validUser && password === validPass) {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                errorMsg.textContent = 'Credenciales incorrectas. Usa admin / adminriccie';
            }
        });
        return;
    }

    // --- Auth check for Dashboard ---
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    // --- Navigation ---
    const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const sectionId = link.getAttribute('data-section');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');

            pageTitle.textContent = link.textContent;
        });
    });

    const readFileAsDataURL = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    // --- Logout ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'index.html';
        });
    }

    // --- Visits sparkline ---
    const visitSparkline = document.getElementById('visit-sparkline');
    const visitsData = [5800, 6400, 6100, 7200, 7050, 6900, 6460];
    const maxVisit = Math.max(...visitsData);
    if (visitSparkline) {
        visitsData.forEach(value => {
            const bar = document.createElement('span');
            const height = Math.max(20, (value / maxVisit) * 80);
            bar.style.height = `${height}px`;
            bar.title = `${value.toLocaleString('es-DO')} visitas`;
            visitSparkline.appendChild(bar);
        });
    }

    // --- Dashboard Merch Table + Editor ---
    const merchTableBody = document.getElementById('products-table-body');
    const merchForm = document.getElementById('dashboard-merch-form');
    const merchPreview = {
        image: document.getElementById('dashboard-preview-image'),
        name: document.getElementById('dashboard-preview-name'),
        desc: document.getElementById('dashboard-preview-desc'),
        price: document.getElementById('dashboard-preview-price'),
        stock: document.getElementById('dashboard-preview-stock'),
        link: document.getElementById('dashboard-preview-link'),
        imageInput: document.getElementById('dashboard-product-image'),
        imagePreview: document.getElementById('dashboard-product-image-preview'),
    };
    const newDashboardProductBtn = document.getElementById('new-dashboard-product');
    const merchSyncChip = document.getElementById('dashboard-merch-sync');
    const MERCH_STORAGE_KEY = 'merchCatalog';
    const merchSlugInput = document.getElementById('dashboard-product-slug');

    const slugify = (text) => (text || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .replace(/-{2,}/g, '-')
        || 'item';

    const defaultMerchProducts = [
        { id: 201, name: 'Sudadera "Ritmo Solar"', slug: 'sudadera-ritmo-solar', price: 55, stock: 8, status: 'Visible', description: 'Sudadera bordada con gráficos folclore futurista y capucha forrada.', link: 'https://example.com/ritmo-solar', image: 'merch_nuevo_drop.jpg' },
        { id: 202, name: 'Camiseta "Maquiné"', slug: 'camiseta-maquine', price: 35, stock: 30, status: 'Visible', description: 'Camiseta suave de algodón orgánico con tipografía Maquiné.', link: 'https://example.com/maquine', image: 'merch_camiseta_maquine.jpg' },
        { id: 203, name: 'Vinilo "Mi Derriengue"', slug: 'vinilo-mi-derriengue', price: 40, stock: 0, status: 'Agotado', description: 'Prensado en 180g con arte alternativo y letras impresas.', link: 'https://example.com/derriengue', image: 'merch_vinilo_la_guayaba.jpg' },
        { id: 204, name: 'Gorra Logo', slug: 'gorra-logo', price: 25, stock: 5, status: 'Borrador', description: 'Gorra ajustable con logo psicodélico bordado.', link: 'https://example.com/gorra', image: 'merch_gorra_logo.jpg' }
    ];

    const ensureMerchSlugs = (items) => items.map((item, idx) => {
        const baseSlug = item.slug || slugify(item.name || `articulo-${idx + 1}`);
        return { ...item, slug: baseSlug };
    });

    let merchProducts = ensureMerchSlugs(JSON.parse(localStorage.getItem(MERCH_STORAGE_KEY) || 'null') || defaultMerchProducts);
    let merchEditingIndex = null;
    let merchImageData = '';

    function saveMerchCatalog() {
        localStorage.setItem(MERCH_STORAGE_KEY, JSON.stringify(merchProducts));
        if (merchSyncChip) merchSyncChip.textContent = `Actualizado • ${new Date().toLocaleString('es-DO')}`;
    }

    function renderMerchTable() {
        if (!merchTableBody) return;
        merchTableBody.innerHTML = '';
        merchProducts.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${product.id}</td>
                <td>${product.name}</td>
                <td>$${Number(product.price).toFixed(2)}</td>
                <td>${product.stock}</td>
                <td><span class="badge ${product.status === 'Visible' ? 'live' : product.status === 'Agotado' ? 'neutral' : 'hidden'}">${product.status}</span></td>
                <td class="table-actions">
                    <button class="action-btn ghost" data-edit-product="${index}">Editar</button>
                    <button class="action-btn" data-toggle-product="${index}">${product.status === 'Visible' ? 'Ocultar' : 'Publicar'}</button>
                    <button class="action-btn" style="background:#dc3545; border-color:#dc3545;" data-delete-product="${index}">Eliminar</button>
                </td>
            `;
            merchTableBody.appendChild(row);
        });
    }

    function updateMerchPreview() {
        if (!merchForm) return;
        merchPreview.name.textContent = document.getElementById('dashboard-product-name')?.value || 'Nombre del producto';
        merchPreview.desc.textContent = document.getElementById('dashboard-product-description')?.value || 'La descripción aparecerá aquí para validar el copy.';
        const price = Number(document.getElementById('dashboard-product-price')?.value || 0).toFixed(2);
        merchPreview.price.textContent = `$${price}`;
        merchPreview.stock.textContent = `Stock: ${document.getElementById('dashboard-product-stock')?.value || 0}`;
        const link = document.getElementById('dashboard-product-link')?.value;
        merchPreview.link.textContent = link ? 'Ver link' : 'Sin enlace';
        merchPreview.link.href = link || '#';
    }

    function resetMerchForm() {
        merchEditingIndex = null;
        merchImageData = '';
        merchForm?.reset();
        merchForm?.removeAttribute('data-editing');
        if (merchSlugInput) merchSlugInput.value = '';
        if (merchPreview.imagePreview) {
            merchPreview.imagePreview.src = '';
            merchPreview.imagePreview.dataset.src = '';
            merchPreview.imagePreview.classList.add('hidden');
        }
        if (merchPreview.imageInput) merchPreview.imageInput.value = '';
        merchPreview.image.src = defaultImage;
        merchPreview.stock.textContent = 'Stock: 0';
        merchPreview.price.textContent = '$0.00';
        merchPreview.name.textContent = 'Nombre del producto';
        merchPreview.desc.textContent = 'La descripción aparecerá aquí para validar el copy.';
    }

    function loadMerchToForm(product, index) {
        merchEditingIndex = index;
        merchForm?.setAttribute('data-editing', 'true');
        document.getElementById('dashboard-product-name').value = product.name;
        if (merchSlugInput) merchSlugInput.value = product.slug || slugify(product.name);
        document.getElementById('dashboard-product-price').value = product.price;
        document.getElementById('dashboard-product-stock').value = product.stock;
        document.getElementById('dashboard-product-status').value = product.status;
        document.getElementById('dashboard-product-description').value = product.description || '';
        document.getElementById('dashboard-product-link').value = product.link || '';
        if (merchPreview.imagePreview) {
            merchPreview.imagePreview.src = product.image || defaultImage;
            merchPreview.imagePreview.dataset.src = product.image || defaultImage;
            merchPreview.imagePreview.classList.remove('hidden');
        }
        merchPreview.image.src = product.image || defaultImage;
        updateMerchPreview();
        merchForm.querySelector('button[type="submit"]').textContent = 'Actualizar';
    }

    merchPreview.imageInput?.addEventListener('change', () => {
        const file = merchPreview.imageInput.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                merchImageData = reader.result;
                merchPreview.imagePreview.src = reader.result;
                merchPreview.imagePreview.dataset.src = reader.result;
                merchPreview.imagePreview.classList.remove('hidden');
                merchPreview.image.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    });

    merchForm?.addEventListener('input', updateMerchPreview);

    merchForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const newProduct = {
            id: merchEditingIndex !== null ? merchProducts[merchEditingIndex].id : Math.floor(Math.random() * 500) + 300,
            name: document.getElementById('dashboard-product-name').value,
            slug: (() => {
                const typed = merchSlugInput?.value.trim();
                const base = typed || slugify(document.getElementById('dashboard-product-name').value);
                const exists = merchProducts.some((p, idx) => p.slug === base && idx !== merchEditingIndex);
                return exists ? `${base}-${Math.floor(Math.random() * 900 + 100)}` : base;
            })(),
            price: Number(document.getElementById('dashboard-product-price').value),
            stock: Number(document.getElementById('dashboard-product-stock').value),
            status: document.getElementById('dashboard-product-status').value,
            description: document.getElementById('dashboard-product-description').value,
            link: document.getElementById('dashboard-product-link').value,
            image: merchImageData || merchPreview.imagePreview?.dataset.src || defaultImage
        };

        if (newProduct.stock === 0) newProduct.status = 'Agotado';

        if (merchEditingIndex !== null) {
            merchProducts[merchEditingIndex] = { ...merchProducts[merchEditingIndex], ...newProduct };
        } else {
            merchProducts.unshift(newProduct);
        }

        saveMerchCatalog();
        renderMerchTable();
        resetMerchForm();
        updateMerchPreview();
        alert('Producto guardado y vinculado al carrito.');
    });

    merchForm?.addEventListener('reset', () => {
        setTimeout(() => {
            resetMerchForm();
            updateMerchPreview();
        });
    });

    merchTableBody?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.dataset.editProduct) {
            const idx = Number(target.dataset.editProduct);
            loadMerchToForm(merchProducts[idx], idx);
        }

        if (target.dataset.toggleProduct) {
            const idx = Number(target.dataset.toggleProduct);
            merchProducts[idx].status = merchProducts[idx].status === 'Visible' ? 'Borrador' : 'Visible';
            saveMerchCatalog();
            renderMerchTable();
        }

        if (target.dataset.deleteProduct) {
            const idx = Number(target.dataset.deleteProduct);
            if (confirm('¿Eliminar producto?')) {
                merchProducts.splice(idx, 1);
                saveMerchCatalog();
                renderMerchTable();
            }
        }
    });

    newDashboardProductBtn?.addEventListener('click', () => {
        resetMerchForm();
        updateMerchPreview();
        document.getElementById('dashboard-product-name').focus();
    });

    renderMerchTable();
    updateMerchPreview();

    const syncMerchBtn = document.getElementById('sync-merch-btn');
    if (syncMerchBtn) {
        syncMerchBtn.addEventListener('click', () => {
            alert('Cambios publicados en merch.html (demo).');
        });
    }

    // --- Music Management ---
    const musicTableBody = document.getElementById('music-table-body');
    const musicForm = document.getElementById('music-form');
    const musicCoverInput = document.getElementById('music-cover');
    const musicCoverPreview = document.getElementById('music-cover-preview');
    const musicNewBtn = document.getElementById('music-new');
    const musicNotes = document.getElementById('music-notes');
    const defaultMusic = [
        { title: 'Mi Derriengue', type: 'Álbum', year: '2024', link: 'https://spotify.com', cover: defaultImage, notes: 'Edición deluxe con colaboraciones.' },
        { title: 'La Guayaba', type: 'Single', year: '2023', link: 'https://youtube.com', cover: defaultImage, notes: 'Live session tropical.' }
    ];
    let musicData = (JSON.parse(localStorage.getItem('site_music_data')) || defaultMusic).map(item => ({ ...item, cover: item.cover || defaultImage }));
    let musicEditingIndex = null;
    let musicCoverData = '';

    function renderMusic() {
        if (!musicTableBody) return;
        musicTableBody.innerHTML = '';
        musicData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.title}</td>
                <td>${item.type}</td>
                <td>${item.year}</td>
                <td>${item.link ? `<a href="${item.link}" target="_blank">Abrir</a>` : '—'}</td>
                <td class="table-actions">
                    <button class="action-btn ghost" data-edit-music="${index}">Editar</button>
                    <button class="action-btn" style="background:#dc3545; border-color:#dc3545;" data-delete-music="${index}">Eliminar</button>
                </td>
            `;
            musicTableBody.appendChild(row);
        });
    }

    function resetMusicForm() {
        musicEditingIndex = null;
        musicCoverData = '';
        musicForm?.reset();
        musicForm?.removeAttribute('data-editing');
        if (musicCoverPreview) {
            musicCoverPreview.src = '';
            musicCoverPreview.dataset.src = '';
            musicCoverPreview.classList.add('hidden');
        }
        if (musicCoverInput) musicCoverInput.value = '';
    }

    function loadMusicToForm(item, index) {
        musicEditingIndex = index;
        musicForm?.setAttribute('data-editing', 'true');
        document.getElementById('music-title').value = item.title;
        document.getElementById('music-type').value = item.type;
        document.getElementById('music-year').value = item.year;
        document.getElementById('music-link').value = item.link;
        if (musicNotes) musicNotes.value = item.notes || '';
        if (musicCoverPreview) {
            musicCoverPreview.src = item.cover || defaultImage;
            musicCoverPreview.dataset.src = item.cover || defaultImage;
            musicCoverPreview.classList.remove('hidden');
        }
    }

    musicForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('music-title').value;
        const type = document.getElementById('music-type').value;
        const year = document.getElementById('music-year').value;
        const link = document.getElementById('music-link').value;
        const newItem = {
            title,
            type,
            year,
            link,
            notes: musicNotes?.value || '',
            cover: musicCoverData || musicCoverPreview?.dataset.src || defaultImage
        };

        if (musicEditingIndex !== null) {
            musicData[musicEditingIndex] = { ...musicData[musicEditingIndex], ...newItem };
        } else {
            musicData.unshift(newItem);
        }
        localStorage.setItem('site_music_data', JSON.stringify(musicData));
        resetMusicForm();
        renderMusic();
        alert('Lanzamiento guardado');
    });

    musicForm?.addEventListener('reset', () => setTimeout(resetMusicForm));

    musicTableBody?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.dataset.deleteMusic) {
            const index = Number(target.dataset.deleteMusic);
            if (confirm('¿Estás seguro de eliminar este item?')) {
                musicData.splice(index, 1);
                localStorage.setItem('site_music_data', JSON.stringify(musicData));
                renderMusic();
            }
        }

        if (target.dataset.editMusic) {
            const index = Number(target.dataset.editMusic);
            loadMusicToForm(musicData[index], index);
        }
    });

    musicCoverInput?.addEventListener('change', () => {
        const file = musicCoverInput.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                musicCoverData = reader.result;
                musicCoverPreview.src = reader.result;
                musicCoverPreview.dataset.src = reader.result;
                musicCoverPreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    musicNewBtn?.addEventListener('click', () => {
        resetMusicForm();
        document.getElementById('music-title').focus();
    });

    renderMusic();

    // --- Blog Management (Dashboard) ---
    const BLOG_STORAGE_KEY = 'public_blog_posts';
    const defaultBlogPosts = [
        {
            slug: 'sesion-en-vivo-desde-santo-domingo',
            title: 'Sesión en vivo desde Santo Domingo',
            author: 'Riccie Oriach',
            status: 'Publicado',
            date: '2024-05-12',
            excerpt: 'Nuevas versiones con ritmos tropicales.',
            content: 'Revive la presentación completa con arreglos acústicos y percusión caribeña.',
            link: 'https://riccioriach.com/blog/sesion-sd',
            image: defaultImage
        },
        {
            slug: 'gira-caribe-2024',
            title: 'Gira Caribe 2024',
            author: 'Equipo Riccie',
            status: 'Programado',
            date: '2024-06-03',
            excerpt: 'Fechas confirmadas para Puerto Rico y RD.',
            content: 'El tour incluirá sets íntimos, colaboraciones locales y merch exclusivo para cada parada.',
            link: 'https://riccioriach.com/blog/gira-caribe',
            image: 'assets/texture.png'
        },
        {
            slug: 'merch-drop-ritmo-solar',
            title: 'Merch drop "Ritmo Solar"',
            author: 'Staff',
            status: 'Borrador',
            date: '2024-04-27',
            excerpt: 'Edición limitada inspirada en folclore futurista.',
            content: 'Línea de camisetas y accesorios con colores neón, prints inspirados en carnaval y detalles bordados.',
            link: '',
            image: defaultImage
        }
    ];

    const slugify = (text = '') => text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9ñáéíóúü\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    let dashboardBlogPosts = (JSON.parse(localStorage.getItem(BLOG_STORAGE_KEY)) || defaultBlogPosts)
        .map(post => ({ ...post, slug: post.slug || slugify(post.title) }));

    const blogTableBody = document.getElementById('blog-table-body');
    const blogFilter = document.getElementById('blog-filter');
    const blogSearch = document.getElementById('blog-search');
    const blogForm = document.getElementById('dashboard-blog-form');
    const blogPublishedCount = document.getElementById('blog-published-count');
    const blogDraftCount = document.getElementById('blog-draft-count');
    const blogScheduledCount = document.getElementById('blog-scheduled-count');
    const blogLastUpdate = document.getElementById('blog-last-update');
    const blogSubmitBtn = blogForm?.querySelector('button[type="submit"]');
    const blogResetBtn = blogForm?.querySelector('button[type="reset"]');
    const dashboardPostLinkInput = document.getElementById('dashboard-post-link');
    const dashboardPostImageInput = document.getElementById('dashboard-post-image');
    const dashboardPostImagePreview = document.getElementById('dashboard-post-image-preview');
    let blogEditingIndex = null;
    let dashboardPostImageData = '';

    function syncPublicBlogPosts() {
        localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(dashboardBlogPosts.map(post => ({
            ...post,
            slug: post.slug || slugify(post.title)
        }))));
    }

    syncPublicBlogPosts();

    function updateBlogStats() {
        if (!blogPublishedCount || !blogDraftCount || !blogScheduledCount || !blogLastUpdate) return;
        blogPublishedCount.textContent = dashboardBlogPosts.filter(p => p.status === 'Publicado').length;
        blogDraftCount.textContent = dashboardBlogPosts.filter(p => p.status === 'Borrador').length;
        blogScheduledCount.textContent = dashboardBlogPosts.filter(p => p.status === 'Programado').length;
        blogLastUpdate.textContent = new Date().toLocaleString('es-DO');
    }

    function renderBlogPosts() {
        if (!blogTableBody) return;
        blogTableBody.innerHTML = '';
        const filter = blogFilter?.value || 'Todos';
        const term = (blogSearch?.value || '').toLowerCase();

        dashboardBlogPosts
            .filter(post => filter === 'Todos' || post.status === filter)
            .filter(post => post.title.toLowerCase().includes(term))
            .forEach((post, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${post.title}</td>
                    <td>${post.author}</td>
                    <td><span class="badge ${post.status === 'Publicado' ? 'live' : post.status === 'Programado' ? 'soft' : 'hidden'}">${post.status}</span></td>
                    <td>${post.date || '—'}</td>
                    <td>${post.link ? `<a href="${post.link}" target="_blank">Abrir</a>` : '—'}</td>
                    <td class="table-actions">
                        <button class="action-btn ghost" data-edit="${index}">Editar</button>
                        <button class="action-btn" data-toggle="${index}">${post.status === 'Publicado' ? 'Mover a borrador' : 'Publicar'}</button>
                        <button class="action-btn" style="background:#dc3545; border-color:#dc3545;" data-delete="${index}">Eliminar</button>
                    </td>
                `;
                blogTableBody.appendChild(row);
            });
    }

    function resetBlogFormState() {
        blogEditingIndex = null;
        blogForm?.removeAttribute('data-editing');
        if (blogSubmitBtn) blogSubmitBtn.textContent = 'Guardar';
        if (blogResetBtn) blogResetBtn.textContent = 'Limpiar';
        if (dashboardPostImagePreview) {
            dashboardPostImagePreview.src = '';
            dashboardPostImagePreview.dataset.src = '';
            dashboardPostImagePreview.classList.add('hidden');
        }
        if (dashboardPostImageInput) dashboardPostImageInput.value = '';
        if (dashboardPostLinkInput) dashboardPostLinkInput.value = '';
        dashboardPostImageData = '';
    }

    blogForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const titleValue = document.getElementById('dashboard-post-title').value;
        const computedSlug = slugify(titleValue);
        const newPost = {
            title: titleValue,
            author: document.getElementById('dashboard-post-author').value,
            status: document.getElementById('dashboard-post-status').value,
            date: document.getElementById('dashboard-post-date').value || 'Sin fecha',
            excerpt: document.getElementById('dashboard-post-excerpt').value,
            content: document.getElementById('dashboard-post-content').value,
            link: dashboardPostLinkInput?.value || '',
            image: dashboardPostImageData || dashboardPostImagePreview?.dataset.src || defaultImage,
            slug: computedSlug || (blogEditingIndex !== null ? dashboardBlogPosts[blogEditingIndex]?.slug : '') || `post-${Date.now()}`
        };

        if (blogEditingIndex !== null) {
            dashboardBlogPosts[blogEditingIndex] = { ...dashboardBlogPosts[blogEditingIndex], ...newPost };
        } else {
            dashboardBlogPosts.unshift(newPost);
        }

        blogForm.reset();
        resetBlogFormState();
        renderBlogPosts();
        updateBlogStats();
        syncPublicBlogPosts();
        alert(`Post "${newPost.title}" guardado bajo regla: ${document.getElementById('dashboard-auto-publish')?.value || 'manual'}`);
    });

    blogTableBody?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.dataset.toggle) {
            const idx = Number(target.dataset.toggle);
            dashboardBlogPosts[idx].status = dashboardBlogPosts[idx].status === 'Publicado' ? 'Borrador' : 'Publicado';
            renderBlogPosts();
            updateBlogStats();
            syncPublicBlogPosts();
        }

        if (target.dataset.delete) {
            const idx = Number(target.dataset.delete);
            if (confirm('¿Eliminar este post?')) {
                dashboardBlogPosts.splice(idx, 1);
                renderBlogPosts();
                updateBlogStats();
                syncPublicBlogPosts();
            }
        }

        if (target.dataset.edit) {
            const idx = Number(target.dataset.edit);
            const existing = dashboardBlogPosts[idx];
            blogEditingIndex = idx;
            blogForm?.setAttribute('data-editing', String(idx));
            document.getElementById('dashboard-post-title').value = existing.title;
            document.getElementById('dashboard-post-author').value = existing.author;
            document.getElementById('dashboard-post-status').value = existing.status;
            document.getElementById('dashboard-post-date').value = existing.date !== 'Sin fecha' ? existing.date : '';
            document.getElementById('dashboard-post-excerpt').value = existing.excerpt || '';
            document.getElementById('dashboard-post-content').value = existing.content || '';
            dashboardPostLinkInput && (dashboardPostLinkInput.value = existing.link || '');
            if (dashboardPostImagePreview) {
                dashboardPostImagePreview.src = existing.image || '';
                dashboardPostImagePreview.dataset.src = existing.image || '';
                dashboardPostImagePreview.classList.toggle('hidden', !existing.image);
                dashboardPostImageData = existing.image || '';
            }
            if (blogSubmitBtn) blogSubmitBtn.textContent = 'Actualizar';
            if (blogResetBtn) blogResetBtn.textContent = 'Cancelar';
            document.getElementById('dashboard-post-title').focus();
        }
    });

    blogForm?.addEventListener('reset', () => {
        setTimeout(() => {
            resetBlogFormState();
        });
    });

    dashboardPostImageInput?.addEventListener('change', async () => {
        const file = dashboardPostImageInput.files?.[0];
        if (file) {
            dashboardPostImageData = await readFileAsDataURL(file);
            if (dashboardPostImagePreview) {
                dashboardPostImagePreview.src = dashboardPostImageData;
                dashboardPostImagePreview.dataset.src = dashboardPostImageData;
                dashboardPostImagePreview.classList.remove('hidden');
            }
        }
    });

    blogFilter?.addEventListener('change', renderBlogPosts);
    blogSearch?.addEventListener('input', renderBlogPosts);
    document.getElementById('apply-dashboard-automation')?.addEventListener('click', () => {
        alert(`Automatización aplicada: ${document.getElementById('dashboard-auto-publish')?.value || 'manual'}`);
    });
    document.getElementById('export-dashboard-posts')?.addEventListener('click', () => {
        alert('Exportando CSV de posts (demo).');
    });
    document.getElementById('focus-blog-form')?.addEventListener('click', () => {
        document.getElementById('dashboard-post-title')?.focus();
    });

    resetBlogFormState();
    updateBlogStats();
    renderBlogPosts();

    // --- User Profiles Dashboard ---
    const profilesTableBody = document.getElementById('profiles-table-body');
    const profileForm = document.getElementById('profile-form');
    const profileNameInput = document.getElementById('profile-name');
    const profileEmailInput = document.getElementById('profile-email');
    const profileRoleInput = document.getElementById('profile-role');
    const profileAddressInput = document.getElementById('profile-address');
    const profilePaymentInput = document.getElementById('profile-payment');
    const profileNotesInput = document.getElementById('profile-notes');
    const createUserForm = document.getElementById('create-user-form');
    const profileCount = document.getElementById('profile-count');
    const googleCount = document.getElementById('google-count');
    const profileComplete = document.getElementById('profile-complete');
    const activeSessionLabel = document.getElementById('active-session');

    function loadProfileData() {
        const users = window.RicciAuth?.loadUsers?.() || [];
        const profiles = window.RicciAuth?.loadProfiles?.() || {};
        profilesTableBody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.name || 'Sin nombre'}</td>
                <td>${user.email}</td>
                <td>${user.role || 'user'}</td>
                <td>${new Date(user.createdAt || user.id?.split('-')[1] || Date.now()).toLocaleDateString('es-DO')}</td>
                <td class="table-actions"><button class="action-btn ghost" data-edit-profile="${user.email}">Editar</button></td>
            `;
            profilesTableBody.appendChild(tr);
        });

        profileCount && (profileCount.textContent = users.length);
        googleCount && (googleCount.textContent = users.filter(u => u.provider === 'google').length);

        const completed = Object.values(profiles).filter(p => p.address && p.paymentPref && p.name);
        const completionPercent = users.length ? Math.round((completed.length / users.length) * 100) : 0;
        profileComplete && (profileComplete.textContent = `${completionPercent}%`);

        const session = window.RicciAuth?.getSession?.();
        activeSessionLabel && (activeSessionLabel.textContent = session?.email || 'Sin sesión');
    }

    function loadProfileToForm(email) {
        const profile = window.RicciAuth?.getProfileForUser?.(email) || {};
        const user = (window.RicciAuth?.loadUsers?.() || []).find(u => u.email === email);
        profileNameInput.value = profile.name || user?.name || '';
        profileEmailInput.value = email;
        profileAddressInput.value = profile.address || '';
        profilePaymentInput.value = profile.paymentPref || 'Tarjeta';
        profileNotesInput.value = profile.notes || '';
        profileRoleInput.value = user?.role || 'user';
    }

    profilesTableBody?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.dataset.editProfile) return;
        loadProfileToForm(target.dataset.editProfile);
        profileNameInput.focus();
    });

    profileForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = profileEmailInput.value;
        if (!email) {
            alert('Selecciona un perfil de la tabla.');
            return;
        }
        window.RicciAuth?.saveProfileForUser?.(email, {
            name: profileNameInput.value,
            address: profileAddressInput.value,
            paymentPref: profilePaymentInput.value,
            notes: profileNotesInput.value
        });
        window.RicciAuth?.updateUserRole?.(email, profileRoleInput.value);
        alert('Perfil guardado para checkout y órdenes.');
        loadProfileData();
    });

    profileForm?.addEventListener('reset', () => setTimeout(() => profileEmailInput.value = ''));

    createUserForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        try {
            window.RicciAuth?.registerUser({
                name: document.getElementById('create-name').value,
                email: document.getElementById('create-email').value,
                password: document.getElementById('create-password').value,
                provider: 'password',
                role: document.getElementById('create-role').value || 'user'
            });
            alert('Usuario creado y loggeado.');
            loadProfileData();
        } catch (err) {
            alert(err.message || 'No se pudo crear la cuenta');
        }
    });

    document.getElementById('refresh-profiles')?.addEventListener('click', loadProfileData);

    loadProfileData();

    // --- Reports Module ---
    const reportRows = [
        { date: 'Hoy', sales: 4200, orders: 62, conversion: 3.4, status: 'Estable' },
        { date: 'Ayer', sales: 3880, orders: 57, conversion: 3.1, status: 'Vigilancia' },
        { date: 'Domingo', sales: 3020, orders: 44, conversion: 2.7, status: 'Bajo' },
        { date: 'Sábado', sales: 5120, orders: 71, conversion: 3.9, status: 'Óptimo' }
    ];

    const reportAlerts = [
        { category: 'ventas', message: 'Pico de conversión desde Instagram: +22% en 2h' },
        { category: 'inventario', message: 'Stock bajo en vinilo "Mi Derriengue" (12 uds)' },
        { category: 'pagos', message: '2 intentos de pago rechazados por banco emisor' },
        { category: 'ventas', message: 'Ticket promedio subió a $68.20' }
    ];

    const reportsTableBody = document.getElementById('reports-table-body');
    const reportRevenue = document.getElementById('report-revenue');
    const reportOrders = document.getElementById('report-orders');
    const reportConv = document.getElementById('report-conv');
    const reportRevenueTrend = document.getElementById('report-revenue-trend');
    const reportOrdersTrend = document.getElementById('report-orders-trend');
    const reportConvTrend = document.getElementById('report-conv-trend');
    const reportUpdated = document.getElementById('report-updated');
    const reportAlertsList = document.getElementById('report-alerts');
    const reportFilter = document.getElementById('report-filter');

    function renderReports() {
        if (!reportsTableBody) return;
        reportsTableBody.innerHTML = '';
        reportRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.date}</td>
                <td>$${row.sales.toLocaleString('es-DO')}</td>
                <td>${row.orders}</td>
                <td>${row.conversion}%</td>
                <td><span class="badge ${row.status === 'Óptimo' ? 'live' : row.status === 'Estable' ? 'soft' : 'hidden'}">${row.status}</span></td>
            `;
            reportsTableBody.appendChild(tr);
        });
    }

    function updateReportStats() {
        if (!reportRevenue || !reportOrders || !reportConv) return;
        const totals = reportRows.reduce((acc, row) => {
            acc.sales += row.sales;
            acc.orders += row.orders;
            acc.conv.push(row.conversion);
            return acc;
        }, { sales: 0, orders: 0, conv: [] });

        const avgConv = (totals.conv.reduce((a, b) => a + b, 0) / totals.conv.length).toFixed(1);
        reportRevenue.textContent = `$${totals.sales.toLocaleString('es-DO')}`;
        reportOrders.textContent = totals.orders;
        reportConv.textContent = `${avgConv}%`;

        reportRevenueTrend && (reportRevenueTrend.textContent = '+12% vs semana anterior');
        reportOrdersTrend && (reportOrdersTrend.textContent = '+6 pedidos vs ayer');
        reportConvTrend && (reportConvTrend.textContent = '+0.3 pts');
        reportUpdated && (reportUpdated.textContent = `Actualizado ${new Date().toLocaleTimeString('es-DO')}`);
    }

    function renderAlerts(category = 'all') {
        if (!reportAlertsList) return;
        reportAlertsList.innerHTML = '';
        reportAlerts
            .filter(alert => category === 'all' || alert.category === category)
            .forEach(alert => {
                const li = document.createElement('li');
                li.textContent = alert.message;
                reportAlertsList.appendChild(li);
            });
    }

    document.getElementById('refresh-reports')?.addEventListener('click', () => {
        updateReportStats();
        renderReports();
        renderAlerts(reportFilter?.value || 'all');
        alert('Reportes sincronizados en el dashboard.');
    });

    document.getElementById('download-report')?.addEventListener('click', () => {
        alert('Descargando PDF con las métricas principales (demo).');
    });

    reportFilter?.addEventListener('change', (e) => {
        const category = e.target?.value || 'all';
        renderAlerts(category);
    });

    renderReports();
    updateReportStats();
    renderAlerts();
});
