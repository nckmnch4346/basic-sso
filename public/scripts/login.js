const GOOGLE_CLIENT_ID = '1786051934-8qnvo09mieuodq8un7964vll342gf474.apps.googleusercontent.com';
const API_BASE_URL = 'http://localhost:3000'; // Backend server URL

// Initialize Google Sign-In when the page loads
window.onload = function() {
    console.log('Google Client ID:', GOOGLE_CLIENT_ID);
    console.log('Current URL:', window.location.href);
    console.log('Current Origin:', window.location.origin);
    console.log('API Base URL:', API_BASE_URL);

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        verifyToken().then(valid => {
            if (valid) {
                window.location.href = 'dashboard.html';
                return;
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            initializeGoogleSignIn();
        });
    } else {
        initializeGoogleSignIn();
    }
};

// Fixed: Declare the missing function
function initializeGoogleSignIn() {
    // Wait for Google API to load
    const checkGoogleLoaded = () => {
        if (window.google && window.google.accounts) {
            initGoogle();
        } else {
            setTimeout(checkGoogleLoaded, 100);
        }
    };

    const initGoogle = () => {
        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });

        // Create and configure the Google Sign-In elements
        const placeholder = document.getElementById('google-signin-placeholder');
        placeholder.innerHTML = `
            <div id="g_id_onload"
                 data-client_id="${GOOGLE_CLIENT_ID}"
                 data-context="signin"
                 data-ux_mode="popup"
                 data-callback="handleCredentialResponse"
                 data-auto_prompt="false">
            </div>

            <div id="google-signin-button"></div>
        `;

        // Render the sign-in button
        window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            {
                type: 'standard',
                shape: 'rectangular',
                theme: 'outline',
                text: 'signin_with',
                size: 'large',
                logo_alignment: 'left',
                width: 300
            }
        );
    };

    checkGoogleLoaded();
}

// Handle Google Sign-In response
async function handleCredentialResponse(response) {
    console.log('Received credential response');
    showLoading(true);
    hideError();

    try {
        console.log('Sending request to:', `${API_BASE_URL}/auth/google`);
        const result = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: response.credential
            })
        });

        console.log('Response status:', result.status);

        if (result.ok) {
            const data = await result.json();
            console.log('Auth successful:', data);

            if (data.success) {
                // Store token and user data
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                showError(data.error || 'Authentication failed');
            }
        } else {
            const errorText = await result.text();
            console.error('Auth failed:', result.status, errorText);
            showError(`Authentication failed: ${result.status}`);
        }
    } catch (error) {
        console.error('Auth error:', error);
    } finally {
        showLoading(false);
    }
}

// Verify if token is still valid
async function verifyToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/user`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Utility functions
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}