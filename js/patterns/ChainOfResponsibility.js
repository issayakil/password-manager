/**
 * Chain of Responsibility Pattern - Password Recovery
 * Verifies security questions in sequence
 * 
 * Pattern Structure:
 * - Handler (abstract): Declares handleRequest() and successor reference
 * - SecurityQuestionHandler (ConcreteHandler): Implements handleRequest()
 * - PasswordRecoveryManager (Client): Creates and uses the chain
 */

/**
 * Handler - Abstract base class
 * Declares the interface for handling requests and the successor link
 */
class Handler {
    constructor() {
        this.successor = null;
    }

    /**
     * Set the next handler in the chain
     */
    setSuccessor(handler) {
        this.successor = handler;
        return handler;
    }

    /**
     * Handle the request - must be implemented by concrete handlers
     */
    handleRequest(request) {
        throw new Error('Method handleRequest() must be implemented');
    }
}

/**
 * ConcreteHandler - SecurityQuestionHandler
 * Handles verification of one security question
 */
class SecurityQuestionHandler extends Handler {
    constructor(question, hashedAnswer, index, hashFunction) {
        super();
        this.question = question;
        this.hashedAnswer = hashedAnswer;
        this.index = index;
        this.hashFunction = hashFunction;
    }

    /**
     * Verify the user's answer
     */
    verify(userAnswer) {
        // Normalize: lowercase and trim whitespace
        const normalized = (userAnswer || '').toLowerCase().trim();
        // Hash the normalized answer and compare with stored hash
        const hashedUserAnswer = this.hashFunction(normalized);
        return hashedUserAnswer === this.hashedAnswer;
    }

    /**
     * handleRequest - Process the request or pass to successor
     */
    handleRequest(answers) {
        // Try to handle the request (verify this question)
        if (!this.verify(answers[this.index])) {
            // Cannot handle - verification failed
            return { success: false, failedAt: this.index + 1 };
        }
        
        // Verification passed - pass to successor if exists
        if (this.successor) {
            return this.successor.handleRequest(answers);
        }
        
        // No successor - we're the last handler, return success
        return { success: true };
    }
}

/**
 * Client - PasswordRecoveryManager
 * Creates the chain and sends requests to it
 */
class PasswordRecoveryManager {
    constructor() {
        this.chain = null;  // Reference to first Handler
        this.questions = [];
        this.attempts = 0;
        this.maxAttempts = 3;
        this.locked = false;
        this.hashFunction = null;
    }

    /**
     * Set the hash function to use for answer verification
     */
    setHashFunction(fn) {
        this.hashFunction = fn;
    }

    /**
     * Initialize the chain with user's security questions
     * @param {Array} securityQuestions - Array of {question, answer} where answer is already hashed
     */
    initialize(securityQuestions) {
        if (!securityQuestions || securityQuestions.length < 3) {
            throw new Error('Three security questions required');
        }

        if (!this.hashFunction) {
            throw new Error('Hash function not set');
        }

        // Store questions for display (without answers)
        this.questions = securityQuestions.map((q, i) => ({
            index: i,
            question: q.question
        }));

        // Create concrete handlers
        const handler1 = new SecurityQuestionHandler(
            securityQuestions[0].question, 
            securityQuestions[0].answer, 
            0, 
            this.hashFunction
        );
        const handler2 = new SecurityQuestionHandler(
            securityQuestions[1].question, 
            securityQuestions[1].answer, 
            1, 
            this.hashFunction
        );
        const handler3 = new SecurityQuestionHandler(
            securityQuestions[2].question, 
            securityQuestions[2].answer, 
            2, 
            this.hashFunction
        );

        // Build the chain: handler1 → handler2 → handler3
        handler1.setSuccessor(handler2);
        handler2.setSuccessor(handler3);
        
        // Client keeps reference to first handler
        this.chain = handler1;
        this.attempts = 0;
        this.locked = false;

        return this.questions;
    }

    /**
     * Verify answers by sending request through the chain
     */
    verify(answers) {
        if (this.locked) {
            return { success: false, message: 'Too many attempts. Try again later.' };
        }

        if (!this.chain) {
            return { success: false, message: 'Recovery not initialized' };
        }

        // Client sends request to the chain
        const result = this.chain.handleRequest(answers);

        if (!result.success) {
            this.attempts++;
            if (this.attempts >= this.maxAttempts) {
                this.locked = true;
                setTimeout(() => { this.locked = false; this.attempts = 0; }, 15 * 60 * 1000);
                return { success: false, message: 'Too many attempts. Locked for 15 minutes.' };
            }
            return { success: false, message: `Question ${result.failedAt} incorrect. ${this.maxAttempts - this.attempts} attempts left.` };
        }

        return { success: true };
    }

    getQuestions() {
        return this.questions;
    }

    reset() {
        this.chain = null;
        this.questions = [];
        this.attempts = 0;
        this.locked = false;
    }
}

const SecurityQuestions = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What is your favorite movie?",
    "What was the make of your first car?",
    "What is your childhood nickname?",
    "What street did you grow up on?"
];

export { Handler, SecurityQuestionHandler, PasswordRecoveryManager, SecurityQuestions };
