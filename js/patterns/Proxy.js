/**
 * Proxy Pattern - Data Masking
 * Masks and unmasks sensitive data
 * 
 * Pattern Structure:
 * - Subject (interface): Declares getValue() method
 * - RealSensitiveData (RealSubject): Holds actual sensitive value
 * - SensitiveDataProxy (Proxy): Controls access, applies masking
 * - MaskingRules: Utility class for masking functions
 */

/**
 * Subject - Interface declaring getValue()
 */
class Subject {
    getValue() {
        throw new Error('Method getValue() must be implemented');
    }
}

/**
 * RealSubject - RealSensitiveData
 * Holds the actual sensitive data value
 */
class RealSensitiveData extends Subject {
    constructor(value) {
        super();
        this.value = value;
    }

    getValue() {
        return this.value;
    }
}

/**
 * MaskingRules - Utility class for masking functions
 */
class MaskingRules {
    static password(v) {
        return '••••••••';
    }

    static username(v) {
        if (!v) return '';
        return v[0] + '•'.repeat(Math.max(0, v.length - 2)) + (v.length > 1 ? v.slice(-1) : '');
    }

    static creditCard(v) {
        if (!v) return '';
        return '•••• •••• •••• ' + v.replace(/\s/g, '').slice(-4);
    }

    static cvv(v) {
        return '•••';
    }

    static ssn(v) {
        if (!v) return '';
        return '•••-••-' + v.replace(/[^0-9]/g, '').slice(-4);
    }

    static passport(v) {
        if (!v) return '';
        return v.slice(0, 2) + '•'.repeat(Math.max(0, v.length - 2));
    }

    static license(v) {
        if (!v) return '';
        return '•'.repeat(Math.max(0, v.length - 3)) + v.slice(-3);
    }
}

/**
 * Proxy - SensitiveDataProxy
 * Controls access to RealSensitiveData and applies masking
 */
class SensitiveDataProxy extends Subject {
    constructor(value, type) {
        super();
        this.realSubject = new RealSensitiveData(value);
        this.type = type;
        this.masked = true;
    }

    /**
     * getValue - Returns masked or real value based on state
     */
    getValue() {
        if (this.masked) {
            return this.getMaskedValue();
        }
        return this.realSubject.getValue();
    }

    /**
     * getMaskedValue - Apply masking rules
     */
    getMaskedValue() {
        const value = this.realSubject.getValue();
        const maskFn = MaskingRules[this.type];
        if (maskFn) {
            return maskFn(value);
        }
        return '••••••••';
    }

    /**
     * getRealValue - Direct access to real value
     */
    getRealValue() {
        return this.realSubject.getValue();
    }

    /**
     * toggle - Switch between masked and unmasked
     */
    toggle() {
        this.masked = !this.masked;
        return this.getValue();
    }

    /**
     * isMasked - Check current state
     */
    isMasked() {
        return this.masked;
    }
}

export { Subject, RealSensitiveData, SensitiveDataProxy, MaskingRules };
