const API_BASE = 'http://127.0.0.1:8000/api/v1';

function getAccessToken() {
    return localStorage.getItem('access_token');
}

function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

function setTokens(access, refresh) {
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
}

function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
}

function isAuthenticated() {
    return !!getAccessToken();
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function getCurrentUser() {
    const saved = localStorage.getItem('user_data');
    if (saved) return JSON.parse(saved);

    const token = getAccessToken();
    if (token) {
        const payload = parseJwt(token);
        if (payload) {
            return {
                username: payload.username || `User #${payload.user_id}`,
                is_staff: payload.is_staff || false
            };
        }
    }
    return null;
}

async function authFetch(url, options = {}) {
    let accessToken = getAccessToken();

    options.headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (accessToken) {
        options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response = await fetch(url, options);

    if (response.status === 401 && getRefreshToken()) {
        console.warn('Access token закінчився! Виконуємо автоматичний Silent Refresh...');

        try {
            const refreshResponse = await fetch(`${API_BASE}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: getRefreshToken() })
            });

            if (refreshResponse.ok) {
                const data = await refreshResponse.json();
                setTokens(data.access, data.refresh);
                console.log('Токен успішно оновлено! Повторюємо оригінальний запит...');

                options.headers['Authorization'] = `Bearer ${data.access}`;
                response = await fetch(url, options);
            } else {
                console.error('Refresh токен недійсний. Потрібен повторний вхід.');
                logout();
            }
        } catch (err) {
            console.error('Помилка оновлення токена:', err);
            logout();
        }
    }

    return response;
}

async function logout() {
    const refresh = getRefreshToken();
    const access = getAccessToken();

    if (refresh && access) {
        try {
            await fetch(`${API_BASE}/auth/logout/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access}`
                },
                body: JSON.stringify({ refresh })
            });
        } catch (e) {
            console.warn('Не вдалося відправити токен у blacklist:', e);
        }
    }

    clearTokens();
    window.location.href = 'login.html';
}

function renderHeader() {
    const nav = document.getElementById('navbar-auth');
    if (!nav) return;

    if (isAuthenticated()) {
        const user = getCurrentUser();
        const username = user ? user.username : 'Користувач';
        const isStaff = user && user.is_staff;

        nav.innerHTML = `
            ${isStaff ? '<a href="admin.html" class="nav-link">Додати гру</a>' : ''}
            <span class="user-badge">${username} ${isStaff ? '(Адмін)' : ''}</span>
            <button onclick="logout()" class="btn btn-outline-light">Вийти</button>
        `;
    } else {
        nav.innerHTML = `
            <a href="login.html" class="btn btn-outline-light">Увійти</a>
            <a href="register.html" class="btn btn-primary">Реєстрація</a>
        `;
    }
}

document.addEventListener('DOMContentLoaded', renderHeader);