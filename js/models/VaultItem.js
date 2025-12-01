/**
 * Vault Data Types
 * Login, Credit Card, Identity, Secure Notes
 */

/**
 * Detect card brand from number
 */
function detectCardBrand(number) {
    const cleaned = (number || '').replace(/\s/g, '');
    
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'Amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    
    return '';
}

export { detectCardBrand };
