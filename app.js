const API_BASE = 'http://127.0.0.1:8000/api/v1';

const corsBadge = document.getElementById('cors-status');
const gamesContainer = document.getElementById('games-container');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const addGameForm = document.getElementById('add-game-form');
const alertBox = document.getElementById('alert-box');

function showAlert(message, isError = false) {
    alertBox.textContent = message;
    alertBox.className = `alert-box ${isError ? 'alert-error' : 'alert-success'}`;
    alertBox.classList.remove('hidden');
    setTimeout(() => alertBox.classList.add('hidden'), 5000);
}

async function checkBackendConnection() {
    try {
        const response = await fetch(`${API_BASE}/categories/`);
        if (response.ok) {
            corsBadge.textContent = 'Бекенд доступний (CORS OK)';
            corsBadge.className = 'status-badge status-connected';
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (err) {
        corsBadge.textContent = 'Бекенд недоступний / CORS Error';
        corsBadge.className = 'status-badge status-error';
    }
}

// 2. Отримання каталогу ігор (GET)
async function fetchGames(searchTerm = '') {
    gamesContainer.innerHTML = '<p class="loading-text">Завантаження...</p>';
    try {
        const url = searchTerm 
            ? `${API_BASE}/games/?search=${encodeURIComponent(searchTerm)}`
            : `${API_BASE}/games/`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Не вдалося завантажити список ігор');
        
        const games = await response.json();
        renderGames(games);
    } catch (err) {
        gamesContainer.innerHTML = `<p class="alert-error">Помилка завантаження: ${err.message}</p>`;
    }
}

function renderGames(games) {
    if (!games || games.length === 0) {
        gamesContainer.innerHTML = '<p>Ігор не знайдено.</p>';
        return;
    }

    gamesContainer.innerHTML = games.map(game => `
        <div class="game-card">
            <h3>${game.title}</h3>
            <div class="game-price">${game.price} грн</div>
            <div class="game-meta">
                <span>${game.min_players}-${game.max_players} гравців</span> | 
                <span>${game.play_time_minutes} хв</span> | 
                <span>${game.rating}</span>
            </div>
            <p class="game-desc">${game.description ? game.description.slice(0, 90) + '...' : ''}</p>
        </div>
    `).join('');
}

addGameForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        price: parseFloat(document.getElementById('price').value),
        play_time_minutes: parseInt(document.getElementById('play_time').value),
        min_players: parseInt(document.getElementById('min_players').value),
        max_players: parseInt(document.getElementById('max_players').value),
        min_age: parseInt(document.getElementById('min_age').value),
        release_year: parseInt(document.getElementById('release_year').value),
        category_id: parseInt(document.getElementById('category_id').value),
        publisher_id: parseInt(document.getElementById('publisher_id').value),
    };

    try {
        const response = await fetch(`${API_BASE}/games/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.status === 201) {
            showAlert(`Гру «${data.title}» успішно створено!`);
            addGameForm.reset();
            fetchGames();
        } else {
            const errDetails = data.errors ? JSON.stringify(data.errors) : '';
            showAlert(`Помилка (${response.status}): ${data.message} ${errDetails}`, true);
        }
    } catch (err) {
        showAlert(`Мережева помилка: ${err.message}`, true);
    }
});

searchBtn.addEventListener('click', () => fetchGames(searchInput.value.trim()));
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchGames(searchInput.value.trim());
});

checkBackendConnection();
fetchGames();