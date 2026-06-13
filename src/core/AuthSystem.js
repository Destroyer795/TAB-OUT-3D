/**
 * AuthSystem.js – Manages user accounts, authentication session, and scores.
 * All data is persistent via localStorage.
 */

const USERS_KEY = 'tabout3d_users';
const SESSION_KEY = 'tabout3d_current_user';

class _AuthSystem {
    constructor() {
        this._users = this._loadUsers();
        this._currentUser = this._loadSession();
    }

    /**
     * Create a new user account.
     * @param {string} username 
     * @param {string} email 
     * @param {string} password 
     * @returns {{success: boolean, error?: string}}
     */
    signUp(username, email, password) {
        // Clean inputs
        const uName = username.trim();
        const mail = email.trim().toLowerCase();
        const pwd = password;

        if (!uName || !mail || !pwd) {
            return { success: false, error: "All fields are required" };
        }

        if (uName.length < 3) {
            return { success: false, error: "Username must be at least 3 characters" };
        }

        // Email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mail)) {
            return { success: false, error: "Please enter a valid email address" };
        }

        if (pwd.length < 4) {
            return { success: false, error: "Password must be at least 4 characters" };
        }

        // Check uniqueness
        const nameExists = this._users.some(u => u.username.toLowerCase() === uName.toLowerCase());
        if (nameExists) {
            return { success: false, error: "Username is already taken" };
        }

        const emailExists = this._users.some(u => u.email === mail);
        if (emailExists) {
            return { success: false, error: "Email is already registered" };
        }

        // Create user
        const newUser = {
            username: uName,
            email: mail,
            password: pwd, // Simple store for local demonstration
            personalBest: 0,
            createdAt: Date.now()
        };

        this._users.push(newUser);
        this._persistUsers();

        // Auto sign in
        this._currentUser = newUser;
        this._persistSession();

        return { success: true };
    }

    /**
     * Authenticate an existing user.
     * @param {string} emailOrUsername 
     * @param {string} password 
     * @returns {{success: boolean, error?: string}}
     */
    signIn(emailOrUsername, password) {
        const identifier = emailOrUsername.trim().toLowerCase();
        const pwd = password;

        if (!identifier || !pwd) {
            return { success: false, error: "All fields are required" };
        }

        const user = this._users.find(u => 
            u.email === identifier || 
            u.username.toLowerCase() === identifier
        );

        if (!user || user.password !== pwd) {
            return { success: false, error: "Invalid email/username or password" };
        }

        this._currentUser = user;
        this._persistSession();

        return { success: true };
    }

    /**
     * Terminate the current user session.
     */
    signOut() {
        this._currentUser = null;
        localStorage.removeItem(SESSION_KEY);
    }

    /**
     * Get the currently logged-in user profile.
     * @returns {object|null}
     */
    getCurrentUser() {
        return this._currentUser;
    }

    /**
     * Check if a session exists.
     * @returns {boolean}
     */
    isLoggedIn() {
        return this._currentUser !== null;
    }

    /**
     * Update the current user's high score.
     * @param {number} score 
     * @returns {boolean} Whether a new personal best was set.
     */
    updateScore(score) {
        if (!this._currentUser) return false;

        // Find user in list to maintain reference
        const user = this._users.find(u => u.username === this._currentUser.username);
        if (user && score > user.personalBest) {
            user.personalBest = score;
            this._currentUser.personalBest = score;
            this._persistUsers();
            this._persistSession();
            return true;
        }
        return false;
    }

    /**
     * Get the top 5 scores from all registered accounts.
     * @returns {Array<{username: string, personalBest: number}>}
     */
    getLeaderboard() {
        return [...this._users]
            .sort((a, b) => b.personalBest - a.personalBest)
            .slice(0, 5)
            .map(u => ({ username: u.username, personalBest: u.personalBest }));
    }

    /* ── Internal ──────────────────────────────────────── */

    _loadUsers() {
        try {
            const raw = localStorage.getItem(USERS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    _persistUsers() {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(this._users));
        } catch {
            // Silently ignore
        }
    }

    _loadSession() {
        try {
            const rawSession = localStorage.getItem(SESSION_KEY);
            if (!rawSession) return null;
            
            // Sync with current user database array to get fresh score
            const username = JSON.parse(rawSession).username;
            return this._users.find(u => u.username === username) || null;
        } catch {
            return null;
        }
    }

    _persistSession() {
        try {
            if (this._currentUser) {
                localStorage.setItem(SESSION_KEY, JSON.stringify({ username: this._currentUser.username }));
            }
        } catch {
            // Silently ignore
        }
    }
}

const AuthSystem = new _AuthSystem();
export default AuthSystem;
