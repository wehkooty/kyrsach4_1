(function(){
  'use strict';

  // API Configuration
  const API_BASE_URL = 'http://localhost:3000/api';
  let authToken = localStorage.getItem('authToken');
  let currentUser = null;

  // API Helper Functions
  async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      showToast(error.message, 'error');
      throw error;
    }
  }

  // Authentication functions
  async function login(email, password) {
    try {
      const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      authToken = response.token;
      currentUser = response.user;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  async function register(name, email, password) {
    try {
      const response = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });

      authToken = response.token;
      currentUser = response.user;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }

  // Initialize user from localStorage
  function initUser() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
    }
  }

  // Data fetching functions
  async function getUsers() {
    return await apiCall('/users');
  }

  async function getClubs() {
    return await apiCall('/clubs');
  }

  async function createClub(clubData) {
    return await apiCall('/clubs', {
      method: 'POST',
      body: JSON.stringify(clubData)
    });
  }

  async function updateClub(id, clubData) {
    return await apiCall(`/clubs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clubData)
    });
  }

  async function deleteClub(id) {
    return await apiCall(`/clubs/${id}`, {
      method: 'DELETE'
    });
  }

  async function getClubMembers(clubId) {
    return await apiCall(`/clubs/${clubId}/members`);
  }

  async function addClubMember(clubId, userId) {
    return await apiCall(`/clubs/${clubId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async function joinClub(clubId) {
    return await apiCall(`/clubs/${clubId}/join`, {
      method: 'POST'
    });
  }

  async function leaveClub(clubId) {
    return await apiCall(`/clubs/${clubId}/leave`, {
      method: 'DELETE'
    });
  }

  async function removeClubMember(clubId, userId) {
    return await apiCall(`/clubs/${clubId}/members/${userId}`, {
      method: 'DELETE'
    });
  }

  async function getClubEvents(clubId) {
    return await apiCall(`/clubs/${clubId}/events`);
  }

  async function createEvent(clubId, eventData) {
    return await apiCall(`/clubs/${clubId}/events`, {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  }

  async function updateEvent(clubId, eventId, eventData) {
    return await apiCall(`/clubs/${clubId}/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData)
    });
  }

  async function getEvent(clubId, eventId) {
    return await apiCall(`/clubs/${clubId}/events/${eventId}`);
  }

  async function registerForEvent(eventId) {
    return await apiCall(`/events/${eventId}/register`, {
      method: 'POST'
    });
  }

  async function unregisterFromEvent(eventId) {
    return await apiCall(`/events/${eventId}/unregister`, {
      method: 'DELETE'
    });
  }

  async function getStatistics() {
    return await apiCall('/statistics');
  }

  async function updateUserRole(userId, role) {
    return await apiCall(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  }

  async function getClubFinances(clubId) {
    return await apiCall(`/clubs/${clubId}/finances`);
  }

  async function addIncome(clubId, data) {
    return await apiCall(`/clubs/${clubId}/finances/income`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async function addExpense(clubId, data) {
    return await apiCall(`/clubs/${clubId}/finances/expense`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async function getClubSchedules(clubId) {
    return await apiCall(`/clubs/${clubId}/schedules`);
  }

  async function addSchedule(clubId, data) {
    return await apiCall(`/clubs/${clubId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async function deleteSchedule(scheduleId) {
    return await apiCall(`/schedules/${scheduleId}`, {
      method: 'DELETE'
    });
  }

  async function getEventPayments(clubId) {
    return await apiCall(`/clubs/${clubId}/events/payments`);
  }

  async function markEventPayment(eventId, userId, amount) {
    return await apiCall(`/events/${eventId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ userId, amount })
    });
  }

  async function getContributions(clubId) {
    return await apiCall(`/clubs/${clubId}/contributions`);
  }

  async function createContributions(clubId) {
    return await apiCall(`/clubs/${clubId}/contributions`, {
      method: 'POST'
    });
  }

  async function markContributionAsPaid(contributionId) {
    return await apiCall(`/contributions/${contributionId}/pay`, {
      method: 'POST'
    });
  }

  // Excel export function
  async function exportStatisticsToExcel() {
    try {
      const response = await fetch(`${API_BASE_URL}/statistics/export`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'statistics.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('Статистика экспортирована в Excel', 'success');
    } catch (error) {
      showToast('Ошибка экспорта: ' + error.message, 'error');
    }
  }

  // Utility functions
  function fmt(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('ru-RU');
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      minimumFractionDigits: 0 
    }).format(amount);
  }

  function me() {
    return currentUser;
  }

  function canOrganize(user) {
    return !!user && (user.role === 'admin' || user.role === 'organizer');
  }

  // Toast Notifications
  function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  // Theme Management
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  // Russian translations
  const t = {
    clubs: 'Клубы',
    admin: 'Админ',
    login: 'Войти',
    register: 'Регистрация',
    logout: 'Выйти',
    name: 'Имя',
    email: 'Email',
    password: 'Пароль',
    description: 'Описание',
    location: 'Место',
    starts: 'Начало',
    ends: 'Конец',
    actions: 'Действия',
    save: 'Сохранить',
    cancel: 'Отмена',
    create: 'Создать',
    edit: 'Редактировать',
    delete: 'Удалить',
    view: 'Просмотр',
    back: 'Назад',
    search: 'Поиск',
    createClub: 'Создать клуб',
    editClub: 'Редактировать клуб',
    clubName: 'Название клуба',
    clubDescription: 'Описание клуба',
    owner: 'Владелец',
    events: 'События',
    members: 'Участники',
    finances: 'Финансы',
    schedule: 'Расписание',
    membership: 'Членство',
    createEvent: 'Создать событие',
    editEvent: 'Редактировать событие',
    eventTitle: 'Название события',
    eventDescription: 'Описание события',
    eventLocation: 'Место проведения',
    startsAt: 'Начало',
    endsAt: 'Конец',
    register: 'Зарегистрироваться',
    unregister: 'Отменить регистрацию',
    registered: 'Зарегистрировано',
    membershipFee: 'Взнос за членство',
    amount: 'Сумма',
    paymentDate: 'Дата платежа',
    paymentStatus: 'Статус платежа',
    paid: 'Оплачено',
    pending: 'Ожидает',
    overdue: 'Просрочено',
    income: 'Доходы',
    expenses: 'Расходы',
    balance: 'Баланс',
    addIncome: 'Добавить доход',
    addExpense: 'Добавить расход',
    weeklySchedule: 'Еженедельное расписание',
    dayOfWeek: 'День недели',
    time: 'Время',
    duration: 'Продолжительность',
    recurring: 'Повторяющееся',
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье',
    active: 'Активный',
    inactive: 'Неактивный',
    expired: 'Истек',
    notMember: 'Не участник',
    success: 'Успешно',
    error: 'Ошибка',
    warning: 'Предупреждение',
    confirmDelete: 'Вы уверены, что хотите удалить это? Это действие нельзя отменить.',
    accountCreated: 'Аккаунт создан успешно!',
    welcomeBack: 'Добро пожаловать обратно',
    loggedOut: 'Вы вышли из системы',
    clubCreated: 'Клуб создан успешно!',
    clubUpdated: 'Клуб обновлен успешно!',
    clubDeleted: 'Клуб удален успешно',
    eventCreated: 'Событие создано успешно!',
    eventUpdated: 'Событие обновлено успешно!',
    registeredForEvent: 'Успешно зарегистрированы на событие!',
    unregisteredFromEvent: 'Успешно отменили регистрацию на событие',
    roleUpdated: 'Роль пользователя обновлена',
    passwordTooShort: 'Пароль должен содержать минимум 6 символов',
    emailAlreadyExists: 'Email уже зарегистрирован',
    invalidCredentials: 'Неверный email или пароль',
    eventStartInFuture: 'Время начала события должно быть в будущем',
    eventEndAfterStart: 'Время окончания должно быть после времени начала'
  };

  const Roles = { ADMIN: 'admin', ORGANIZER: 'organizer', MEMBER: 'member' };

  const $ = (id) => document.getElementById(id);
  const app = () => $('app');
  const h = (strings, ...vals) => strings.map((s, i) => s + (i < vals.length ? (vals[i] ?? '') : '')).join('');

  function setNav() {
    const user = me();
    const navUser = $('navUser');
    const logoutBtn = $('logoutBtn');
    const themeToggle = $('themeToggle');
    
    document.querySelectorAll('.authed').forEach(e => e.style.display = user ? 'inline' : 'none');
    document.querySelectorAll('.guest-only').forEach(e => e.style.display = user ? 'none' : 'inline');
    document.querySelectorAll('.admin-only').forEach(e => e.style.display = (user && user.role === Roles.ADMIN) ? 'inline' : 'none');
    navUser.textContent = user ? `${user.name} (${user.role})` : '';
    logoutBtn.onclick = () => { 
      logout(); 
      showToast(t.loggedOut, 'success');
      setNav(); 
      go('/'); 
    };
    
    if (themeToggle) {
      themeToggle.onclick = toggleTheme;
    }
  }

  function go(path) {
    location.hash = '#' + path;
  }

  function parts() {
    const p = (location.hash || '#').slice(1);
    return p.split('/').filter(Boolean);
  }

  // Page functions
  function Home() {
    const user = me();
    app().innerHTML = h`
      <div class="card main-card featured">
        <h1>Распределенные Клубы по Интересам</h1>
        <p>Управляйте членством и событиями в различных клубах.</p>
        ${user ? h`<div class="action-group primary"><a class="btn" href="#/clubs">Перейти к клубам</a></div>` : h`<div class="action-group primary"><a class="btn" href="#/register">Начать</a></div>`}
      </div>
    `;
  }

  function Register() {
    app().innerHTML = h`
      <div class="card main-card">
        <h2>Регистрация</h2>
        <form id="f">
          <div class="form-group"><label>${t.name}</label><input class="input variant-outline" name="name" required></div>
          <div class="form-group"><label>${t.email}</label><input type="email" class="input variant-outline" name="email" required></div>
          <div class="form-group"><label>${t.password}</label><input type="password" class="input variant-outline" name="password" required></div>
          <div class="action-group primary"><button class="btn">${t.register}</button></div>
        </form>
      </div>
    `;
    
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      
      // Clear previous alerts
      const existingAlert = e.target.querySelector('.alert');
      if (existingAlert) existingAlert.remove();
      
      // Validation
      if (data.password.length < 6) {
        e.target.insertAdjacentHTML('afterbegin', h`<div class="alert error">${t.passwordTooShort}</div>`);
        return;
      }
      
      try {
        await register(data.name.trim(), data.email.toLowerCase(), data.password);
        showToast(t.accountCreated, 'success');
        setNav();
        go('/');
      } catch (error) {
        e.target.insertAdjacentHTML('afterbegin', h`<div class="alert error">${error.message}</div>`);
      }
    };
  }

  function Login() {
    app().innerHTML = h`
      <div class="card main-card">
        <h2>Вход</h2>
        <form id="f">
          <div class="form-group"><label>${t.email}</label><input type="email" class="input variant-filled" name="email" required></div>
          <div class="form-group"><label>${t.password}</label><input type="password" class="input variant-filled" name="password" required></div>
          <div class="action-group primary"><button class="btn">${t.login}</button></div>
        </form>
      </div>
    `;
    
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      
      // Clear previous alerts
      const existingAlert = e.target.querySelector('.alert');
      if (existingAlert) existingAlert.remove();
      
      try {
        await login(data.email.toLowerCase(), data.password);
        showToast(h`${t.welcomeBack}, ${currentUser.name}!`, 'success');
        setNav();
        go('/');
      } catch (error) {
        e.target.insertAdjacentHTML('afterbegin', h`<div class="alert error">${error.message}</div>`);
      }
    };
  }

  async function Clubs() {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const clubs = await getClubs();
      app().innerHTML = h`
        <div class="search-container">
          <input type="text" id="clubSearch" class="input search-input" placeholder="Поиск клубов..." />
          <select id="clubFilter" class="select filter-select">
            <option value="">Все клубы</option>
            <option value="my">Мои клубы</option>
            <option value="other">Другие клубы</option>
            <option value="joined">Клубы, в которых я участвую</option>
            <option value="not-joined">Клубы, в которых я не участвую</option>
          </select>
        </div>
        <div class="action-group mixed" style="margin-bottom:12px">
          ${canOrganize(user) ? h`<a class="btn" href="#/clubs/create">${t.createClub}</a>` : ''}
        </div>
        <table class="table" id="clubsTable">
          <thead><tr><th>${t.name}</th><th>${t.description}</th><th>${t.owner}</th><th>${t.actions}</th></tr></thead>
          <tbody>
            ${clubs.map(c => h`<tr data-club-id="${c.id}" data-owner-id="${c.owner_id}">
              <td>${c.name}</td>
              <td>${c.description || ''}</td>
              <td>${c.owner_name || '?'}</td>
              <td class="actions">
                <div class="action-group mixed">
                  <a class="btn tertiary" href="#/clubs/${c.id}/events">${t.events}</a>
                  <a class="btn tertiary" href="#/clubs/${c.id}/members">${t.members}</a>
                  ${(user.id === c.owner_id || user.role === Roles.ADMIN) ? h`
                    <a class="btn tertiary" href="#/clubs/${c.id}/finances">${t.finances}</a>
                  ` : ''}
                  <a class="btn tertiary" href="#/clubs/${c.id}/schedule">${t.schedule}</a>
                  <button class="btn" data-register="${c.id}">Зарегистрироваться</button>
                  ${(user.id === c.owner_id || user.role === Roles.ADMIN) ? h`
                    <a class="btn outline" href="#/clubs/${c.id}/edit">${t.edit}</a>
                    <button class="btn danger" data-del="${c.id}">${t.delete}</button>
                  ` : ''}
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;
      
      // Add event listeners
      app().querySelectorAll('[data-register]').forEach(b => b.onclick = () => {
        const clubId = Number(b.getAttribute('data-register'));
        ClubRegister(clubId);
      });
      
      app().querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        const id = Number(b.getAttribute('data-del'));
        if (confirm(t.confirmDelete)) {
          try {
            await deleteClub(id);
            showToast(t.clubDeleted, 'success');
            Clubs();
          } catch (error) {
            // Error already shown by apiCall
          }
        }
      });
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки клубов: ${error.message}</div>`;
    }
  }

  function ClubCreate() {
    const user = me();
    if (!user || !canOrganize(user)) { go('/clubs'); return; }
    
    app().innerHTML = h`
      <div class="card main-card info">
        <h2>${t.createClub}</h2>
        <form id="f">
          <div class="form-group"><label>${t.clubName}</label><input class="input variant-outline" name="name" required></div>
          <div class="form-group"><label>${t.clubDescription}</label><textarea class="textarea variant-outline" name="description"></textarea></div>
          <div class="form-group"><label>${t.membershipFee}</label><input type="number" class="input variant-outline" name="membershipFee" placeholder="0" min="0"></div>
          <div class="action-group mixed"><button class="btn">${t.create}</button> <a class="btn tertiary" href="#/clubs">${t.cancel}</a></div>
        </form>
      </div>
    `;
    
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      
      try {
        await createClub({
          name: data.name.trim(),
          description: data.description,
          membershipFee: Number(data.membershipFee) || 0
        });
        showToast(t.clubCreated, 'success');
        go('/clubs');
      } catch (error) {
        // Error already shown by apiCall
      }
    };
  }

  async function ClubEdit(id) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === id);
      if (!club) { go('/clubs'); return; }
      
      if (club.owner_id !== user.id && user.role !== Roles.ADMIN) { go('/clubs'); return; }
      
      app().innerHTML = h`
        <div class="card main-card warning">
          <h2>${t.editClub}</h2>
          <form id="f">
            <div class="form-group"><label>${t.clubName}</label><input class="input variant-filled" name="name" value="${club.name}" required></div>
            <div class="form-group"><label>${t.clubDescription}</label><textarea class="textarea variant-filled" name="description">${club.description || ''}</textarea></div>
            <div class="form-group"><label>${t.membershipFee}</label><input type="number" class="input variant-filled" name="membershipFee" value="${club.membership_fee || 0}" min="0"></div>
            <div class="action-group mixed"><button class="btn">${t.save}</button> <a class="btn tertiary" href="#/clubs">${t.cancel}</a></div>
          </form>
        </div>
      `;
      
      $('f').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        
        try {
          await updateClub(id, {
            name: data.name.trim(),
            description: data.description,
            membershipFee: Number(data.membershipFee) || 0
          });
          showToast(t.clubUpdated, 'success');
          go('/clubs');
        } catch (error) {
          // Error already shown by apiCall
        }
      };
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки клуба: ${error.message}</div>`;
    }
  }

  async function ClubRegister(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      await joinClub(clubId);
      showToast('Вы успешно зарегистрировались в клубе', 'success');
      Clubs();
    } catch (error) {
      // Error already shown by apiCall
    }
  }

  async function Events(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const events = await getClubEvents(clubId);
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === clubId);
      
      if (!club) { go('/clubs'); return; }
      
      app().innerHTML = h`
        <div class="search-container">
          <input type="text" id="eventSearch" class="input search-input" placeholder="Поиск событий..." />
          <select id="eventFilter" class="select filter-select">
            <option value="">Все события</option>
            <option value="upcoming">Предстоящие</option>
            <option value="past">Прошедшие</option>
          </select>
        </div>
        <div class="action-group mixed" style="margin-bottom:12px">
          <a class="btn tertiary" href="#/clubs">${t.back}</a>
          ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`<a class="btn" href="#/clubs/${clubId}/events/create">${t.createEvent}</a>` : ''}
          ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`<a class="btn secondary" href="#/clubs/${clubId}/events/payments">Управление платежами</a>` : ''}
        </div>
        <table class="table" id="eventsTable">
          <thead><tr><th>Название</th><th>Тип</th><th>Цена</th><th>${t.starts}</th><th>${t.ends}</th><th>${t.actions}</th></tr></thead>
          <tbody>
            ${events.map(ev => h`<tr>
              <td>${ev.title}</td>
              <td>
                <span class="badge ${ev.event_type === 'paid' ? 'badge-paid' : 'badge-free'}">
                  ${ev.event_type === 'paid' ? 'Платное' : 'Бесплатное'}
                </span>
              </td>
              <td>${ev.event_type === 'paid' ? formatCurrency(ev.price) : '—'}</td>
              <td>${fmt(ev.starts_at)}</td>
              <td>${fmt(ev.ends_at)}</td>
              <td class="actions">
                <div class="action-group mixed">
                  <a class="btn outline" href="#/clubs/${clubId}/events/${ev.id}">${t.view}</a>
                  ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`<a class="btn flat" href="#/clubs/${clubId}/events/${ev.id}/edit">${t.edit}</a>` : ''}
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки событий: ${error.message}</div>`;
    }
  }

  function EventCreate(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    app().innerHTML = h`
      <div class="card main-card featured">
        <h2>${t.createEvent}</h2>
        <form id="f">
          <div class="form-group"><label>${t.eventTitle}</label><input class="input variant-minimal" name="title" required></div>
          <div class="form-group"><label>${t.eventDescription}</label><textarea class="textarea variant-minimal" name="description"></textarea></div>
          <div class="form-group"><label>${t.eventLocation}</label><input class="input variant-minimal" name="location"></div>
          <div class="form-group"><label>${t.startsAt}</label><input type="datetime-local" class="input variant-minimal" name="startsAt" required></div>
          <div class="form-group"><label>${t.endsAt}</label><input type="datetime-local" class="input variant-minimal" name="endsAt"></div>
          <div class="form-group">
            <label>Тип события</label>
            <select name="eventType" class="select" required>
              <option value="free">Бесплатное</option>
              <option value="paid">Платное</option>
            </select>
          </div>
          <div class="form-group" id="priceGroup" style="display:none">
            <label>Цена (₽)</label>
            <input type="number" class="input variant-minimal" name="price" min="0" step="0.01" placeholder="0.00">
          </div>
          <div class="action-group mixed"><button class="btn">${t.create}</button> <a class="btn tertiary" href="#/clubs/${clubId}/events">${t.cancel}</a></div>
        </form>
      </div>
    `;
    
    // Handle event type change
    const eventTypeSelect = document.querySelector('select[name="eventType"]');
    const priceGroup = document.getElementById('priceGroup');
    const priceInput = document.querySelector('input[name="price"]');
    
    eventTypeSelect.addEventListener('change', function() {
      if (this.value === 'paid') {
        priceGroup.style.display = 'block';
        priceInput.required = true;
      } else {
        priceGroup.style.display = 'none';
        priceInput.required = false;
        priceInput.value = '';
      }
    });
    
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      
      // Clear previous alerts
      const existingAlert = e.target.querySelector('.alert');
      if (existingAlert) existingAlert.remove();
      
      // Validation
      const startsAt = Date.parse(data.startsAt);
      const endsAt = data.endsAt ? Date.parse(data.endsAt) : null;
      
      if (startsAt < Date.now()) {
        e.target.insertAdjacentHTML('afterbegin', h`<div class="alert error">${t.eventStartInFuture}</div>`);
        return;
      }
      
      if (endsAt && endsAt <= startsAt) {
        e.target.insertAdjacentHTML('afterbegin', h`<div class="alert error">${t.eventEndAfterStart}</div>`);
        return;
      }
      
      if (data.eventType === 'paid' && (!data.price || parseFloat(data.price) <= 0)) {
        e.target.insertAdjacentHTML('afterbegin', h`<div class="alert error">Для платного события необходимо указать цену больше 0</div>`);
        return;
      }
      
      try {
        await createEvent(clubId, {
          title: data.title.trim(),
          description: data.description,
          location: data.location,
          startsAt: startsAt,
          endsAt: endsAt,
          eventType: data.eventType,
          price: data.eventType === 'paid' ? parseFloat(data.price) : 0
        });
        showToast(t.eventCreated, 'success');
        go(`/clubs/${clubId}/events`);
      } catch (error) {
        // Error already shown by apiCall
      }
    };
  }

  async function EventDetail(clubId, eventId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const event = await getEvent(clubId, eventId);
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === clubId);
      
      if (!club || !event) { go('/clubs'); return; }
      
      app().innerHTML = h`
        <div class="action-group mixed" style="margin-bottom:12px">
          <a class="btn tertiary" href="#/clubs/${clubId}/events">${t.back}</a>
          ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`<a class="btn" href="#/clubs/${clubId}/events/${eventId}/edit">${t.edit}</a>` : ''}
        </div>
        <div class="card main-card">
          <h2>${event.title}</h2>
          <p class="muted">${club.name} · ${event.location || ''}</p>
          <p>${event.description || ''}</p>
          <p><b>${t.starts}:</b> ${fmt(event.starts_at)} ${event.ends_at ? h`· <b>${t.ends}:</b> ${fmt(event.ends_at)}` : ''}</p>
          <p><b>Тип события:</b> 
            <span class="badge ${event.event_type === 'paid' ? 'badge-paid' : 'badge-free'}">
              ${event.event_type === 'paid' ? 'Платное' : 'Бесплатное'}
            </span>
          </p>
          ${event.event_type === 'paid' ? h`<p><b>Цена:</b> ${formatCurrency(event.price)}</p>` : ''}
          <p><b>${t.registered}:</b> ${event.attendanceCount}</p>
          <div class="action-group primary">
            ${event.isRegistered ? h`
              <button class="btn danger" id="unreg">${t.unregister}</button>
            ` : h`
              <button class="btn" id="reg">${t.register}</button>
            `}
          </div>
        </div>
      `;
      
      const reg = $('reg'), unreg = $('unreg');
      
      if (reg) {
        reg.onclick = async () => {
          try {
            await registerForEvent(eventId);
            showToast(t.registeredForEvent, 'success');
            EventDetail(clubId, eventId);
          } catch (error) {
            // Error already shown by apiCall
          }
        };
      }
      
      if (unreg) {
        unreg.onclick = async () => {
          try {
            await unregisterFromEvent(eventId);
            showToast(t.unregisteredFromEvent, 'success');
            EventDetail(clubId, eventId);
          } catch (error) {
            // Error already shown by apiCall
          }
        };
      }
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки события: ${error.message}</div>`;
    }
  }

  async function EventEdit(clubId, eventId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const event = await getEvent(clubId, eventId);
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === clubId);
      
      if (!club || !event) { go('/clubs'); return; }
      if (club.owner_id !== user.id && user.role !== Roles.ADMIN) { go(`/clubs/${clubId}/events/${eventId}`); return; }
      
      const toInput = ts => ts ? new Date(ts).toISOString().slice(0, 16) : '';
      
      app().innerHTML = h`
        <div class="card main-card error">
          <h2>${t.editEvent} для ${club.name}</h2>
          <form id="f">
            <div class="form-group"><label>${t.eventTitle}</label><input class="input variant-filled" name="title" value="${event.title}" required></div>
            <div class="form-group"><label>${t.eventDescription}</label><textarea class="textarea variant-filled" name="description">${event.description || ''}</textarea></div>
            <div class="form-group"><label>${t.eventLocation}</label><input class="input variant-filled" name="location" value="${event.location || ''}"></div>
            <div class="form-group"><label>${t.startsAt}</label><input type="datetime-local" class="input variant-filled" name="startsAt" value="${toInput(event.starts_at)}" required></div>
            <div class="form-group"><label>${t.endsAt}</label><input type="datetime-local" class="input variant-filled" name="endsAt" value="${toInput(event.ends_at)}"></div>
            <div class="form-group">
              <label>Тип события</label>
              <select name="eventType" class="select" required>
                <option value="free" ${event.event_type === 'free' ? 'selected' : ''}>Бесплатное</option>
                <option value="paid" ${event.event_type === 'paid' ? 'selected' : ''}>Платное</option>
              </select>
            </div>
            <div class="form-group" id="priceGroup" style="display:${event.event_type === 'paid' ? 'block' : 'none'}">
              <label>Цена (₽)</label>
              <input type="number" class="input variant-filled" name="price" min="0" step="0.01" placeholder="0.00" value="${event.price || 0}">
            </div>
            <div class="action-group mixed"><button class="btn">${t.save}</button> <a class="btn tertiary" href="#/clubs/${clubId}/events">${t.cancel}</a></div>
          </form>
        </div>
      `;
      
      // Handle event type change
      const eventTypeSelect = document.querySelector('select[name="eventType"]');
      const priceGroup = document.getElementById('priceGroup');
      const priceInput = document.querySelector('input[name="price"]');
      
      eventTypeSelect.addEventListener('change', function() {
        if (this.value === 'paid') {
          priceGroup.style.display = 'block';
          priceInput.required = true;
        } else {
          priceGroup.style.display = 'none';
          priceInput.required = false;
          priceInput.value = '';
        }
      });
      
      $('f').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        
        // Clear previous alerts
        const existingAlert = e.target.querySelector('.alert');
        if (existingAlert) existingAlert.remove();
        
        // Validation
        const startsAt = Date.parse(data.startsAt);
        const endsAt = data.endsAt ? Date.parse(data.endsAt) : null;
        
        if (startsAt < Date.now()) {
          e.target.insertAdjacentHTML('afterbegin', h`<div class="alert error">${t.eventStartInFuture}</div>`);
          return;
        }
        
        if (endsAt && endsAt <= startsAt) {
          e.target.insertAdjacentHTML('afterbegin', h`<div class="alert error">${t.eventEndAfterStart}</div>`);
          return;
        }
        
        if (data.eventType === 'paid' && (!data.price || parseFloat(data.price) <= 0)) {
          e.target.insertAdjacentHTML('afterbegin', h`<div class="alert error">Для платного события необходимо указать цену больше 0</div>`);
          return;
        }
        
        try {
          await updateEvent(clubId, eventId, {
            title: data.title.trim(),
            description: data.description,
            location: data.location,
            startsAt: startsAt,
            endsAt: endsAt,
            eventType: data.eventType,
            price: data.eventType === 'paid' ? parseFloat(data.price) : 0
          });
          showToast(t.eventUpdated, 'success');
          go(`/clubs/${clubId}/events`);
        } catch (error) {
          // Error already shown by apiCall
        }
      };
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки события: ${error.message}</div>`;
    }
  }

  async function EventPayments(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      console.log('Loading event payments for club:', clubId);
      const events = await getEventPayments(clubId);
      console.log('Event payments data:', events);
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === clubId);
      
      if (!club) { go('/clubs'); return; }
      
      app().innerHTML = h`
        <div class="action-group mixed" style="margin-bottom:12px">
          <a class="btn tertiary" href="#/clubs/${clubId}/events">${t.back}</a>
        </div>
        <div class="card main-card">
          <h2>Управление платежами - ${club.name}</h2>
          ${events.length === 0 ? h`
            <p class="muted">Нет платных событий для управления платежами</p>
          ` : h`
            ${events.map(event => h`
              <div class="card" style="margin-bottom: var(--space-lg);">
                <h3>${event.title}</h3>
                <p><strong>Цена:</strong> ${formatCurrency(event.price)}</p>
                <p><strong>Общая выручка:</strong> ${formatCurrency(event.totalRevenue || 0)}</p>
                <p><strong>Оплатили:</strong> ${event.paidCount || 0} из ${event.attendees ? event.attendees.length : 0}</p>
                <p><strong>Не оплатили:</strong> ${event.unpaidCount || 0}</p>
                
                ${event.unpaidAttendees && event.unpaidAttendees.length > 0 ? h`
                  <h4>Участники без оплаты:</h4>
                  <table class="table">
                    <thead>
                      <tr><th>Имя</th><th>Email</th><th>Действия</th></tr>
                    </thead>
                    <tbody>
                      ${event.unpaidAttendees.map(attendee => h`
                        <tr>
                          <td>${attendee.user_name || 'Неизвестно'}</td>
                          <td>${attendee.user_email || 'Неизвестно'}</td>
                          <td>
                            <button class="btn" data-event-id="${event.id}" data-user-id="${attendee.user_id}" data-amount="${event.price}">
                              Отметить оплату
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : ''}
                
                ${event.payments && event.payments.length > 0 ? h`
                  <h4>Оплатившие участники:</h4>
                  <table class="table">
                    <thead>
                      <tr><th>Имя</th><th>Email</th><th>Сумма</th><th>Дата оплаты</th></tr>
                    </thead>
                    <tbody>
                      ${event.payments.map(payment => h`
                        <tr>
                          <td>${payment.user_name || 'Неизвестно'}</td>
                          <td>${payment.user_email || 'Неизвестно'}</td>
                          <td>${formatCurrency(payment.amount || 0)}</td>
                          <td>${fmt(payment.created_at || payment.paid_at)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : ''}
              </div>
            `).join('')}
          `}
        </div>
      `;
      
      // Add event listeners for payment buttons
      app().querySelectorAll('[data-event-id]').forEach(button => {
        button.onclick = async () => {
          const eventId = button.getAttribute('data-event-id');
          const userId = button.getAttribute('data-user-id');
          const amount = button.getAttribute('data-amount');
          
          try {
            await markEventPayment(eventId, userId, amount);
            showToast('Платеж отмечен', 'success');
            EventPayments(clubId);
          } catch (error) {
            // Error already shown by apiCall
          }
        };
      });
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки платежей: ${error.message}</div>`;
    }
  }

  async function ClubMembers(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const members = await getClubMembers(clubId);
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === clubId);
      
      if (!club) { go('/clubs'); return; }
      
      app().innerHTML = h`
        <div class="actions" style="margin-bottom:12px">
          <a class="btn secondary" href="#/clubs">${t.back}</a>
          ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`<a class="btn" href="#/clubs/${clubId}/members/add">Добавить участника</a>` : ''}
          ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`<a class="btn secondary" href="#/clubs/${clubId}/contributions">Ежемесячные взносы</a>` : ''}
        </div>
        <div class="card">
          <h2>${t.members} - ${club.name}</h2>
          <table class="table">
            <thead><tr><th>${t.name}</th><th>${t.email}</th><th>Статус</th><th>Дата вступления</th><th>Истекает</th><th>${t.actions}</th></tr></thead>
            <tbody>
              ${members.map(m => h`<tr>
                <td>${m.user_name}</td>
                <td>${m.user_email}</td>
                <td>${m.expires_at && new Date(m.expires_at) < new Date() ? t.expired : t.active}</td>
                <td>${fmt(m.joined_at)}</td>
                <td>${m.expires_at ? fmt(m.expires_at) : 'Бессрочно'}</td>
                <td class="actions">
                  ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`
                    <button class="btn danger" data-remove="${m.user_id}">Удалить</button>
                  ` : ''}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      app().querySelectorAll('[data-remove]').forEach(b => b.onclick = async () => {
        const userId = Number(b.getAttribute('data-remove'));
        if (confirm('Удалить участника из клуба?')) {
          try {
            await removeClubMember(clubId, userId);
            showToast('Участник удален', 'success');
            ClubMembers(clubId);
          } catch (error) {
            // Error already shown by apiCall
          }
        }
      });
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки участников: ${error.message}</div>`;
    }
  }

  async function ClubMembersAdd(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const users = await getUsers();
      const members = await getClubMembers(clubId);
      const existingMemberIds = members.map(m => m.user_id);
      const availableUsers = users.filter(u => 
        u.id !== user.id && !existingMemberIds.includes(u.id)
      );
      
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === clubId);
      
      if (!club) { go('/clubs'); return; }
      
      if (club.owner_id !== user.id && user.role !== Roles.ADMIN) {
        showToast('Только владелец клуба или администратор могут добавлять участников.', 'error');
        go(`/clubs/${clubId}/members`);
        return;
      }
      
      if (availableUsers.length === 0) {
        showToast('Нет доступных пользователей для добавления', 'warning');
        go(`/clubs/${clubId}/members`);
        return;
      }
      
      app().innerHTML = h`
        <div class="card main-card">
          <h2>Добавить участника в ${club.name}</h2>
          <form id="f">
            <div class="form-group">
              <label>Выберите пользователя</label>
              <select name="userId" class="select" required>
                <option value="">Выберите пользователя...</option>
                ${availableUsers.map(u => h`<option value="${u.id}">${u.name} (${u.email})</option>`).join('')}
              </select>
            </div>
            <div class="action-group mixed">
              <button class="btn">Добавить</button>
              <a class="btn tertiary" href="#/clubs/${clubId}/members">${t.cancel}</a>
            </div>
          </form>
        </div>
      `;
      
      $('f').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const userId = Number(data.userId);
        
        try {
          await addClubMember(clubId, userId);
          showToast('Участник успешно добавлен', 'success');
          ClubMembers(clubId);
        } catch (error) {
          // Error already shown by apiCall
        }
      };
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки пользователей: ${error.message}</div>`;
    }
  }

  async function ClubFinances(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const finances = await getClubFinances(clubId);
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === clubId);
      
      if (!club) { go('/clubs'); return; }
      
      app().innerHTML = h`
        <div class="actions" style="margin-bottom:12px">
          <a class="btn secondary" href="#/clubs">${t.back}</a>
          ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`
            <a class="btn" href="#/clubs/${clubId}/finances/add-income">${t.addIncome}</a>
            <a class="btn secondary" href="#/clubs/${clubId}/finances/add-expense">${t.addExpense}</a>
          ` : ''}
        </div>
        <div class="card">
          <h2>${t.finances} - ${club.name}</h2>
          <div class="row">
            <div class="col">
              <h3>${t.balance}: ${formatCurrency(finances.balance)}</h3>
              <p>Общий доход: ${formatCurrency(finances.totalIncome)}</p>
              <p>Общие расходы: ${formatCurrency(finances.totalExpenses)}</p>
            </div>
          </div>
          
          <h3>${t.income}</h3>
          <table class="table">
            <thead><tr><th>Участник</th><th>${t.amount}</th><th>${t.paymentDate}</th><th>${t.paymentStatus}</th></tr></thead>
            <tbody>
              ${finances.payments.map(p => h`<tr>
                <td>${p.user_id ? 'Пользователь' : 'Система'}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${fmt(p.paid_at)}</td>
                <td>${t.paid}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          
          <h3>${t.expenses}</h3>
          <table class="table">
            <thead><tr><th>Описание</th><th>${t.amount}</th><th>Дата</th></tr></thead>
            <tbody>
              ${finances.finances.filter(f => f.type === 'expense').map(f => h`<tr>
                <td>${f.description}</td>
                <td>${formatCurrency(f.amount)}</td>
                <td>${fmt(f.date)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки финансов: ${error.message}</div>`;
    }
  }

  function AddIncome(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    app().innerHTML = h`
      <div class="card main-card info">
        <h2>${t.addIncome}</h2>
        <form id="f">
          <div class="form-group"><label>${t.amount}</label><input type="number" class="input variant-outline" name="amount" step="0.01" min="0" required></div>
          <div class="form-group"><label>Описание</label><input class="input variant-outline" name="description" placeholder="Описание дохода"></div>
          <div class="action-group mixed"><button class="btn">Добавить</button> <a class="btn tertiary" href="#/clubs/${clubId}/finances">${t.cancel}</a></div>
        </form>
      </div>
    `;
    
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      
      try {
        await addIncome(clubId, {
          amount: parseFloat(data.amount),
          description: data.description
        });
        showToast('Доход добавлен', 'success');
        go(`/clubs/${clubId}/finances`);
      } catch (error) {
        // Error already shown by apiCall
      }
    };
  }

  function AddExpense(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    app().innerHTML = h`
      <div class="card main-card warning">
        <h2>${t.addExpense}</h2>
        <form id="f">
          <div class="form-group"><label>${t.amount}</label><input type="number" class="input variant-outline" name="amount" step="0.01" min="0" required></div>
          <div class="form-group"><label>Описание</label><input class="input variant-outline" name="description" placeholder="Описание расхода" required></div>
          <div class="form-group"><label>Дата</label><input type="date" class="input variant-outline" name="date" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="action-group mixed"><button class="btn">Добавить</button> <a class="btn tertiary" href="#/clubs/${clubId}/finances">${t.cancel}</a></div>
        </form>
      </div>
    `;
    
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      
      try {
        await addExpense(clubId, {
          amount: parseFloat(data.amount),
          description: data.description,
          date: new Date(data.date).getTime()
        });
        showToast('Расход добавлен', 'success');
        go(`/clubs/${clubId}/finances`);
      } catch (error) {
        // Error already shown by apiCall
      }
    };
  }

  async function ClubSchedule(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const schedules = await getClubSchedules(clubId);
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === clubId);
      
      if (!club) { go('/clubs'); return; }
      
      app().innerHTML = h`
        <div class="action-group mixed" style="margin-bottom:12px">
          <a class="btn tertiary" href="#/clubs">${t.back}</a>
          ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`<a class="btn" href="#/clubs/${clubId}/schedule/add">Добавить расписание</a>` : ''}
        </div>
        <div class="card main-card">
          <h2>${t.schedule} - ${club.name}</h2>
          ${schedules.length === 0 ? h`
            <p class="muted">Расписание не настроено</p>
          ` : h`
            <table class="table">
              <thead><tr><th>День недели</th><th>Время</th><th>Продолжительность</th><th>Описание</th><th>${t.actions}</th></tr></thead>
              <tbody>
                ${schedules.map(s => h`<tr>
                  <td>${getDayName(s.day_of_week)}</td>
                  <td>${s.time}</td>
                  <td>${s.duration} мин</td>
                  <td>${s.description || ''}</td>
                  <td class="actions">
                    ${(user.id === club.owner_id || user.role === Roles.ADMIN) ? h`
                      <button class="btn danger" data-delete="${s.id}">Удалить</button>
                    ` : ''}
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      `;
      
      app().querySelectorAll('[data-delete]').forEach(b => b.onclick = async () => {
        const scheduleId = Number(b.getAttribute('data-delete'));
        if (confirm('Удалить запись расписания?')) {
          try {
            await deleteSchedule(scheduleId);
            showToast('Запись расписания удалена', 'success');
            ClubSchedule(clubId);
          } catch (error) {
            // Error already shown by apiCall
          }
        }
      });
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки расписания: ${error.message}</div>`;
    }
  }

  function AddSchedule(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    app().innerHTML = h`
      <div class="card main-card featured">
        <h2>Добавить расписание</h2>
        <form id="f">
          <div class="form-group">
            <label>${t.dayOfWeek}</label>
            <select name="dayOfWeek" class="select" required>
              <option value="">Выберите день</option>
              <option value="1">${t.monday}</option>
              <option value="2">${t.tuesday}</option>
              <option value="3">${t.wednesday}</option>
              <option value="4">${t.thursday}</option>
              <option value="5">${t.friday}</option>
              <option value="6">${t.saturday}</option>
              <option value="0">${t.sunday}</option>
            </select>
          </div>
          <div class="form-group"><label>${t.time}</label><input type="time" class="input variant-outline" name="time" required></div>
          <div class="form-group"><label>${t.duration} (минуты)</label><input type="number" class="input variant-outline" name="duration" min="1" required></div>
          <div class="form-group"><label>Описание</label><input class="input variant-outline" name="description" placeholder="Описание занятия"></div>
          <div class="action-group mixed"><button class="btn">Добавить</button> <a class="btn tertiary" href="#/clubs/${clubId}/schedule">${t.cancel}</a></div>
        </form>
      </div>
    `;
    
    $('f').onsubmit = async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      
      try {
        await addSchedule(clubId, {
          dayOfWeek: parseInt(data.dayOfWeek),
          time: data.time,
          duration: parseInt(data.duration),
          description: data.description
        });
        showToast('Расписание добавлено', 'success');
        go(`/clubs/${clubId}/schedule`);
      } catch (error) {
        // Error already shown by apiCall
      }
    };
  }

  async function Contributions(clubId) {
    const user = me();
    if (!user) { go('/login'); return; }
    
    try {
      const data = await getContributions(clubId);
      const clubs = await getClubs();
      const club = clubs.find(c => c.id === clubId);
      
      if (!club) { go('/clubs'); return; }
      
      app().innerHTML = h`
        <div class="action-group mixed" style="margin-bottom:12px">
          <a class="btn tertiary" href="#/clubs/${clubId}/members">${t.back}</a>
          <button class="btn" id="createContributionsBtn" data-club-id="${clubId}">Создать взносы на ${data.currentMonth}</button>
        </div>
        <div class="card main-card">
          <h2>Ежемесячные взносы - ${club.name}</h2>
          <p><strong>Месяц:</strong> ${data.currentMonth}</p>
          <p><strong>Размер взноса:</strong> ${formatCurrency(club.membership_fee || 0)}</p>
          
          ${data.contributions.length === 0 ? h`
            <p class="muted">Взносы на этот месяц еще не созданы</p>
          ` : h`
            <table class="table">
              <thead><tr><th>Участник</th><th>Email</th><th>Сумма</th><th>Статус</th><th>${t.actions}</th></tr></thead>
              <tbody>
                ${data.contributions.map(c => h`<tr>
                  <td>${c.user_name}</td>
                  <td>${c.user_email}</td>
                  <td>${formatCurrency(c.amount)}</td>
                  <td>
                    <span class="badge ${c.status === 'paid' ? 'badge-free' : 'badge-paid'}">
                      ${c.status === 'paid' ? 'Оплачено' : 'Ожидает'}
                    </span>
                  </td>
                  <td class="actions">
                    ${c.status === 'pending' ? h`
                      <button class="btn mark-paid-btn" data-contribution-id="${c.id}">Отметить оплату</button>
                    ` : ''}
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          `}
        </div>
      `;
      
      // Add event listeners
      const createBtn = document.getElementById('createContributionsBtn');
      if (createBtn) {
        createBtn.onclick = async () => {
          try {
            await createContributions(clubId);
            showToast('Взносы созданы', 'success');
            Contributions(clubId);
          } catch (error) {
            // Error already shown by apiCall
          }
        };
      }
      
      app().querySelectorAll('.mark-paid-btn').forEach(btn => {
        btn.onclick = async () => {
          const contributionId = Number(btn.getAttribute('data-contribution-id'));
          try {
            await markContributionAsPaid(contributionId);
            showToast('Взнос отмечен как оплаченный', 'success');
            Contributions(clubId);
          } catch (error) {
            // Error already shown by apiCall
          }
        };
      });
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки взносов: ${error.message}</div>`;
    }
  }

  async function Admin() {
    const user = me();
    if (!user || user.role !== Roles.ADMIN) { go('/'); return; }
    
    try {
      const users = await getUsers();
      
      app().innerHTML = h`
        <div class="card main-card">
          <h2>Пользователи</h2>
          <table class="table">
            <thead><tr><th>${t.name}</th><th>${t.email}</th><th>Роль</th><th>${t.actions}</th></tr></thead>
            <tbody>
              ${users.map(u => h`<tr>
                <td>${u.name}</td><td>${u.email}</td><td>${u.role}</td>
                <td class="actions">
                  <div class="action-group mixed">
                    <select data-role="${u.id}" class="select">
                      ${[Roles.ADMIN, Roles.ORGANIZER, Roles.MEMBER].map(r => h`<option value="${r}" ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
                    </select>
                    <button class="btn flat" data-update="${u.id}">Обновить</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      app().querySelectorAll('[data-update]').forEach(b => b.onclick = async () => {
        const id = Number(b.getAttribute('data-update'));
        const sel = app().querySelector(`[data-role="${id}"]`);
        const role = sel.value;
        
        try {
          await updateUserRole(id, role);
          showToast(h`${t.roleUpdated} на ${role}`, 'success');
          Admin();
        } catch (error) {
          // Error already shown by apiCall
        }
      });
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки пользователей: ${error.message}</div>`;
    }
  }

  async function Statistics() {
    const user = me();
    if (!user) { go('/login'); return; }
    
    if (user.role !== Roles.ADMIN) {
      showToast('Доступ ограничен. Статистика доступна только администраторам.', 'error');
      Clubs();
      return;
    }
    
    try {
      const stats = await getStatistics();
      
      app().innerHTML = h`
        <div class="action-group primary" style="margin-bottom:12px">
          <button class="btn" onclick="exportStatisticsToExcel()">Экспорт статистики в Excel</button>
        </div>
        
        <div class="card main-card">
          <h2>Общая статистика приложения</h2>
          <div class="row">
            <div class="col">
              <h3>Основные показатели</h3>
              <p><strong>Общее количество клубов:</strong> ${stats.totalClubs}</p>
              <p><strong>Общее количество пользователей:</strong> ${stats.totalUsers}</p>
              <p><strong>Общее количество событий:</strong> ${stats.totalEvents}</p>
              <p><strong>Общее количество участников:</strong> ${stats.totalMemberships}</p>
            </div>
            <div class="col">
              <h3>Финансовые показатели</h3>
              <p><strong>Общий доход:</strong> ${formatCurrency(stats.totalIncome)}</p>
              <p><strong>Общие расходы:</strong> ${formatCurrency(stats.totalExpenses)}</p>
              <p><strong>Общий баланс:</strong> ${formatCurrency(stats.totalIncome - stats.totalExpenses)}</p>
            </div>
          </div>
          
          <h3>Распределение клубов по владельцам</h3>
          <table class="table">
            <thead><tr><th>Владелец</th><th>Количество клубов</th></tr></thead>
            <tbody>
              ${stats.clubsByOwner.map(c => h`<tr>
                <td>${c.owner_name}</td>
                <td>${c.club_count}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          
          <h3>События по месяцам</h3>
          <table class="table">
            <thead><tr><th>Месяц</th><th>Количество событий</th></tr></thead>
            <tbody>
              ${stats.eventsByMonth.map(e => h`<tr>
                <td>${e.month}</td>
                <td>${e.count}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          
          <h3>Доходы по месяцам</h3>
          <table class="table">
            <thead><tr><th>Месяц</th><th>Сумма доходов</th></tr></thead>
            <tbody>
              ${stats.paymentsByMonth.map(p => h`<tr>
                <td>${p.month}</td>
                <td>${formatCurrency(p.total)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      // Add global function
      window.exportStatisticsToExcel = exportStatisticsToExcel;
      
    } catch (error) {
      app().innerHTML = h`<div class="alert error">Ошибка загрузки статистики: ${error.message}</div>`;
    }
  }

  // Helper function for day names
  function getDayName(dayNumber) {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[dayNumber] || 'Неизвестно';
  }

  // Routes
  const routes = {
    '/': Home,
    '/register': Register,
    '/login': Login,
    '/clubs': Clubs,
    '/clubs/create': ClubCreate,
    '/clubs/:id/edit': ClubEdit,
    '/clubs/:id/events': Events,
    '/clubs/:id/events/create': EventCreate,
    '/clubs/:id/events/:eid': EventDetail,
    '/clubs/:id/events/:eid/edit': EventEdit,
    '/clubs/:id/events/payments': EventPayments,
    '/clubs/:id/members': ClubMembers,
    '/clubs/:id/members/add': ClubMembersAdd,
    '/clubs/:id/finances': ClubFinances,
    '/clubs/:id/finances/add-income': AddIncome,
    '/clubs/:id/finances/add-expense': AddExpense,
    '/clubs/:id/schedule': ClubSchedule,
    '/clubs/:id/schedule/add': AddSchedule,
    '/clubs/:id/contributions': Contributions,
    '/statistics': Statistics,
    '/admin': Admin,
  };

  function dispatch() {
    setNav();
    const p = parts();
    if (p.length === 0) return routes['/']();
    const key = '/' + p.join('/');
    if (routes[key]) return routes[key]();
    if (p[0] === 'clubs' && p.length === 2 && p[1] === 'create') return routes['/clubs/create']();
    if (p[0] === 'clubs' && p.length === 2) return routes['/clubs']();
    if (p[0] === 'clubs' && p.length === 3 && p[2] === 'edit') return routes['/clubs/:id/edit'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 3 && p[2] === 'events') return routes['/clubs/:id/events'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 4 && p[2] === 'events' && p[3] === 'create') return routes['/clubs/:id/events/create'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 4 && p[2] === 'events' && p[3] === 'payments') return routes['/clubs/:id/events/payments'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 4 && p[2] === 'events') return routes['/clubs/:id/events/:eid'](Number(p[1]), Number(p[3]));
    if (p[0] === 'clubs' && p.length === 5 && p[2] === 'events' && p[4] === 'edit') return routes['/clubs/:id/events/:eid/edit'](Number(p[1]), Number(p[3]));
    if (p[0] === 'clubs' && p.length === 3 && p[2] === 'members') return routes['/clubs/:id/members'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 4 && p[2] === 'members' && p[3] === 'add') return routes['/clubs/:id/members/add'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 3 && p[2] === 'finances') return routes['/clubs/:id/finances'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 4 && p[2] === 'finances' && p[3] === 'add-income') return routes['/clubs/:id/finances/add-income'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 4 && p[2] === 'finances' && p[3] === 'add-expense') return routes['/clubs/:id/finances/add-expense'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 3 && p[2] === 'schedule') return routes['/clubs/:id/schedule'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 4 && p[2] === 'schedule' && p[3] === 'add') return routes['/clubs/:id/schedule/add'](Number(p[1]));
    if (p[0] === 'clubs' && p.length === 3 && p[2] === 'contributions') return routes['/clubs/:id/contributions'](Number(p[1]));
    if (p[0] === 'statistics') return routes['/statistics']();
    if (p[0] === 'admin') return routes['/admin']();
    routes['/']();
  }

  // Initialize
  initUser();
  initTheme();
  setNav();
  window.addEventListener('hashchange', dispatch);
  dispatch();
})();