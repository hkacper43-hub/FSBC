/**
 * ============================================
 * FSBC - SYSTEM TAKTYCZNY MAP
 * Plik JavaScript - Logika Frontend
 * ============================================
 */

// ============================================
// ZMIENNE GLOBALNE
// ============================================
let currentUser = null;
let isDrawing = false;
let firstPoint = null;
let allZones = [];
let currentMap = 'venture';

// Cooldown dla zmian strefy (10 minut)
const COOLDOWN_MS = 10 * 60 * 1000;

// Konfiguracja map - zawiera URL tekstury mapy i współrzędne granic
const mapConfigs = {
    'venture': { 
        url: 'https://i.ibb.co/R4Byggqp/image.png', 
        bounds: [[0, 0], [500, 500]] 
    }
};

// ============================================
// INICJALIZACJA MAPY (LEAFLET)
// ============================================

// Tworzymy nową mapę z konfiguracją CRS.Simple (system prostokątny, nie geograficzny)
const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -1,
    maxZoom: 3,
    zoomControl: false,
    attributionControl: false,
    zoomSnap: 0.1,
    dragging: false,
    scrollWheelZoom: true,
    doubleClickZoom: false,
    touchZoom: false,
    keyboard: false
});

// Dodajemy warstwę z obrazem mapy
let mapOverlay = L.imageOverlay(mapConfigs.venture.url, mapConfigs.venture.bounds).addTo(map);

// ============================================
// KONTROLA ZOOMU
// ============================================
function zoomIn() {
    const zoom = map.getZoom();
    if (zoom < map.options.maxZoom) {
        map.setZoom(zoom + 1);
    }
}

function zoomOut() {
    const zoom = map.getZoom();
    if (zoom > map.options.minZoom) {
        map.setZoom(zoom - 1);
    }
}

// ============================================
// FUNKCJE MAPY
// ============================================

/**
 * Dostosowuje widok mapy do ramki (fitBounds)
 */
function lockMapToFrame() {
    // Ustawiamy mapę tak, aby cały obraz był widoczny z lekkim marginesem
       map.fitBounds(mapConfigs[currentMap].bounds, { padding: [-100, -100] });

}

/**
 * Zmienia aktualną mapę
 * @param {string} mapId - ID mapy do załadowania
 */
function handleMapChange(mapId) {
    currentMap = mapId;
    
    // Aktualizujemy styl przycisków nawigacji
    document.querySelectorAll('.nav-btn').forEach(b => {
        if(b.id === 'btn-venture') {
            b.classList.toggle('active', b.id === 'btn-' + mapId);
            b.style.background = (b.id === 'btn-' + mapId) ? 'var(--primary)' : 'transparent';
            b.style.color = (b.id === 'btn-' + mapId) ? 'white' : 'var(--text-muted)';
        }
    });
    
    // Zmieniamy obraz mapy
    mapOverlay.setUrl(mapConfigs[mapId].url);
    lockMapToFrame();
    renderZones();
}

// ============================================
// FUNKCJE OBSŁUGI STREF (ZONES)
// ============================================

/**
 * Ładuje strefy z bazy danych z serwera
 */
async function loadZones() {
    try {
        const res = await fetch('/api/zones');
        const data = await res.json();
        
        // Aktualizujemy tylko jeśli nie jesteśmy w trybie rysowania
        if (!isDrawing) { 
            allZones = data; 
            renderZones(); 
        }
    } catch (err) {
        console.error('Błąd przy ładowaniu stref:', err);
    }
}

/**
 * Rysuje wszystkie strefy na mapie
 * Wyświetla graczy w każdej strefie oraz listę graczy w panelu bocznym
 */
function renderZones() {
    // Usuwamy wszystkie poprzednie warstwy (prostokąty i tooltips)
    map.eachLayer(layer => { 
        if (layer instanceof L.Rectangle || layer instanceof L.Tooltip) {
            map.removeLayer(layer); 
        }
    });
    
    // Filtrujemy strefy tylko dla aktualnej mapy
    const activeZones = allZones.filter(z => z.map === currentMap);
    const playerListUI = document.getElementById('player-list');
    playerListUI.innerHTML = '';
    let totalPlayers = 0;

    // Rysujemy każdą strefę
    activeZones.forEach(zone => {
        const ownersCount = zone.owners.length;
        
        // Determinujemy kolor na podstawie ilości graczy
        let color = ownersCount === 0 ? "#000000" : (ownersCount === 1 ? "#2ecc71" : "#ef4444");
        
        // Tworzymy prostokąt na mapie
        const rect = L.rectangle([zone.p1, zone.p2], { 
            color: color, 
            weight: 2, 
            fillOpacity: 0.25 
        }).addTo(map);

        // Jeśli strefa ma graczy, pokazujemy ich avatary i nicki
        if (ownersCount > 0) {
            // Budujemy tooltip z awatarami i nickami graczy
            let tooltipContent = `<div class="avatar-cluster" style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; border-color: ${color};">`;
            
            zone.owners.forEach(owner => {
                tooltipContent += `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="${owner.avatar}" class="cluster-img" style="width: 28px; height: 28px; margin: 0; border-color: ${color};">
                        <span style="color: white; font-weight: 700; font-size: 12px; white-space: nowrap;">${owner.name}</span>
                    </div>
                `;
            });
            
            tooltipContent += '</div>';
            
            rect.bindTooltip(tooltipContent, 
                { permanent: true, direction: 'center', className: 'zone-tooltip' }
            ).openTooltip();
            
            // Dodajemy graczy do listy w sidebar
            zone.owners.forEach(owner => {
                totalPlayers++;
                playerListUI.innerHTML += `<div class="player-entry"><img src="${owner.avatar}"><span>${owner.name}</span></div>`;
            });
        }

        // Kliknięcie na strefę - dodaj/usuń grę
        rect.on('click', (e) => { 
            L.DomEvent.stopPropagation(e); 
            handleZoneClick(zone); 
        });
        
        // Prawy przycisk myszy - usuń strefę (tylko admin)
        rect.on('contextmenu', (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            if (currentUser && currentUser.isAdmin) {
                deleteZone(zone.id);
            }
        });
    });
    
    // Aktualizujemy licznik graczy
    document.getElementById('count-total').innerText = totalPlayers;
    document.getElementById('player-count').innerText = totalPlayers;
}

/**
 * Obsługuje kliknięcie na strefę
 * Dodaje lub usuwa gracza ze strefy (z cooldownem)
 */
async function handleZoneClick(zone) {
    if (!currentUser) return alert("Zaloguj się przez Discord!");

    // Sprawdzamy cooldown dla zwykłych graczy
    if (!currentUser.isAdmin) {
        const lastChange = localStorage.getItem('lastZoneChange');
        const now = Date.now();
        
        if (lastChange && (now - lastChange < COOLDOWN_MS)) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - lastChange)) / 1000 / 60);
            alert(`Możesz zmienić strefę dopiero za ${remaining} min.`);
            return;
        }
    }

    // Sprawdzamy, czy gracz już jest w tej strefie
    const index = zone.owners.findIndex(o => o.name === currentUser.username);
    
    if (index > -1) {
        // Gracz już jest - usuwamy go
        zone.owners.splice(index, 1);
    } else {
        // Gracz nowy - najpierw usuwamy go z innych stref na tej mapie
        allZones.forEach(z => { 
            if(z.map === currentMap) {
                z.owners = z.owners.filter(o => o.name !== currentUser.username); 
            }
        });
        
        // Dodajemy gracza do nowej strefy
        zone.owners.push({ 
            name: currentUser.username, 
            avatar: document.getElementById('u-avatar').src 
        });
    }

    // Zapisujemy czas zmiany dla cooldownu (tylko jeśli to nie admin)
    if (!currentUser.isAdmin) {
        localStorage.setItem('lastZoneChange', Date.now().toString());
    }

    // Wysyłamy zmianę na serwer
    await fetch('/api/zones', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(allZones) 
    });
    
    renderZones();
}

/**
 * Usuwa strefę (dostęp tylko dla admina)
 */
async function deleteZone(zoneId) {
    if (!currentUser || !currentUser.isAdmin) return;
    
    if (confirm("Usunąć tę strefę na stałe?")) {
        allZones = allZones.filter(z => z.id !== zoneId);
        
        await fetch('/api/zones', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(allZones) 
        });
        
        renderZones();
    }
}

/**
 * Wyczyść wszystkie strefy z aktualnej mapy (dostęp tylko dla admina)
 */
async function clearMap() {
    if (!currentUser || !currentUser.isAdmin) return;
    
    if (confirm("UWAGA: Czy na pewno chcesz usunąć WSZYSTKIE strefy z tej mapy?")) {
        allZones = allZones.filter(z => z.map !== currentMap);
        
        await fetch('/api/zones', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(allZones) 
        });
        
        renderZones();
    }
}

// ============================================
// FUNKCJE RYSOWANIA STREF (ADMIN)
// ============================================

/**
 * Przełącza tryb rysowania nowych stref (dostęp tylko dla admina)
 */
function toggleDrawing() {
    if (!currentUser || !currentUser.isAdmin) {
        alert("Brak uprawnień administracyjnych.");
        return;
    }
    
    isDrawing = !isDrawing;
    document.getElementById('drawBtn').innerText = isDrawing ? "ANULUJ" : "DODAJ STREFĘ";
    firstPoint = null;
}

// Obsługa kliknięć na mapie do rysowania stref
map.on('click', (e) => {
    if (!isDrawing) return;
    if (!currentUser || !currentUser.isAdmin) {
        isDrawing = false;
        return;
    }

    if (!firstPoint) {
        // Pierwszy klik - zapisujemy punkt
        firstPoint = e.latlng;
    } else {
        // Drugi klik - tworzymy prostokąt
        allZones.push({ 
            id: Date.now(), 
            map: currentMap, 
            p1: [firstPoint.lat, firstPoint.lng], 
            p2: [e.latlng.lat, e.latlng.lng], 
            owners: [] 
        });
        
        toggleDrawing();
        
        fetch('/api/zones', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(allZones) 
        });
        
        renderZones();
    }
});

// ============================================
// FUNKCJE NAWIGACJI I WIDOKÓW
// ============================================

/**
 * Przełącza między różnymi widokami (Home, Map, Tournaments, itp.)
 */
function showView(viewId) {
    // Ukrywamy wszystkie widoki
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    
    // Usuwamy aktywną klasę z wszystkich elementów nawigacji
    document.querySelectorAll('.header-nav-item').forEach(i => i.classList.remove('active'));
    
    // Pokazujemy wybrany widok
    document.getElementById('view-' + viewId).classList.add('active');
    document.getElementById('nav-' + viewId).classList.add('active');
    
    // Jeśli to widok mapy - odświeżamy mapę
    if(viewId === 'map') {
        setTimeout(() => { 
            map.invalidateSize(); 
            lockMapToFrame(); 
        }, 200);
    }
}

// ============================================
// INICJALIZACJA SYSTEMU
// ============================================

/**
 * Główna funkcja inicjalizacyjna
 * - Ładuje dane użytkownika
 * - Wyświetla profil jeśli zalogowany
 * - Ładuje strefy co 5 sekund
 */
async function initSystem() {
    try {
        // Pobieramy dane zalogowanego użytkownika
        const response = await fetch('/api/user');
        const user = await response.json();
        
        if (user && user.id) {
            currentUser = user;
            const avatarUrl = user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
                : 'https://via.placeholder.com/60';
            
            // Ukrywamy przycisk logowania, pokazujemy profil
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('user-section').style.display = 'block';
            document.getElementById('u-name').innerText = user.username;
            document.getElementById('u-avatar').src = avatarUrl;
            document.getElementById('u-access-tag').innerText = user.isAdmin ? "ADMINISTRATOR" : "GRACZ";
            
            // Aktualizujemy profil na stronie głównej
            document.getElementById('home-auth-container').style.display = 'none';
            document.getElementById('home-profile-container').style.display = 'block';
            document.getElementById('h-name').innerText = user.username;
            document.getElementById('h-avatar').src = avatarUrl;
            
            // Pokazujemy narzędzia admina (jeśli admin)
            if(user.isAdmin) {
                document.getElementById('admin-tools').style.display = 'flex';
            }
        }
    } catch (err) {
        console.error('Błąd przy inicjalizacji:', err);
    }
    
    // Ładujemy strefy
    loadZones();
    
    // Odświeżamy strefy co 5 sekund
    setInterval(loadZones, 5000);
    
    // Dostosowujemy mapę do ramki
    lockMapToFrame();
}

// Uruchamiamy system po załadowaniu strony
initSystem();
