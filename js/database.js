/**
 * Simple Local Database using IndexedDB
 */

class Database {
    constructor() {
        this.dbName = 'MyPassDB';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Users store
                if (!db.objectStoreNames.contains('users')) {
                    const usersStore = db.createObjectStore('users', { keyPath: 'email' });
                    usersStore.createIndex('email', 'email', { unique: true });
                }

                // Vault items store
                if (!db.objectStoreNames.contains('vault')) {
                    const vaultStore = db.createObjectStore('vault', { keyPath: 'id' });
                    vaultStore.createIndex('userEmail', 'userEmail', { unique: false });
                    vaultStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    /**
     * Add or update a user
     */
    async saveUser(user) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.put(user);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a user by email
     */
    async getUser(email) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(email);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a vault item
     */
    async saveVaultItem(item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vault'], 'readwrite');
            const store = transaction.objectStore('vault');
            const request = store.put(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all vault items for a user
     */
    async getVaultItems(userEmail) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vault'], 'readonly');
            const store = transaction.objectStore('vault');
            const index = store.index('userEmail');
            const request = index.getAll(userEmail);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get vault item by ID
     */
    async getVaultItem(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vault'], 'readonly');
            const store = transaction.objectStore('vault');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a vault item
     */
    async deleteVaultItem(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['vault'], 'readwrite');
            const store = transaction.objectStore('vault');
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}

const database = new Database();
export default database;

