/**
 * Vault Manager - Handles CRUD operations on vault items
 */

import database from '../database.js';
import sessionManager from '../patterns/Singleton.js';
import { securityMonitor } from '../patterns/Observer.js';

class VaultManager {
    constructor() {
        if (VaultManager.instance) {
            return VaultManager.instance;
        }
        VaultManager.instance = this;
    }

    static getInstance() {
        if (!VaultManager.instance) {
            VaultManager.instance = new VaultManager();
        }
        return VaultManager.instance;
    }

    /**
     * Get all vault items for current user
     */
    async getAllItems() {
        const user = sessionManager.getCurrentUser();
        if (!user) throw new Error('Not authenticated');
        
        const items = await database.getVaultItems(user.email);
        return items;
    }

    /**
     * Get items by type
     */
    async getItemsByType(type) {
        const items = await this.getAllItems();
        return items.filter(item => item.type === type);
    }

    /**
     * Get item by ID
     */
    async getItemById(id) {
        return await database.getVaultItem(id);
    }

    /**
     * Create a new item
     */
    async createItem(type, data) {
        const user = sessionManager.getCurrentUser();
        if (!user) throw new Error('Not authenticated');

        const item = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            type,
            userEmail: user.email,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await database.saveVaultItem(item);
        
        // Check for security issues
        await this.checkSecurity();
        
        return item;
    }

    /**
     * Update an item
     */
    async updateItem(id, data) {
        const existingItem = await database.getVaultItem(id);
        if (!existingItem) throw new Error('Item not found');

        const updatedItem = {
            ...existingItem,
            ...data,
            id: existingItem.id,
            type: existingItem.type,
            userEmail: existingItem.userEmail,
            createdAt: existingItem.createdAt,
            updatedAt: new Date().toISOString()
        };

        await database.saveVaultItem(updatedItem);
        
        // Check for security issues
        await this.checkSecurity();
        
        return updatedItem;
    }

    /**
     * Delete an item
     */
    async deleteItem(id) {
        await database.deleteVaultItem(id);
        return true;
    }

    /**
     * Search items
     */
    async searchItems(query) {
        const items = await this.getAllItems();
        const searchLower = query.toLowerCase();

        return items.filter(item => {
            if (item.name?.toLowerCase().includes(searchLower)) return true;
            if (item.username?.toLowerCase().includes(searchLower)) return true;
            if (item.url?.toLowerCase().includes(searchLower)) return true;
            return false;
        });
    }

    /**
     * Get item counts by type
     */
    async getCounts() {
        const items = await this.getAllItems();
        return {
            all: items.length,
            logins: items.filter(i => i.type === 'login').length,
            cards: items.filter(i => i.type === 'card').length,
            identities: items.filter(i => i.type === 'identity').length,
            notes: items.filter(i => i.type === 'note').length
        };
    }

    /**
     * Check security of all items
     */
    async checkSecurity() {
        const items = await this.getAllItems();
        const vault = {
            logins: items.filter(i => i.type === 'login'),
            cards: items.filter(i => i.type === 'card'),
            identities: items.filter(i => i.type === 'identity'),
            notes: items.filter(i => i.type === 'note')
        };
        return securityMonitor.checkVault(vault);
    }
}

const vaultManager = VaultManager.getInstance();
export default vaultManager;
