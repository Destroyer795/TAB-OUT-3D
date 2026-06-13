/**
 * Auth.js – Renders the login/signup screen with validation and tab switching.
 */

import AuthSystem   from '../core/AuthSystem.js';
import AudioManager from '../audio/AudioManager.js';

export class Auth {
    /**
     * @param {Function} onSuccess – Callback when authentication is successful.
     */
    constructor(onSuccess) {
        this.el = document.getElementById('auth');
        this._onSuccess = onSuccess;
        this._activeTab = 'signin'; // 'signin' or 'signup'
        this._build();
    }

    _build() {
        this.el.innerHTML = `
            <div class="auth-bg"></div>
            <div class="auth-card">
                <div class="auth-header">
                    <h1 class="auth-title">
                        <span class="title-tab">TAB</span><span class="title-dash">-</span><span class="title-out">OUT</span>
                        <span class="title-3d">3D</span>
                    </h1>
                    <p class="auth-subtitle">Stealth Arcade Authentication</p>
                </div>

                <div class="auth-tabs">
                    <button class="auth-tab-btn active" id="tab-signin">Sign In</button>
                    <button class="auth-tab-btn" id="tab-signup">Create Account</button>
                </div>

                <div class="auth-error-box" id="auth-error"></div>

                <form class="auth-form" id="auth-form" autocomplete="off">
                    <!-- Sign In Fields -->
                    <div class="form-group" id="group-username" style="display: none;">
                        <label for="auth-username">Unique Username</label>
                        <input type="text" id="auth-username" placeholder="e.g. NeoCoder" maxlength="15">
                    </div>

                    <div class="form-group">
                        <label id="label-email" for="auth-email">Email or Username</label>
                        <input type="text" id="auth-email" placeholder="e.g. player@office.com">
                    </div>

                    <div class="form-group">
                        <label for="auth-password">Password</label>
                        <input type="password" id="auth-password" placeholder="••••••••">
                    </div>

                    <button type="submit" class="menu-btn auth-submit-btn" id="auth-submit">
                        <span class="btn-glow"></span>
                        <span id="submit-text">SIGN IN</span>
                    </button>
                </form>
            </div>
        `;

        this._tabSignin = document.getElementById('tab-signin');
        this._tabSignup = document.getElementById('tab-signup');
        this._form = document.getElementById('auth-form');
        this._errorBox = document.getElementById('auth-error');
        
        this._usernameGroup = document.getElementById('group-username');
        this._labelEmail = document.getElementById('label-email');
        this._inputUsername = document.getElementById('auth-username');
        this._inputEmail = document.getElementById('auth-email');
        this._inputPassword = document.getElementById('auth-password');
        this._submitText = document.getElementById('submit-text');

        // Bind event listeners
        this._tabSignin.addEventListener('click', () => this._setTab('signin'));
        this._tabSignup.addEventListener('click', () => this._setTab('signup'));
        this._form.addEventListener('submit', (e) => this._handleSubmit(e));

        // Hover sounds
        this._tabSignin.addEventListener('mouseenter', () => AudioManager.playButtonHover());
        this._tabSignup.addEventListener('mouseenter', () => AudioManager.playButtonHover());
        document.getElementById('auth-submit').addEventListener('mouseenter', () => AudioManager.playButtonHover());
    }

    _setTab(tab) {
        if (this._activeTab === tab) return;
        this._activeTab = tab;
        AudioManager.playButtonClick();
        this._clearError();

        if (tab === 'signin') {
            this._tabSignin.classList.add('active');
            this._tabSignup.classList.remove('active');
            this._usernameGroup.style.display = 'none';
            this._labelEmail.textContent = 'Email or Username';
            this._inputEmail.placeholder = 'e.g. player@office.com or NeoCoder';
            this._submitText.textContent = 'SIGN IN';
        } else {
            this._tabSignin.classList.remove('active');
            this._tabSignup.classList.add('active');
            this._usernameGroup.style.display = 'block';
            this._labelEmail.textContent = 'Email';
            this._inputEmail.placeholder = 'e.g. player@office.com';
            this._submitText.textContent = 'CREATE ACCOUNT';
        }
    }

    async _handleSubmit(e) {
        e.preventDefault();
        this._clearError();
        AudioManager.playButtonClick();

        const emailVal = this._inputEmail.value;
        const passwordVal = this._inputPassword.value;
        const usernameVal = this._inputUsername.value;

        // Visual feedback during request
        const submitBtn = document.getElementById('auth-submit');
        const originalText = this._submitText.textContent;
        submitBtn.disabled = true;
        this._submitText.textContent = 'CONNECTING...';

        try {
            let res;
            if (this._activeTab === 'signin') {
                res = await AuthSystem.signIn(emailVal, passwordVal);
            } else {
                res = await AuthSystem.signUp(usernameVal, emailVal, passwordVal);
            }

            if (res.success) {
                this.hide();
                this._onSuccess();
            } else {
                this._showError(res.error);
            }
        } catch (err) {
            this._showError("A connection error occurred.");
        } finally {
            submitBtn.disabled = false;
            this._submitText.textContent = originalText;
        }
    }

    _showError(msg) {
        this._errorBox.textContent = msg;
        this._errorBox.classList.add('visible');
    }

    _clearError() {
        this._errorBox.textContent = '';
        this._errorBox.classList.remove('visible');
    }

    show() {
        this._clearError();
        this._inputEmail.value = '';
        this._inputPassword.value = '';
        this._inputUsername.value = '';
        this.el.classList.add('visible');
    }

    hide() {
        this.el.classList.remove('visible');
    }
}
