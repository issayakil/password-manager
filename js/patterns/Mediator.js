/**
 * Mediator Pattern - UI Component Communication
 * Manages communication between UI components
 * 
 * Pattern Structure:
 * - Mediator (interface): Declares communication methods
 * - Colleague (abstract): Base class with reference to mediator
 * - UIMediator (ConcreteMediator): Implements coordination logic
 * - Concrete Colleagues: UI components that communicate via mediator
 */

/**
 * Mediator - Abstract interface for mediator
 */
class Mediator {
    notify(sender, event, data) {
        throw new Error('Method notify() must be implemented');
    }
}

/**
 * Colleague - Abstract base class for components
 * Holds reference to mediator (med)
 */
class Colleague {
    constructor(mediator) {
        this.med = mediator;  // Reference to mediator
    }

    /**
     * Send event through mediator
     */
    send(event, data) {
        this.med.notify(this, event, data);
    }
}

/**
 * ConcreteMediator - UIMediator
 * Coordinates communication between colleagues
 */
class UIMediator extends Mediator {
    constructor() {
        super();
        if (UIMediator.instance) {
            return UIMediator.instance;
        }
        this.handlers = {};
        this.colleagues = [];
        UIMediator.instance = this;
    }

    static getInstance() {
        if (!UIMediator.instance) {
            UIMediator.instance = new UIMediator();
        }
        return UIMediator.instance;
    }

    /**
     * Register a colleague with the mediator
     */
    registerColleague(colleague) {
        this.colleagues.push(colleague);
    }

    /**
     * notify - Called by colleagues to communicate
     */
    notify(sender, event, data) {
        // Emit to all registered handlers for this event
        if (this.handlers[event]) {
            this.handlers[event].forEach(handler => handler(data, sender));
        }
    }

    /**
     * on - Subscribe to an event
     */
    on(event, handler) {
        if (!this.handlers[event]) {
            this.handlers[event] = [];
        }
        this.handlers[event].push(handler);
    }

    /**
     * emit - Broadcast an event (alternative to notify)
     */
    emit(event, data) {
        this.notify(null, event, data);
    }

    /**
     * off - Unsubscribe from an event
     */
    off(event, handler) {
        if (this.handlers[event]) {
            this.handlers[event] = this.handlers[event].filter(h => h !== handler);
        }
    }
}

/**
 * ConcreteColleague - AuthColleague
 * Handles authentication UI events
 */
class AuthColleague extends Colleague {
    constructor(mediator) {
        super(mediator);
        mediator.registerColleague(this);
    }

    login(userData) {
        this.send('login-success', userData);
    }

    logout() {
        this.send('logout', null);
    }

    lock() {
        this.send('session-locked', null);
    }
}

/**
 * ConcreteColleague - VaultColleague
 * Handles vault list UI events
 */
class VaultColleague extends Colleague {
    constructor(mediator) {
        super(mediator);
        mediator.registerColleague(this);
    }

    refresh() {
        this.send('refresh', null);
    }

    selectItem(item) {
        this.send('item-selected', item);
    }
}

/**
 * ConcreteColleague - ToastColleague
 * Handles toast notification display
 */
class ToastColleague extends Colleague {
    constructor(mediator) {
        super(mediator);
        mediator.registerColleague(this);
    }

    showToast(message, type) {
        this.send('toast', { message, type });
    }
}

// Create singleton mediator instance
const uiMediator = UIMediator.getInstance();

export { 
    Mediator, 
    Colleague, 
    UIMediator, 
    AuthColleague, 
    VaultColleague, 
    ToastColleague,
    uiMediator 
};
