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

    // --- Products Table ---
    const products = [
        { id: 101, name: 'Camiseta "Maquiné"', price: 25.00, stock: 150, live: true, link: 'https://riccioriach.com/tienda/maquine', image: defaultImage },
        { id: 102, name: 'Vinilo "Mi Derriengue"', price: 35.00, stock: 45, live: true, link: 'https://riccioriach.com/tienda/vinilo', image: defaultImage },
        { id: 103, name: 'Gorra "La Guayaba"', price: 20.00, stock: 18, live: false, link: '', image: defaultImage },
        { id: 104, name: 'Tote Bag "Tropical"', price: 15.00, stock: 200, live: true, link: '', image: defaultImage }
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
            const current = products[idx];
            const newName = prompt('Nombre del producto', current.name);
            const newPrice = prompt('Precio (USD)', current.price);
            const newStock = prompt('Stock disponible', current.stock);
            const newVisibility = prompt('Estado (Visible/Borrador)', current.live ? 'Visible' : 'Borrador');
            const newLink = prompt('Link del producto', current.link || '');
            const newImage = prompt('URL de la imagen (o deja vacío para mantener)', current.image || '');

            if (newName) current.name = newName;
            if (newPrice !== null && !isNaN(parseFloat(newPrice))) current.price = parseFloat(newPrice);
            if (newStock !== null && !isNaN(parseInt(newStock))) current.stock = parseInt(newStock);
            if (newVisibility) current.live = newVisibility.toLowerCase() === 'visible';
            if (newLink !== null) current.link = newLink;
            if (newImage !== null && newImage !== '') current.image = newImage;

            renderProducts();
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

    // --- Music Management ---
    const musicTableBody = document.getElementById('music-table-body');
    const addMusicForm = document.getElementById('add-music-form');
    const musicModal = document.getElementById('add-music-modal');
    const openMusicModal = document.getElementById('open-music-modal');
    const closeModalTriggers = document.querySelectorAll('[data-close-modal]');
    const musicCoverInput = document.getElementById('music-cover');
    const musicCoverPreview = document.getElementById('music-cover-preview');
    let musicData = (JSON.parse(localStorage.getItem('site_music_data')) || []).map(item => ({
        ...item,
        cover: item.cover || defaultImage
    }));
    let musicEditingIndex = null;
    let musicCoverData = '';

    function loadMusic() {
        if (musicTableBody) {
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
    }

    function resetMusicModal() {
        addMusicForm?.reset();
        musicEditingIndex = null;
        musicCoverData = '';
        addMusicForm?.removeAttribute('data-editing');
        if (musicCoverPreview) {
            musicCoverPreview.src = '';
            musicCoverPreview.dataset.src = '';
            musicCoverPreview.classList.add('hidden');
        }
        if (musicCoverInput) musicCoverInput.value = '';
    }

    openMusicModal?.addEventListener('click', () => {
        resetMusicModal();
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

            const newItem = { title, type, year, link, cover: musicCoverData || musicCoverPreview?.dataset.src || defaultImage };
            if (musicEditingIndex !== null) {
                musicData[musicEditingIndex] = { ...musicData[musicEditingIndex], ...newItem };
            } else {
                musicData.push(newItem);
            }
            localStorage.setItem('site_music_data', JSON.stringify(musicData));

            musicModal?.classList.add('hidden');
            resetMusicModal();
            loadMusic();
            alert('Música guardada correctamente');
        });
    }

    musicTableBody?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.dataset.deleteMusic) {
            const index = Number(target.dataset.deleteMusic);
            if (confirm('¿Estás seguro de eliminar este item?')) {
                musicData.splice(index, 1);
                localStorage.setItem('site_music_data', JSON.stringify(musicData));
                loadMusic();
            }
        }

        if (target.dataset.editMusic) {
            const index = Number(target.dataset.editMusic);
            const existing = musicData[index];
            musicEditingIndex = index;
            addMusicForm?.setAttribute('data-editing', String(index));
            document.getElementById('music-title').value = existing.title;
            document.getElementById('music-type').value = existing.type;
            document.getElementById('music-year').value = existing.year;
            document.getElementById('music-link').value = existing.link || '';
            if (musicCoverPreview) {
                musicCoverPreview.src = existing.cover || '';
                musicCoverPreview.dataset.src = existing.cover || '';
                musicCoverPreview.classList.toggle('hidden', !existing.cover);
                musicCoverData = existing.cover || '';
            }
            musicModal?.classList.remove('hidden');
        }
    });

    musicCoverInput?.addEventListener('change', async () => {
        const file = musicCoverInput.files?.[0];
        if (file) {
            musicCoverData = await readFileAsDataURL(file);
            if (musicCoverPreview) {
                musicCoverPreview.src = musicCoverData;
                musicCoverPreview.dataset.src = musicCoverData;
                musicCoverPreview.classList.remove('hidden');
            }
        }
    });

    loadMusic();

    // --- Blog Management (Dashboard) ---
    const dashboardBlogPosts = [
        { title: 'Sesión en vivo desde Santo Domingo', author: 'Ricci Oriach', status: 'Publicado', date: '2024-05-12', excerpt: 'Nuevas versiones con ritmos tropicales.', content: 'Revive la presentación completa con arreglos acústicos y percusión caribeña.', link: 'https://riccioriach.com/blog/sesion-sd', image: defaultImage },
        { title: 'Gira Caribe 2024', author: 'Equipo Ricci', status: 'Programado', date: '2024-06-03', excerpt: 'Fechas confirmadas para Puerto Rico y RD.', content: 'El tour incluirá sets íntimos, colaboraciones locales y merch exclusivo para cada parada.', link: 'https://riccioriach.com/blog/gira-caribe', image: 'assets/texture.png' },
        { title: 'Merch drop "Ritmo Solar"', author: 'Staff', status: 'Borrador', date: '2024-04-27', excerpt: 'Edición limitada inspirada en folclore futurista.', content: 'Línea de camisetas y accesorios con colores neón, prints inspirados en carnaval y detalles bordados.', link: '', image: defaultImage }
    ];

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
        const newPost = {
            title: document.getElementById('dashboard-post-title').value,
            author: document.getElementById('dashboard-post-author').value,
            status: document.getElementById('dashboard-post-status').value,
            date: document.getElementById('dashboard-post-date').value || 'Sin fecha',
            excerpt: document.getElementById('dashboard-post-excerpt').value,
            content: document.getElementById('dashboard-post-content').value,
            link: dashboardPostLinkInput?.value || '',
            image: dashboardPostImageData || dashboardPostImagePreview?.dataset.src || defaultImage
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
        }

        if (target.dataset.delete) {
            const idx = Number(target.dataset.delete);
            if (confirm('¿Eliminar este post?')) {
                dashboardBlogPosts.splice(idx, 1);
                renderBlogPosts();
                updateBlogStats();
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
