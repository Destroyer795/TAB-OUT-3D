/**
 * AuthSystem.js – Manages user accounts, authentication session, and scores.
 * Integrates with Supabase when configured, and falls back to localStorage automatically.
 */

import { CONFIG } from './Config.js';
import { createClient } from '@supabase/supabase-js';

const isSupabaseConfigured = CONFIG.supabaseUrl && 
                             CONFIG.supabaseUrl !== 'YOUR_SUPABASE_URL' && 
                             CONFIG.supabaseAnonKey && 
                             CONFIG.supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

const supabase = isSupabaseConfigured ? createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey) : null;

// LocalStorage Keys (for Fallback Mode)
const USERS_KEY = 'tabout3d_users';
const SESSION_KEY = 'tabout3d_current_user';

class _AuthSystem {
    constructor() {
        if (!isSupabaseConfigured) {
            console.log("Supabase credentials not configured in Config.js. Running in LocalStorage offline mode.");
            this._users = this._loadUsers();
            this._currentUser = this._loadSession();
        } else {
            console.log("Supabase successfully initialized for global leaderboard.");
            this._currentUser = null;
        }
    }

    /**
     * Create a new user account.
     * @param {string} username 
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async signUp(username, email, password) {
        const uName = username.trim();
        const mail = email.trim().toLowerCase();
        const pwd = password;

        if (!uName || !mail || !pwd) {
            return { success: false, error: "All fields are required" };
        }

        if (uName.length < 3) {
            return { success: false, error: "Username must be at least 3 characters" };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mail)) {
            return { success: false, error: "Please enter a valid email address" };
        }

        if (pwd.length < 4) {
            return { success: false, error: "Password must be at least 4 characters" };
        }

        if (supabase) {
            try {
                // Check if username is already taken in the profiles table
                const { data: existingUser, error: checkError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('username', uName);

                if (checkError) throw checkError;
                if (existingUser && existingUser.length > 0) {
                    return { success: false, error: "Username is already taken" };
                }

                // Register user in Supabase Auth, passing the username in metadata
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: mail,
                    password: pwd,
                    options: {
                        data: {
                            username: uName
                        }
                    }
                });

                if (authError) {
                    return { success: false, error: authError.message };
                }

                if (!authData.user) {
                    return { success: false, error: "Signup failed. Please try again." };
                }

                // Make a best-effort client profile insert with email
                // (the database trigger may have already created it without email)
                try {
                    await supabase
                        .from('profiles')
                        .upsert({
                            id: authData.user.id,
                            username: uName,
                            email: mail,
                            personal_best: 0
                        }, { onConflict: 'id' });
                } catch (e) {
                    // Ignore duplicate key or insert errors if the database trigger handled it
                }

                // Cache current user
                this._currentUser = {
                    username: uName,
                    email: mail,
                    personalBest: 0
                };

                return { success: true };
            } catch (err) {
                return { success: false, error: err.message || "An unexpected error occurred during sign up" };
            }
        } else {
            // LocalStorage Fallback
            const nameExists = this._users.some(u => u.username.toLowerCase() === uName.toLowerCase());
            if (nameExists) return { success: false, error: "Username is already taken" };

            const emailExists = this._users.some(u => u.email === mail);
            if (emailExists) return { success: false, error: "Email is already registered" };

            const newUser = {
                username: uName,
                email: mail,
                password: pwd,
                personalBest: 0,
                createdAt: Date.now()
            };

            this._users.push(newUser);
            this._persistUsers();
            this._currentUser = newUser;
            this._persistSession();

            return { success: true };
        }
    }

    /**
     * Authenticate an existing user.
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async signIn(email, password) {
        let mail = email.trim().toLowerCase();
        const pwd = password;

        if (!mail || !pwd) {
            return { success: false, error: "All fields are required" };
        }

        if (supabase) {
            try {
                // If the identifier doesn't contain '@', treat it as a username
                // and resolve the email from the profiles table
                if (!mail.includes('@')) {
                    const { data: profileMatch, error: lookupError } = await supabase
                        .from('profiles')
                        .select('email')
                        .ilike('username', mail)
                        .maybeSingle();

                    if (lookupError || !profileMatch || !profileMatch.email) {
                        return { success: false, error: "Username not found. Please sign up first." };
                    }
                    mail = profileMatch.email;
                }

                // Log in via Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: mail,
                    password: pwd
                });

                if (authError) {
                    return { success: false, error: authError.message };
                }

                // Fetch corresponding profile
                let { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authData.user.id)
                    .maybeSingle();

                // Self-healing: create profile if missing
                if (!profile) {
                    const fallbackUsername = authData.user.user_metadata?.username || mail.split('@')[0] || 'Player';
                    const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: authData.user.id,
                            username: fallbackUsername,
                            email: mail,
                            personal_best: 0
                        })
                        .select()
                        .maybeSingle();

                    if (insertError) {
                        console.error("Failed to self-heal profile on sign in:", insertError);
                        return { success: false, error: "Authenticated successfully, but failed to create profile in database: " + insertError.message };
                    }
                    profile = newProfile || {
                        id: authData.user.id,
                        username: fallbackUsername,
                        personal_best: 0
                    };
                } else if (!profile.email) {
                    // Self-heal: backfill email for existing profiles that don't have it
                    await supabase
                        .from('profiles')
                        .update({ email: mail })
                        .eq('id', authData.user.id);
                }

                this._currentUser = {
                    username: profile.username,
                    email: mail,
                    personalBest: profile.personal_best || 0
                };

                return { success: true };
            } catch (err) {
                return { success: false, error: err.message || "An unexpected error occurred during sign in" };
            }
        } else {
            // LocalStorage Fallback
            const user = this._users.find(u => u.email === mail || u.username.toLowerCase() === mail);
            if (!user || user.password !== pwd) {
                return { success: false, error: "Invalid email/username or password" };
            }

            this._currentUser = user;
            this._persistSession();
            return { success: true };
        }
    }

    /**
     * Terminate the current user session.
     * @returns {Promise<void>}
     */
    async signOut() {
        if (supabase) {
            await supabase.auth.signOut();
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
        this._currentUser = null;
    }

    /**
     * Get the currently logged-in user profile.
     * @returns {Promise<object|null>}
     */
    async getCurrentUser() {
        if (supabase) {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    this._currentUser = null;
                    return null;
                }

                // If already cached and personal best is known, return it.
                // Otherwise fetch fresh from DB.
                let { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error("Error fetching profile:", profileError);
                }

                // Self-healing: create profile if missing
                if (!profile) {
                    const fallbackUsername = user.user_metadata?.username || user.email.split('@')[0] || 'Player';
                    const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            username: fallbackUsername,
                            email: user.email,
                            personal_best: 0
                        })
                        .select()
                        .maybeSingle();

                    if (insertError) {
                        console.error("Failed to self-heal profile in getCurrentUser:", insertError);
                    } else if (newProfile) {
                        profile = newProfile;
                    } else {
                        profile = {
                            id: user.id,
                            username: fallbackUsername,
                            personal_best: 0
                        };
                    }
                } else if (!profile.email && user.email) {
                    // Self-heal: backfill email for existing profiles
                    await supabase
                        .from('profiles')
                        .update({ email: user.email })
                        .eq('id', user.id);
                }

                if (profile) {
                    this._currentUser = {
                        username: profile.username,
                        email: user.email,
                        personalBest: profile.personal_best || 0
                    };
                    return this._currentUser;
                }
                return null;
            } catch (err) {
                console.error("Error in getCurrentUser:", err);
                return null;
            }
        } else {
            return this._currentUser;
        }
    }

    /**
     * Check if a session exists (synchronous quick check).
     * @returns {boolean}
     */
    isLoggedIn() {
        return this._currentUser !== null;
    }

    /**
     * Retrieve the cached user profile synchronously (avoiding async delay).
     * @returns {object|null}
     */
    getCachedUser() {
        return this._currentUser;
    }

    /**
     * Update the current user's high score.
     * @param {number} score 
     * @returns {Promise<boolean>} Whether a new personal best was set.
     */
    async updateScore(score) {
        if (supabase) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return false;

                // Get current personal best
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('personal_best')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!profile) {
                    // Profile is missing, self-heal and insert it with the score
                    const fallbackUsername = user.user_metadata?.username || user.email.split('@')[0] || 'Player';
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            username: fallbackUsername,
                            personal_best: score
                        });

                    if (!insertError) {
                        if (this._currentUser) {
                            this._currentUser.personalBest = score;
                        }
                        return true;
                    }
                    return false;
                }

                if (score > (profile.personal_best || 0)) {
                    const { error } = await supabase
                        .from('profiles')
                        .update({ personal_best: score })
                        .eq('id', user.id);

                    if (!error) {
                        if (this._currentUser) {
                            this._currentUser.personalBest = score;
                        }
                        return true;
                    }
                }
                return false;
            } catch (err) {
                console.error("Error updating score in Supabase:", err);
                return false;
            }
        } else {
            // LocalStorage Fallback
            if (!this._currentUser) return false;
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
    }

    /**
     * Get the top 5 scores from all registered accounts.
     * @returns {Promise<Array<{username: string, personalBest: number}>>}
     */
    async getLeaderboard() {
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('username, personal_best')
                    .order('personal_best', { ascending: false })
                    .limit(5);

                if (error) throw error;
                return data.map(p => ({
                    username: p.username,
                    personalBest: p.personal_best || 0
                }));
            } catch (err) {
                console.error("Failed to fetch Supabase leaderboard:", err);
                return [];
            }
        } else {
            // LocalStorage Fallback
            return [...this._users]
                .sort((a, b) => b.personalBest - a.personalBest)
                .slice(0, 5)
                .map(u => ({ username: u.username, personalBest: u.personalBest }));
        }
    }

    /* ── Internal (LocalStorage Fallback) ──────────────── */

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
            // Ignore
        }
    }

    _loadSession() {
        try {
            const rawSession = localStorage.getItem(SESSION_KEY);
            if (!rawSession) return null;
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
            // Ignore
        }
    }
}

const AuthSystem = new _AuthSystem();
export default AuthSystem;
export { isSupabaseConfigured };
