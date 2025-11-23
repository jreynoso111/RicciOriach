document.addEventListener('DOMContentLoaded', () => {
    // --- Login Logic ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');

            if (username === 'admin' && password === 'adminricci') {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                errorMsg.textContent = 'Credenciales incorrectas. Intenta admin / adminricci';
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
