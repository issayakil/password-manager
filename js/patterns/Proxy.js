/**
 * Proxy Pattern - Data Masking
 * Masks and unmasks sensitive data
 */

const maskingRules = {
    password: (v) => '••••••••',
    username: (v) => v ? v[0] + '•'.repeat(Math.max(0, v.length - 2)) + (v.length > 1 ? v.slice(-1) : '') : '',
    creditCard: (v) => v ? '•••• •••• •••• ' + v.replace(/\s/g, '').slice(-4) : '',
    cvv: () => '•••',
    ssn: (v) => v ? '•••-••-' + v.replace(/[^0-9]/g, '').slice(-4) : '',
    passport: (v) => v ? v.slice(0, 2) + '•'.repeat(Math.max(0, v.length - 2)) : '',
    license: (v) => v ? '•'.repeat(Math.max(0, v.length - 3)) + v.slice(-3) : ''
};

class SensitiveDataProxy {
    constructor(value, type) {
        this.value = value;
        this.type = type;
        this.masked = true;
    }

    getMaskedValue() {
        const maskFn = maskingRules[this.type] || (() => '••••••••');
        return maskFn(this.value);
    }

    getRealValue() {
        return this.value;
    }

    getValue() {
        return this.masked ? this.getMaskedValue() : this.value;
    }

    toggle() {
        this.masked = !this.masked;
        return this.getValue();
    }

    isMasked() {
        return this.masked;
    }
}

export { SensitiveDataProxy, maskingRules };
