/**
 * Observer Pattern - Notification System
 * Notifies users of weak passwords, expirations
 * 
 * Pattern Structure:
 * - Subject (interface): Declares observer management methods
 * - Observer (interface): Declares update method
 * - SecurityMonitor (ConcreteSubject): Implements Subject, monitors vault
 * - ToastObserver (ConcreteObserver): Implements Observer, displays notifications
 */

/**
 * Subject Interface - Declares observer management methods
 */
class Subject {
    registerObserver(observer) {
        throw new Error('Method registerObserver() must be implemented');
    }
    
    removeObserver(observer) {
        throw new Error('Method removeObserver() must be implemented');
    }
    
    notifyObservers(data) {
        throw new Error('Method notifyObservers() must be implemented');
    }
}

/**
 * Observer Interface - Declares update method
 */
class Observer {
    update(notification) {
        throw new Error('Method update() must be implemented');
    }
}

/**
 * ConcreteSubject - Implements Subject interface
 * Monitors vault for security issues
 */
class SecurityMonitor extends Subject {
    constructor() {
        super();
        this.observers = [];
        this.notifications = [];
    }

    /**
     * registerObserver - Add an observer to the list
     */
    registerObserver(observer) {
        if (observer instanceof Observer || typeof observer.update === 'function') {
            this.observers.push(observer);
        } else {
            throw new Error('Observer must implement update() method');
        }
    }

    /**
     * removeObserver - Remove an observer from the list
     */
    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    /**
     * notifyObservers - Notify all observers of a change
     */
    notifyObservers(notification) {
        this.observers.forEach(observer => {
            observer.update(notification);
        });
    }

    /**
     * Check all vault items for issues
     */
    checkVault(vault) {
        this.notifications = [];

        // Check logins for weak passwords
        vault.logins?.forEach(login => {
            this.checkPasswordStrength(login);
        });

        // Check credit cards for expiration
        vault.cards?.forEach(card => {
            this.checkCardExpiration(card);
        });

        // Check identities for document expirations
        vault.identities?.forEach(identity => {
            this.checkIdentityExpirations(identity);
        });

        return this.notifications;
    }

    /**
     * Check password strength
     */
    checkPasswordStrength(login) {
        const password = login.password || '';
        let score = 0;

        if (password.length >= 8) score += 25;
        if (/[A-Z]/.test(password)) score += 25;
        if (/[a-z]/.test(password)) score += 25;
        if (/[0-9]/.test(password)) score += 15;
        if (/[^A-Za-z0-9]/.test(password)) score += 10;

        if (score < 50) {
            const notification = {
                type: 'WEAK_PASSWORD',
                severity: 'warning',
                itemName: login.name,
                message: `Weak password for "${login.name}"`
            };
            this.notifications.push(notification);
            this.notifyObservers(notification);
        }
    }

    /**
     * Check credit card expiration
     */
    checkCardExpiration(card) {
        if (!card.expiryMonth || !card.expiryYear) return;

        const now = new Date();
        const expiry = new Date(card.expiryYear, card.expiryMonth - 1, 1);
        const monthsUntilExpiry = (expiry.getFullYear() - now.getFullYear()) * 12 + 
                                  (expiry.getMonth() - now.getMonth());

        if (monthsUntilExpiry < 0) {
            const notification = {
                type: 'CARD_EXPIRED',
                severity: 'error',
                itemName: card.name,
                message: `Card "${card.name}" has expired`
            };
            this.notifications.push(notification);
            this.notifyObservers(notification);
        } else if (monthsUntilExpiry <= 2) {
            const notification = {
                type: 'CARD_EXPIRING',
                severity: 'warning',
                itemName: card.name,
                message: `Card "${card.name}" expires soon`
            };
            this.notifications.push(notification);
            this.notifyObservers(notification);
        }
    }

    /**
     * Check identity document expirations
     */
    checkIdentityExpirations(identity) {
        const docs = [
            { field: 'passportExpiry', name: 'Passport' },
            { field: 'licenseExpiry', name: 'License' }
        ];

        docs.forEach(doc => {
            if (identity[doc.field]) {
                const expiryDate = new Date(identity[doc.field]);
                const now = new Date();
                const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

                if (daysUntilExpiry < 0) {
                    const notification = {
                        type: `${doc.name.toUpperCase()}_EXPIRED`,
                        severity: 'error',
                        itemName: identity.name,
                        message: `${doc.name} for "${identity.name}" has expired`
                    };
                    this.notifications.push(notification);
                    this.notifyObservers(notification);
                } else if (daysUntilExpiry <= 90) {
                    const notification = {
                        type: `${doc.name.toUpperCase()}_EXPIRING`,
                        severity: 'warning',
                        itemName: identity.name,
                        message: `${doc.name} for "${identity.name}" expires in ${daysUntilExpiry} days`
                    };
                    this.notifications.push(notification);
                    this.notifyObservers(notification);
                }
            }
        });
    }

    getNotifications() {
        return this.notifications;
    }
}

/**
 * ConcreteObserver - Implements Observer interface
 * Displays toast notifications in the UI
 */
class ToastObserver extends Observer {
    constructor(subject) {
        super();
        this.subject = subject;
        // Register this observer with the subject
        this.subject.registerObserver(this);
    }

    /**
     * update - Called by subject when notification occurs
     */
    update(notification) {
        // This will be connected to the UI's showToast function
        if (this.onNotification) {
            this.onNotification(notification);
        }
    }

    /**
     * Set the callback function for notifications
     */
    setNotificationHandler(handler) {
        this.onNotification = handler;
    }

    /**
     * Unregister from subject
     */
    unsubscribe() {
        this.subject.removeObserver(this);
    }
}

// Create singleton instances
const securityMonitor = new SecurityMonitor();

export { Subject, Observer, SecurityMonitor, ToastObserver, securityMonitor };
