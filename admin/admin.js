document.addEventListener('DOMContentLoaded', () => {
    // --- Login Logic ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');

            // Mock Auth (Demo Only)
            if (username === 'admin' && password === 'admin123') {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                errorMsg.textContent = 'Credenciales incorrectas. Intenta admin / admin123';
            }
        });
        return; // Stop execution if on login page
    }

    // --- Dashboard Logic ---

    // Check Auth
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'index.html';
        });
    }

    // Navigation
    const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Update Nav
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Update Section
            const sectionId = link.getAttribute('data-section');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');

            // Update Title
            pageTitle.textContent = link.textContent;
        });
    });

    // Populate Products Table (Mock Data)
    const products = [
        { id: 101, name: 'Camiseta "Maquiné"', price: 25.00, stock: 150 },
        { id: 102, name: 'Vinilo "Mi Derriengue"', price: 35.00, stock: 45 },
        { id: 103, name: 'Gorra "La Guayaba"', price: 20.00, stock: 80 },
        { id: 104, name: 'Tote Bag "Tropical"', price: 15.00, stock: 200 }
    ];

    const tableBody = document.getElementById('products-table-body');
    if (tableBody) {
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${product.id}</td>
                <td>${product.name}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td>
                    <button class="action-btn" onclick="alert('Editar producto ${product.id}')">Editar</button>
                    <button class="action-btn" style="background: #dc3545;" onclick="alert('Eliminar producto ${product.id}')">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Export to CSV Logic
    const exportBtn = document.getElementById('export-report-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = [
                ['Mes', 'Ventas', 'Ordenes'],
                ['Enero', 10500, 120],
                ['Febrero', 11200, 135],
                ['Marzo', 9800, 110],
                ['Abril', 12450, 156],
                ['Mayo', 11800, 140]
            ];

            let csvContent = "data:text/csv;charset=utf-8,";
            data.forEach(rowArray => {
                let row = rowArray.join(",");
                csvContent += row + "\r\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "reporte_ventas_ricci_oriach.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    // --- Music Management Logic ---
    const musicTableBody = document.getElementById('music-table-body');
    const addMusicForm = document.getElementById('add-music-form');

    // Load Music Data
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
                        <button class="action-btn" style="background: #dc3545;" onclick="deleteMusic(${index})">Eliminar</button>
                    </td>
                `;
                musicTableBody.appendChild(row);
            });
        }
    }

    // Add Music
    if (addMusicForm) {
        addMusicForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('music-title').value;
            const type = document.getElementById('music-type').value;
            const year = document.getElementById('music-year').value;
            const link = document.getElementById('music-link').value;

            const newItem = { title, type, year, link, cover: 'assets/hero.png' }; // Default cover for now

            const musicData = JSON.parse(localStorage.getItem('site_music_data')) || [];
            musicData.push(newItem);
            localStorage.setItem('site_music_data', JSON.stringify(musicData));

            document.getElementById('add-music-modal').style.display = 'none';
            addMusicForm.reset();
            loadMusic();
            alert('Música agregada correctamente');
        });
    }

    // Delete Music (Global function to be accessible from onclick)
    window.deleteMusic = (index) => {
        if (confirm('¿Estás seguro de eliminar este item?')) {
            const musicData = JSON.parse(localStorage.getItem('site_music_data')) || [];
            musicData.splice(index, 1);
            localStorage.setItem('site_music_data', JSON.stringify(musicData));
            loadMusic();
        }
    };

    // Initial Load
    loadMusic();

});
