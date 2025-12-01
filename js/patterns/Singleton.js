/**
 * Singleton Pattern - Session Manager
 * Manages user authentication state and session securely
 * 
 * Pattern Structure:
 * - Singleton (abstract): Declares instance and getInstance()
 * - SessionManager (Concrete Singleton): Implements session management
 * - Database: Used for persistence
 */

import database from '../database.js';

/**
 * Singleton - Abstract base class
 * Ensures only one instance exists
 */
class Singleton {
    constructor() {
        if (this.constructor === Singleton) {
            throw new Error('Abstract class Singleton cannot be instantiated directly');
        }
    }

    static getInstance() {
        throw new Error('Method getInstance() must be implemented');
    }
}

/**
 * Concrete Singleton - SessionManager
 * Manages user authentication, auto-lock, and clipboard
 */
class SessionManager extends Singleton {
    // Static instance reference
    static instance = null;

    constructor() {
        super();
        
        if (SessionManager.instance) {
            return SessionManager.instance;
        }
        
        // Instance properties
        this.user = null;
        this.isAuthenticated = false;
        this.lastActivity = Date.now();
        this.autoLockMinutes = 1;
        this.lockTimer = null;
        this.clipboardTimer = null;
        this.clipboardClearMinutes = 1;
        
        SessionManager.instance = this;
    }

    /**
     * getInstance - Returns the singleton instance
     */
    static getInstance() {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }

    /**
     * Register a new user
     */
    async register(email, masterPassword, securityQuestions) {
        // Check if email already exists in database
        const existingUser = await database.getUser(email);
        if (existingUser) {
            throw new Error('Email already registered');
        }

        const hashedPassword = this.hashPassword(masterPassword);
        const hashedQuestions = securityQuestions.map(q => ({
            question: q.question,
            answer: this.hashPassword(q.answer.toLowerCase().trim())
        }));

        const user = {
            email,
            masterPassword: hashedPassword,
            securityQuestions: hashedQuestions,
            settings: {
                autoLockMinutes: 1,
                clipboardClearMinutes: 1
            },
            createdAt: new Date().toISOString()
        };

        await database.saveUser(user);
        return true;
    }

    /**
     * Login user
     */
    async login(email, masterPassword) {
        const user = await database.getUser(email);

        if (!user) {
            throw new Error('User not found');
        }

        const hashedPassword = this.hashPassword(masterPassword);
        if (user.masterPassword !== hashedPassword) {
            throw new Error('Invalid password');
        }

        this.user = user;
        this.isAuthenticated = true;
        this.lastActivity = Date.now();
        this.autoLockMinutes = user.settings?.autoLockMinutes || 5;
        this.clipboardClearMinutes = user.settings?.clipboardClearMinutes || 1;
        
        this.startAutoLockTimer();
        
        return true;
    }

    /**
     * Logout user
     */
    logout() {
        this.user = null;
        this.isAuthenticated = false;
        this.stopAutoLockTimer();
        this.clearClipboard();
    }

    /**
     * Lock the vault
     */
    lock() {
        this.isAuthenticated = false;
        this.stopAutoLockTimer();
    }

    /**
     * Unlock with master password
     */
    async unlock(masterPassword) {
        if (!this.user) {
            throw new Error('No user session');
        }

        const hashedPassword = this.hashPassword(masterPassword);
        if (this.user.masterPassword !== hashedPassword) {
            throw new Error('Invalid password');
        }

        this.isAuthenticated = true;
        this.lastActivity = Date.now();
        this.startAutoLockTimer();
        return true;
    }

    /**
     * Update activity timestamp
     */
    updateActivity() {
        this.lastActivity = Date.now();
    }

    /**
     * Start auto-lock timer
     */
    startAutoLockTimer() {
        this.stopAutoLockTimer();
        
        this.lockTimer = setInterval(() => {
            const inactiveTime = (Date.now() - this.lastActivity) / 1000 / 60;
            if (inactiveTime >= this.autoLockMinutes) {
                this.lock();
                window.dispatchEvent(new CustomEvent('session-locked'));
            }
        }, 10000);
    }

    /**
     * Stop auto-lock timer
     */
    stopAutoLockTimer() {
        if (this.lockTimer) {
            clearInterval(this.lockTimer);
            this.lockTimer = null;
        }
    }

    /**
     * Copy to clipboard with auto-clear
     */
    copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        
        if (this.clipboardTimer) {
            clearTimeout(this.clipboardTimer);
        }

        this.clipboardTimer = setTimeout(() => {
            this.clearClipboard();
        }, this.clipboardClearMinutes * 60 * 1000);

        return true;
    }

    /**
     * Clear clipboard
     */
    clearClipboard() {
        navigator.clipboard.writeText('');
        if (this.clipboardTimer) {
            clearTimeout(this.clipboardTimer);
            this.clipboardTimer = null;
        }
    }

    /**
     * Update user settings
     */
    async updateSettings(settings) {
        if (!this.user) return;

        this.user.settings = { ...this.user.settings, ...settings };
        this.autoLockMinutes = settings.autoLockMinutes || this.autoLockMinutes;
        this.clipboardClearMinutes = settings.clipboardClearMinutes || this.clipboardClearMinutes;
        
        await database.saveUser(this.user);
    }

    /**
     * Get user for recovery
     */
    async getUserForRecovery(email) {
        return await database.getUser(email);
    }

    /**
     * Update user password
     */
    async updatePassword(email, newPassword) {
        const user = await database.getUser(email);
        if (user) {
            user.masterPassword = this.hashPassword(newPassword);
            await database.saveUser(user);
        }
    }

    /**
     * Simple hash function
     */
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return btoa(hash.toString() + password.length + 'mypass_salt');
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Check if authenticated
     */
    checkAuth() {
        return this.isAuthenticated && this.user !== null;
    }
}

// Export singleton instance
const sessionManager = SessionManager.getInstance();
export default sessionManager;
export { Singleton, SessionManager };
