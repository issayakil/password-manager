/**
 * MyPass - Password Manager
 * Simple and minimal implementation
 */

import database from './database.js';
import sessionManager from './patterns/Singleton.js';
import { PasswordBuilder, PasswordDirector, PasswordStrengthAnalyzer } from './patterns/Builder.js';
import { securityMonitor, ToastObserver } from './patterns/Observer.js';
import { SensitiveDataProxy } from './patterns/Proxy.js';
import { PasswordRecoveryManager, SecurityQuestions } from './patterns/ChainOfResponsibility.js';
import { uiMediator } from './patterns/Mediator.js';
import vaultManager from './models/VaultManager.js';
import { detectCardBrand } from './models/VaultItem.js';

// State
let currentCategory = 'all';
let currentItemId = null;

// Initialize app
async function init() {
    await database.init();
    setupEventListeners();
    setupActivityTracking();
    populateSecurityQuestions();
}

function setupEventListeners() {
    // Auth form toggles
    document.querySelectorAll('[data-show]').forEach(el => {
        el.onclick = (e) => {
            e.preventDefault();
            showAuthForm(el.dataset.show);
        };
    });

    // Forms
    document.getElementById('login-form').onsubmit = handleLogin;
    document.getElementById('register-form').onsubmit = handleRegister;
    document.getElementById('recovery-form').onsubmit = handleRecovery;
    document.getElementById('unlock-form').onsubmit = handleUnlock;
    document.getElementById('item-form').onsubmit = handleSaveItem;
    document.getElementById('settings-form').onsubmit = handleSaveSettings;

    // Password strength
    document.getElementById('reg-password').oninput = (e) => {
        showStrength(e.target.value, 'password-strength');
    };

    // Sidebar categories
    document.querySelectorAll('[data-category]').forEach(el => {
        el.onclick = () => selectCategory(el.dataset.category);
    });

    // Add buttons
    document.querySelectorAll('[data-add]').forEach(el => {
        el.onclick = () => openItemModal(el.dataset.add);
    });

    // Modal close
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(el => {
        el.onclick = closeModals;
    });

    // Settings & Logout
    document.getElementById('settings-btn').onclick = openSettings;
    document.getElementById('logout-btn').onclick = handleLogout;

    // Search
    document.getElementById('search-input').oninput = (e) => renderList();

    // Recovery start
    document.getElementById('start-recovery').onclick = startRecovery;

    // Password generator
    document.getElementById('gen-btn').onclick = generatePassword;
    document.getElementById('use-gen-btn').onclick = useGeneratedPassword;
    document.getElementById('gen-length').oninput = (e) => {
        document.getElementById('length-val').textContent = e.target.value;
        generatePassword();
    };
    document.querySelectorAll('#gen-modal input[type="checkbox"]').forEach(el => {
        el.onchange = generatePassword;
    });

    // Session lock
    window.addEventListener('session-locked', showLockScreen);

    // Mediator events
    uiMediator.on('toast', showToast);
    uiMediator.on('refresh', refresh);

    // Observer Pattern - Create ConcreteObserver and register with Subject
    const toastObserver = new ToastObserver(securityMonitor);
    toastObserver.setNotificationHandler((notification) => {
        showToast(notification.message, notification.severity);
    });
}

function setupActivityTracking() {
    ['mousemove', 'keydown', 'click'].forEach(event => {
        document.addEventListener(event, () => {
            if (sessionManager.checkAuth()) sessionManager.updateActivity();
        }, { passive: true });
    });
}

function populateSecurityQuestions() {
    const selects = document.querySelectorAll('.sec-q');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Select question...</option>' +
            SecurityQuestions.map(q => `<option value="${q}">${q}</option>`).join('');
        
        // Add change handler to prevent duplicate selections
        select.onchange = () => updateSecurityQuestionOptions();
    });
}

function updateSecurityQuestionOptions() {
    const selects = document.querySelectorAll('.sec-q');
    const selectedValues = Array.from(selects).map(s => s.value).filter(v => v);
    
    selects.forEach(select => {
        const currentValue = select.value;
        Array.from(select.options).forEach(option => {
            if (option.value && option.value !== currentValue) {
                // Disable if selected in another dropdown
                option.disabled = selectedValues.includes(option.value);
            }
        });
    });
}

// Auth handlers
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await sessionManager.login(email, password);
        showApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-confirm').value;

    if (password !== confirmPass) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const strength = PasswordStrengthAnalyzer.analyze(password);
    if (strength.level === 'weak') {
        if (!window.confirm('Password is weak. Continue anyway?')) return;
    }

    const questions = [];
    const selectedQuestions = new Set();
    
    for (let i = 1; i <= 3; i++) {
        const q = document.getElementById(`q${i}`).value;
        const a = document.getElementById(`a${i}`).value.trim();
        
        if (!q || !a) {
            showToast(`Complete security question ${i}`, 'error');
            return;
        }
        
        // Check for duplicate questions
        if (selectedQuestions.has(q)) {
            showToast('Each security question must be unique', 'error');
            return;
        }
        selectedQuestions.add(q);
        
        // Store with normalized answer (will be hashed in sessionManager)
        questions.push({ question: q, answer: a });
    }

    try {
        await sessionManager.register(email, password, questions);
        showToast('Account created! Please login.', 'success');
        showAuthForm('login');
        document.getElementById('login-email').value = email;
        // Reset registration form
        document.getElementById('register-form').reset();
        updateSecurityQuestionOptions();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

const recoveryManager = new PasswordRecoveryManager();
let recoveryEmail = '';

// Set the hash function for recovery manager (same as used in sessionManager)
recoveryManager.setHashFunction((str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return btoa(hash.toString() + str.length + 'mypass_salt');
});

function startRecovery() {
    recoveryEmail = document.getElementById('recovery-email').value.trim();
    if (!recoveryEmail) {
        showToast('Enter your email', 'error');
        return;
    }

    sessionManager.getUserForRecovery(recoveryEmail).then(user => {
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        try {
            // Initialize chain with user's security questions (answers are hashed)
            const questions = recoveryManager.initialize(user.securityQuestions);
            const container = document.getElementById('recovery-questions');
            container.innerHTML = questions.map((q, i) => `
                <div class="form-group">
                    <label>${q.question}</label>
                    <input type="text" class="rec-answer" data-idx="${i}" required>
                </div>
            `).join('');
            container.classList.remove('hidden');
            document.getElementById('start-recovery').classList.add('hidden');
            document.getElementById('verify-recovery').classList.remove('hidden');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function handleRecovery(e) {
    e.preventDefault();
    
    // If questions haven't been loaded yet, trigger startRecovery instead
    const questionsContainer = document.getElementById('recovery-questions');
    if (questionsContainer.classList.contains('hidden')) {
        startRecovery();
        return;
    }
    
    const answers = Array.from(document.querySelectorAll('.rec-answer'))
        .map(el => el.value);

    // Verify through Chain of Responsibility pattern
    const result = recoveryManager.verify(answers);
    if (result.success) {
        showNewPasswordForm();
    } else {
        showToast(result.message, 'error');
    }
}

function showNewPasswordForm() {
    document.getElementById('recovery-questions').innerHTML = `
        <div class="form-group">
            <label>New Password</label>
            <input type="password" id="new-pass" required>
        </div>
        <div class="form-group">
            <label>Confirm Password</label>
            <input type="password" id="new-pass-confirm" required>
        </div>
    `;
    document.getElementById('verify-recovery').textContent = 'Reset Password';
    document.getElementById('recovery-form').onsubmit = handlePasswordReset;
}

async function handlePasswordReset(e) {
    e.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('new-pass-confirm').value;
    
    if (newPass !== confirmPass) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        await sessionManager.updatePassword(recoveryEmail, newPass);
        showToast('Password reset! Please login.', 'success');
        showAuthForm('login');
        document.getElementById('login-email').value = recoveryEmail;
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleUnlock(e) {
    e.preventDefault();
    const password = document.getElementById('unlock-password').value;
    try {
        await sessionManager.unlock(password);
        document.getElementById('lock-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function handleLogout() {
    sessionManager.logout();
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
    showAuthForm('login');
}

// UI navigation
function showAuthForm(form) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
    document.getElementById(`${form}-form`).classList.remove('hidden');
    
    // Reset recovery form when switching away
    if (form !== 'recovery') {
        resetRecoveryForm();
    }
}

function resetRecoveryForm() {
    recoveryManager.reset();
    recoveryEmail = '';
    document.getElementById('recovery-email').value = '';
    document.getElementById('recovery-questions').innerHTML = '';
    document.getElementById('recovery-questions').classList.add('hidden');
    document.getElementById('start-recovery').classList.remove('hidden');
    document.getElementById('verify-recovery').classList.add('hidden');
    document.getElementById('verify-recovery').textContent = 'Verify';
    // Reset the form submit handler
    document.getElementById('recovery-form').onsubmit = handleRecovery;
}

async function showApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    await refresh();
}

function showLockScreen() {
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('lock-screen').classList.remove('hidden');
}

async function refresh() {
    await updateCounts();
    await renderList();
    await vaultManager.checkSecurity();
}

async function updateCounts() {
    const counts = await vaultManager.getCounts();
    document.getElementById('cnt-all').textContent = counts.all;
    document.getElementById('cnt-logins').textContent = counts.logins;
    document.getElementById('cnt-cards').textContent = counts.cards;
    document.getElementById('cnt-identities').textContent = counts.identities;
    document.getElementById('cnt-notes').textContent = counts.notes;
}

function selectCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('[data-category]').forEach(el => {
        el.classList.toggle('active', el.dataset.category === cat);
    });
    renderList();
    hideDetail();
}

async function renderList() {
    const container = document.getElementById('vault-list');
    let items = await vaultManager.getAllItems();

    if (currentCategory !== 'all') {
        const typeMap = { logins: 'login', cards: 'card', identities: 'identity', notes: 'note' };
        items = items.filter(i => i.type === typeMap[currentCategory]);
    }

    const query = document.getElementById('search-input').value.toLowerCase();
    if (query) {
        items = items.filter(i => 
            i.name?.toLowerCase().includes(query) ||
            i.username?.toLowerCase().includes(query) ||
            i.url?.toLowerCase().includes(query)
        );
    }

    if (!items.length) {
        container.innerHTML = '<div class="empty">No items</div>';
        return;
    }

    const icons = { login: '🔐', card: '💳', identity: '👤', note: '📝' };
    container.innerHTML = items.map(item => `
        <div class="vault-item ${item.id === currentItemId ? 'selected' : ''}" onclick="selectItem('${item.id}')">
            <span class="item-icon">${icons[item.type]}</span>
            <div class="item-info">
                <div class="item-name">${esc(item.name || 'Untitled')}</div>
                <div class="item-meta">${getItemMeta(item)}</div>
            </div>
        </div>
    `).join('');
}

function getItemMeta(item) {
    switch (item.type) {
        case 'login': return esc(item.username || item.url || '');
        case 'card': return item.cardNumber ? '•••• ' + item.cardNumber.slice(-4) : '';
        case 'identity': return esc(item.email || '');
        default: return '';
    }
}

window.selectItem = async function(id) {
    currentItemId = id;
    renderList();
    showDetail(await vaultManager.getItemById(id));
};

function showDetail(item) {
    if (!item) return;
    const container = document.getElementById('item-detail');
    container.classList.remove('hidden');
    
    const icons = { login: '🔐', card: '💳', identity: '👤', note: '📝' };
    let html = `
        <div class="detail-header">
            <span class="detail-icon">${icons[item.type]}</span>
            <h2>${esc(item.name)}</h2>
            <div class="detail-actions">
                <button class="btn-icon" onclick="editItem('${item.id}')" title="Edit">✏️</button>
                <button class="btn-icon" onclick="deleteItem('${item.id}')" title="Delete">🗑️</button>
            </div>
        </div>
        <div class="detail-content">
    `;

    switch (item.type) {
        case 'login':
            html += maskedField('Username', item.username, 'username');
            html += maskedField('Password', item.password, 'password');
            if (item.url) html += copyField('URL', item.url);
            break;
        case 'card':
            if (item.cardholderName) html += field('Cardholder', item.cardholderName);
            html += maskedField('Card Number', item.cardNumber, 'creditCard');
            if (item.expiryMonth && item.expiryYear) html += field('Expiry', `${item.expiryMonth}/${item.expiryYear}`);
            html += maskedField('CVV', item.cvv, 'cvv');
            break;
        case 'identity':
            const name = [item.firstName, item.lastName].filter(Boolean).join(' ');
            if (name) html += field('Name', name);
            if (item.email) html += field('Email', item.email);
            if (item.phone) html += field('Phone', item.phone);
            if (item.ssn) html += maskedField('SSN', item.ssn, 'ssn');
            if (item.passportNumber) html += maskedField('Passport', item.passportNumber, 'passport');
            if (item.licenseNumber) html += maskedField('License', item.licenseNumber, 'license');
            break;
        case 'note':
            html += maskedField('Content', item.content, 'password');
            break;
    }

    if (item.notes && item.type !== 'note') {
        html += `<div class="field"><label>Notes</label><div>${esc(item.notes)}</div></div>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

function field(label, value) {
    return `<div class="field"><label>${label}</label><div>${esc(value)}</div></div>`;
}

function copyField(label, value) {
    return `
        <div class="field">
            <label>${label}</label>
            <div class="field-row">
                <span>${esc(value)}</span>
                <button class="btn-icon" onclick="copyValue('${esc(value)}', '${label}')" title="Copy">📋</button>
            </div>
        </div>
    `;
}

function maskedField(label, value, type) {
    if (!value) return '';
    const proxy = new SensitiveDataProxy(value, type);
    const id = 'f' + Math.random().toString(36).substr(2);
    return `
        <div class="field" id="${id}">
            <label>${label}</label>
            <div class="field-row">
                <span class="masked-val" data-real="${esc(value)}" data-masked="true">${esc(proxy.getMaskedValue())}</span>
                <button class="btn-icon" onclick="toggleMask('${id}')" title="Show">👁</button>
                <button class="btn-icon" onclick="copyValue('${esc(value)}', '${label}')" title="Copy">📋</button>
            </div>
        </div>
    `;
}

window.toggleMask = function(id) {
    const el = document.querySelector(`#${id} .masked-val`);
    const isMasked = el.dataset.masked === 'true';
    el.textContent = isMasked ? el.dataset.real : new SensitiveDataProxy(el.dataset.real, 'password').getMaskedValue();
    el.dataset.masked = !isMasked;
};

window.copyValue = function(value, label) {
    sessionManager.copyToClipboard(value);
    showToast(`${label} copied`, 'success');
};

function hideDetail() {
    currentItemId = null;
    document.getElementById('item-detail').classList.add('hidden');
}

// Item CRUD
let editingId = null;

window.editItem = async function(id) {
    const item = await vaultManager.getItemById(id);
    openItemModal(item.type, item);
};

window.deleteItem = async function(id) {
    if (confirm('Delete this item?')) {
        await vaultManager.deleteItem(id);
        hideDetail();
        refresh();
        showToast('Item deleted', 'success');
    }
};

function openItemModal(type, item = null) {
    editingId = item?.id || null;
    document.getElementById('modal-title').textContent = item ? 'Edit Item' : 'Add Item';
    document.getElementById('item-fields').innerHTML = getFormFields(type, item);
    document.getElementById('item-form').dataset.type = type;
    document.getElementById('item-modal').classList.remove('hidden');
}

function getFormFields(type, item = null) {
    const v = (f) => esc(item?.[f] || '');
    let html = `<div class="form-group"><label>Name</label><input name="name" value="${v('name')}" required></div>`;

    switch (type) {
        case 'login':
            html += `
                <div class="form-group"><label>Username</label><input name="username" value="${v('username')}"></div>
                <div class="form-group">
                    <label>Password</label>
                    <div class="input-row">
                        <input type="password" name="password" value="${v('password')}">
                        <button type="button" class="btn-sm" onclick="openGenerator()">Generate</button>
                    </div>
                </div>
                <div class="form-group"><label>URL</label><input name="url" value="${v('url')}" placeholder="https://"></div>
            `;
            break;
        case 'card':
            html += `
                <div class="form-group"><label>Cardholder Name</label><input name="cardholderName" value="${v('cardholderName')}"></div>
                <div class="form-group"><label>Card Number</label><input name="cardNumber" value="${v('cardNumber')}" maxlength="19"></div>
                <div class="form-row">
                    <div class="form-group"><label>Expiry Month</label>
                        <select name="expiryMonth">${Array.from({length:12}, (_,i) => {
                            const m = String(i+1).padStart(2,'0');
                            return `<option value="${m}" ${item?.expiryMonth==m?'selected':''}>${m}</option>`;
                        }).join('')}</select>
                    </div>
                    <div class="form-group"><label>Expiry Year</label>
                        <select name="expiryYear">${Array.from({length:15}, (_,i) => {
                            const y = new Date().getFullYear() + i;
                            return `<option value="${y}" ${item?.expiryYear==y?'selected':''}>${y}</option>`;
                        }).join('')}</select>
                    </div>
                </div>
                <div class="form-group"><label>CVV</label><input type="password" name="cvv" value="${v('cvv')}" maxlength="4"></div>
            `;
            break;
        case 'identity':
            html += `
                <div class="form-row">
                    <div class="form-group"><label>First Name</label><input name="firstName" value="${v('firstName')}"></div>
                    <div class="form-group"><label>Last Name</label><input name="lastName" value="${v('lastName')}"></div>
                </div>
                <div class="form-group"><label>Email</label><input type="text" name="email" value="${v('email')}"></div>
                <div class="form-group"><label>Phone</label><input name="phone" value="${v('phone')}"></div>
                <div class="form-group"><label>SSN</label><input type="password" name="ssn" value="${v('ssn')}" placeholder="XXX-XX-XXXX"></div>
                <div class="form-row">
                    <div class="form-group"><label>Passport Number</label><input type="password" name="passportNumber" value="${v('passportNumber')}"></div>
                    <div class="form-group"><label>Passport Expiry</label><input type="date" name="passportExpiry" value="${v('passportExpiry')}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>License Number</label><input type="password" name="licenseNumber" value="${v('licenseNumber')}"></div>
                    <div class="form-group"><label>License Expiry</label><input type="date" name="licenseExpiry" value="${v('licenseExpiry')}"></div>
                </div>
            `;
            break;
        case 'note':
            html += `<div class="form-group"><label>Content</label><textarea name="content" rows="8">${v('content')}</textarea></div>`;
            break;
    }

    if (type !== 'note') {
        html += `<div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${v('notes')}</textarea></div>`;
    }

    return html;
}

async function handleSaveItem(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.dataset.type;
    const data = Object.fromEntries(new FormData(form));

    try {
        if (editingId) {
            await vaultManager.updateItem(editingId, data);
            showDetail(await vaultManager.getItemById(editingId));
        } else {
            const item = await vaultManager.createItem(type, data);
            currentItemId = item.id;
            showDetail(item);
        }
        closeModals();
        refresh();
        showToast(editingId ? 'Updated' : 'Created', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Password Generator - Using Builder Pattern with Director
const builder = new PasswordBuilder();
const director = new PasswordDirector();
director.setBuilder(builder);

window.openGenerator = function() {
    document.getElementById('gen-modal').classList.remove('hidden');
    generatePassword();
};

function generatePassword() {
    // Director.Construct() - orchestrates the building process
    const password = director.construct({
        length: parseInt(document.getElementById('gen-length').value),
        uppercase: document.getElementById('gen-upper').checked,
        lowercase: document.getElementById('gen-lower').checked,
        numbers: document.getElementById('gen-nums').checked,
        symbols: document.getElementById('gen-symbols').checked
    });

    document.getElementById('gen-output').value = password;
    showStrength(password, 'gen-strength');
}

function useGeneratedPassword() {
    const password = document.getElementById('gen-output').value;
    const field = document.querySelector('[name="password"]');
    if (field) field.value = password;
    document.getElementById('gen-modal').classList.add('hidden');
}

function showStrength(password, containerId) {
    const result = PasswordStrengthAnalyzer.analyze(password);
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="strength-bar ${result.level}" style="width: ${result.score}%"></div>
        <span class="${result.level}">${result.level}</span>
    `;
}

// Settings
function openSettings() {
    const user = sessionManager.getCurrentUser();
    document.getElementById('set-autolock').value = user?.settings?.autoLockMinutes || 5;
    document.getElementById('set-clipboard').value = user?.settings?.clipboardClearMinutes || 1;
    document.getElementById('settings-modal').classList.remove('hidden');
}

async function handleSaveSettings(e) {
    e.preventDefault();
    await sessionManager.updateSettings({
        autoLockMinutes: parseInt(document.getElementById('set-autolock').value),
        clipboardClearMinutes: parseFloat(document.getElementById('set-clipboard').value)
    });
    closeModals();
    showToast('Settings saved', 'success');
}

// Utilities
function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    editingId = null;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toasts');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
