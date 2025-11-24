document.addEventListener('DOMContentLoaded', () => {
    // --- Login Logic ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');

            if (username === 'admin' && password === 'adminriccie') {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                errorMsg.textContent = 'Credenciales incorrectas. Intenta admin / adminriccie';
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

    // --- Products Table ---
    const products = [
        { id: 101, name: 'Camiseta "Maquiné"', price: 25.00, stock: 150, live: true },
        { id: 102, name: 'Vinilo "Mi Derriengue"', price: 35.00, stock: 45, live: true },
        { id: 103, name: 'Gorra "La Guayaba"', price: 20.00, stock: 18, live: false },
        { id: 104, name: 'Tote Bag "Tropical"', price: 15.00, stock: 200, live: true }
    ];

    const tableBody = document.getElementById('products-table-body');
    function renderProducts() {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        products.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${product.id}</td>
                <td>${product.name}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td><span class="badge ${product.live ? 'live' : 'hidden'}">${product.live ? 'Visible' : 'Oculto'}</span></td>
                <td class="table-actions">
                    <button class="action-btn" data-toggle-index="${index}">${product.live ? 'Ocultar' : 'Publicar'}</button>
                    <button class="action-btn ghost" data-edit-index="${index}">Editar</button>
                    <button class="action-btn" style="background:#dc3545; border-color:#dc3545;" data-delete-index="${index}">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    renderProducts();

    tableBody?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.dataset.toggleIndex) {
            const idx = Number(target.dataset.toggleIndex);
            products[idx].live = !products[idx].live;
            renderProducts();
            alert(`Producto #${products[idx].id} ahora está ${products[idx].live ? 'visible' : 'oculto'}.`);
        }
        if (target.dataset.editIndex) {
            const idx = Number(target.dataset.editIndex);
            alert(`Editar producto ${products[idx].name}`);
        }
        if (target.dataset.deleteIndex) {
            const idx = Number(target.dataset.deleteIndex);
            if (confirm(`¿Eliminar el producto ${products[idx].name}?`)) {
                products.splice(idx, 1);
                renderProducts();
            }
        }
    });

    const syncMerchBtn = document.getElementById('sync-merch-btn');
    if (syncMerchBtn) {
        syncMerchBtn.addEventListener('click', () => {
            alert('Cambios publicados en merch.html (demo).');
        });
    }

    // --- Blog Management ---
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
            image: 'assets/hero.png'
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
            image: 'assets/hero.png'
        }
    ];

    const blogTableBody = document.getElementById('blog-table-body');
    const blogForm = document.getElementById('blog-form');
    const blogTitleInput = document.getElementById('blog-title');
    const blogStatusInput = document.getElementById('blog-status');
    const blogDateInput = document.getElementById('blog-date');
    const blogLinkInput = document.getElementById('blog-link');
    const blogImageInput = document.getElementById('blog-image');
    const blogExcerptInput = document.getElementById('blog-excerpt');
    const blogSubmitBtn = document.getElementById('blog-submit-btn');
    const blogResetBtn = document.getElementById('blog-reset-btn');
    const publishBlogBtn = document.getElementById('publish-blog-btn');

    const slugify = (text = '') => text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9ñáéíóúü\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    let blogPosts = [];
    let editingSlug = null;

    function seedBlogPosts() {
        const stored = JSON.parse(localStorage.getItem(BLOG_STORAGE_KEY)) || [];
        const base = stored.length ? stored : defaultBlogPosts;
        const normalized = base.map(post => ({ ...post, slug: post.slug || slugify(post.title) }));
        localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(normalized));
        blogPosts = normalized;
    }

    function renderBlogTable() {
        if (!blogTableBody) return;
        blogTableBody.innerHTML = '';
        blogPosts.forEach(post => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${post.title}</td>
                <td>${post.status || ''}</td>
                <td>${post.date || ''}</td>
                <td>${post.slug}</td>
                <td class="table-actions">
                    <button class="action-btn ghost" data-blog-edit="${post.slug}">Editar</button>
                    <button class="action-btn" style="background:#dc3545; border-color:#dc3545;" data-blog-delete="${post.slug}">Eliminar</button>
                </td>
            `;
            blogTableBody.appendChild(row);
        });
    }

    function resetBlogForm() {
        blogForm?.reset();
        editingSlug = null;
        if (blogSubmitBtn) blogSubmitBtn.textContent = 'Guardar post';
    }

    function startEditBlog(slug) {
        const post = blogPosts.find(p => p.slug === slug);
        if (!post || !blogForm) return;
        blogTitleInput.value = post.title || '';
        blogStatusInput.value = post.status || 'Publicado';
        blogDateInput.value = post.date || '';
        blogLinkInput.value = post.link || '';
        blogImageInput.value = post.image || '';
        blogExcerptInput.value = post.excerpt || '';
        editingSlug = slug;
        if (blogSubmitBtn) blogSubmitBtn.textContent = 'Actualizar post';
    }

    blogForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const payload = {
            title: blogTitleInput.value,
            status: blogStatusInput.value,
            date: blogDateInput.value || new Date().toISOString().slice(0, 10),
            excerpt: blogExcerptInput.value,
            link: blogLinkInput.value,
            image: blogImageInput.value || 'assets/hero.png'
        };

        const slug = editingSlug || slugify(payload.title);
        const updatedPost = { ...payload, slug };

        const existingIndex = blogPosts.findIndex(p => p.slug === slug);
        if (existingIndex >= 0) {
            blogPosts[existingIndex] = { ...blogPosts[existingIndex], ...updatedPost };
        } else {
            blogPosts.push(updatedPost);
        }

        localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(blogPosts));
        renderBlogTable();
        resetBlogForm();
    });

    blogResetBtn?.addEventListener('click', () => resetBlogForm());

    blogTableBody?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.dataset.blogEdit) {
            startEditBlog(target.dataset.blogEdit);
        }

        if (target.dataset.blogDelete) {
            const slug = target.dataset.blogDelete;
            if (confirm('¿Eliminar este post del blog?')) {
                blogPosts = blogPosts.filter(p => p.slug !== slug);
                localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(blogPosts));
                renderBlogTable();
                resetBlogForm();
            }
        }
    });

    publishBlogBtn?.addEventListener('click', () => {
        alert('Cambios del blog guardados en localStorage para su sincronización.');
    });

    seedBlogPosts();
    renderBlogTable();

    // --- Music Management ---
    const musicTableBody = document.getElementById('music-table-body');
    const addMusicForm = document.getElementById('add-music-form');
    const musicModal = document.getElementById('add-music-modal');
    const openMusicModal = document.getElementById('open-music-modal');
    const closeModalTriggers = document.querySelectorAll('[data-close-modal]');

    function loadMusic() {
        const musicData = JSON.parse(localStorage.getItem('site_music_data')) || [];
        if (musicTableBody) {
            musicTableBody.innerHTML = '';
            musicData.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.title}</td>
                    <td>${item.type}</td>
                    <td>${item.year}</td>
                    <td>
                        <button class="action-btn" style="background:#dc3545; border-color:#dc3545;" onclick="deleteMusic(${index})">Eliminar</button>
                    </td>
                `;
                musicTableBody.appendChild(row);
            });
        }
    }

    openMusicModal?.addEventListener('click', () => {
        musicModal?.classList.remove('hidden');
    });

    closeModalTriggers.forEach(btn => btn.addEventListener('click', () => {
        musicModal?.classList.add('hidden');
    }));

    if (addMusicForm) {
        addMusicForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('music-title').value;
            const type = document.getElementById('music-type').value;
            const year = document.getElementById('music-year').value;
            const link = document.getElementById('music-link').value;

            const newItem = { title, type, year, link, cover: 'assets/hero.png' };
            const musicData = JSON.parse(localStorage.getItem('site_music_data')) || [];
            musicData.push(newItem);
            localStorage.setItem('site_music_data', JSON.stringify(musicData));

            musicModal?.classList.add('hidden');
            addMusicForm.reset();
            loadMusic();
            alert('Música agregada correctamente');
        });
    }

    window.deleteMusic = (index) => {
        if (confirm('¿Estás seguro de eliminar este item?')) {
            const musicData = JSON.parse(localStorage.getItem('site_music_data')) || [];
            musicData.splice(index, 1);
            localStorage.setItem('site_music_data', JSON.stringify(musicData));
            loadMusic();
        }
    };

    loadMusic();
});
