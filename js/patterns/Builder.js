/**
 * Builder Pattern - Password Generator
 * Creates passwords with specific requirements
 * 
 * Pattern Structure:
 * - Builder (interface): Declares building methods
 * - PasswordBuilder (ConcreteBuilder): Implements building steps
 * - PasswordDirector (Director): Orchestrates building process
 * - Password string (Product): The final result
 */

/**
 * Builder Interface - Declares the building methods
 */
class Builder {
    reset() {
        throw new Error('Method reset() must be implemented');
    }
    
    setLength(length) {
        throw new Error('Method setLength() must be implemented');
    }
    
    withUppercase(include) {
        throw new Error('Method withUppercase() must be implemented');
    }
    
    withLowercase(include) {
        throw new Error('Method withLowercase() must be implemented');
    }
    
    withNumbers(include) {
        throw new Error('Method withNumbers() must be implemented');
    }
    
    withSymbols(include) {
        throw new Error('Method withSymbols() must be implemented');
    }
    
    getResult() {
        throw new Error('Method getResult() must be implemented');
    }
}

/**
 * ConcreteBuilder - Implements the Builder interface
 */
class PasswordBuilder extends Builder {
    constructor() {
        super();
        this.reset();
    }

    reset() {
        this.length = 16;
        this.includeUppercase = true;
        this.includeLowercase = true;
        this.includeNumbers = true;
        this.includeSymbols = true;
        return this;
    }

    setLength(length) {
        this.length = Math.max(4, Math.min(64, length));
        return this;
    }

    withUppercase(include) {
        this.includeUppercase = include;
        return this;
    }

    withLowercase(include) {
        this.includeLowercase = include;
        return this;
    }

    withNumbers(include) {
        this.includeNumbers = include;
        return this;
    }

    withSymbols(include) {
        this.includeSymbols = include;
        return this;
    }

    /**
     * GetResult - Builds and returns the Product (password)
     */
    getResult() {
        let charset = '';
        let required = [];

        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const nums = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (this.includeUppercase) {
            charset += upper;
            required.push(this.randomChar(upper));
        }
        if (this.includeLowercase) {
            charset += lower;
            required.push(this.randomChar(lower));
        }
        if (this.includeNumbers) {
            charset += nums;
            required.push(this.randomChar(nums));
        }
        if (this.includeSymbols) {
            charset += symbols;
            required.push(this.randomChar(symbols));
        }

        if (!charset) charset = lower;

        let password = '';
        for (let i = 0; i < this.length - required.length; i++) {
            password += this.randomChar(charset);
        }

        password += required.join('');
        return this.shuffle(password);
    }

    // Alias for backward compatibility
    build() {
        return this.getResult();
    }

    randomChar(str) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return str[array[0] % str.length];
    }

    shuffle(str) {
        const arr = str.split('');
        for (let i = arr.length - 1; i > 0; i--) {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            const j = array[0] % (i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join('');
    }
}

/**
 * Director - Orchestrates the building process
 * Knows how to build passwords using the Builder interface
 */
class PasswordDirector {
    constructor() {
        this.builder = null;
    }

    setBuilder(builder) {
        this.builder = builder;
    }

    /**
     * Construct - Builds password based on configuration
     * @param {Object} config - Password configuration options
     */
    construct(config = {}) {
        if (!this.builder) {
            throw new Error('Builder not set');
        }

        this.builder.reset();

        if (config.length !== undefined) {
            this.builder.setLength(config.length);
        }
        if (config.uppercase !== undefined) {
            this.builder.withUppercase(config.uppercase);
        }
        if (config.lowercase !== undefined) {
            this.builder.withLowercase(config.lowercase);
        }
        if (config.numbers !== undefined) {
            this.builder.withNumbers(config.numbers);
        }
        if (config.symbols !== undefined) {
            this.builder.withSymbols(config.symbols);
        }

        return this.builder.getResult();
    }
}

/**
 * Password Strength Analyzer
 */
class PasswordStrengthAnalyzer {
    static analyze(password) {
        let score = 0;
        const feedback = [];

        if (password.length >= 12) score += 25;
        else if (password.length >= 8) score += 15;
        else feedback.push('Use at least 8 characters');

        if (/[A-Z]/.test(password)) score += 20;
        else feedback.push('Add uppercase letters');

        if (/[a-z]/.test(password)) score += 20;
        else feedback.push('Add lowercase letters');

        if (/[0-9]/.test(password)) score += 15;
        else feedback.push('Add numbers');

        if (/[^A-Za-z0-9]/.test(password)) score += 20;
        else feedback.push('Add special characters');

        let level = 'weak';
        if (score >= 80) level = 'strong';
        else if (score >= 60) level = 'good';
        else if (score >= 40) level = 'fair';

        return { score, level, feedback };
    }
}

export { Builder, PasswordBuilder, PasswordDirector, PasswordStrengthAnalyzer };
