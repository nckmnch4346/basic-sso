let GOOGLE_CLIENT_ID = '1786051934-8qnvo09mieuodq8un7964vll342gf474.apps.googleusercontent.com';
const API_BASE_URL = 'http://localhost:3000'; // Backend server URL

// Initialize Google Sign-In when the page loads
window.onload = async function() {
    console.log('Current URL:', window.location.href);
    console.log('Current Origin:', window.location.origin);
    console.log('API Base URL:', API_BASE_URL);

    // Fetch configuration from backend
    try {
        console.log('Fetching config from:', `${API_BASE_URL}/config`);
        const configResponse = await fetch(`${API_BASE_URL}/config`);
        
        if (!configResponse.ok) {
            throw new Error(`Config fetch failed: ${configResponse.status}`);
        }
        
        const config = await configResponse.json();
        GOOGLE_CLIENT_ID = config.googleClientId;
        console.log('Google Client ID loaded:', GOOGLE_CLIENT_ID);
        
        if (!GOOGLE_CLIENT_ID) {
            throw new Error('No Google Client ID received from server');
        }
    } catch (error) {
        console.error('Failed to fetch config:', error);
        showError('Failed to load application configuration. Please refresh the page.');
        return;
    }

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const valid = await verifyToken();
            if (valid) {
                window.location.href = 'dashboard.html';
                return;
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error('Token verification error:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }
    
    initializeGoogleSignIn();
};

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    if (!GOOGLE_CLIENT_ID) {
        showError('Google Client ID not available');
        return;
    }

    // Wait for Google API to load
    const checkGoogleLoaded = () => {
        if (window.google && window.google.accounts) {
            initGoogle();
        } else {
            setTimeout(checkGoogleLoaded, 100);
        }
    };

    const initGoogle = () => {
        try {
            console.log('Initializing Google Sign-In with client ID:', GOOGLE_CLIENT_ID);
            
            // Initialize Google Identity Services
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true
            });

            // Create and configure the Google Sign-In elements
            const placeholder = document.getElementById('google-signin-placeholder');
            if (placeholder) {
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
                
                console.log('Google Sign-In button rendered successfully');
            } else {
                console.error('Google signin placeholder not found');
            }
        } catch (error) {
            console.error('Error initializing Google Sign-In:', error);
            showError('Failed to initialize Google Sign-In');
        }
    };

    checkGoogleLoaded();
}

// Handle Google Sign-In response
async function handleCredentialResponse(response) {
    console.log('Received credential response');
    console.log('Token length:', response.credential ? response.credential.length : 'null');
    
    showLoading(true);
    hideError();

    try {
        console.log('Sending request to:', `${API_BASE_URL}/auth/google`);
        
        const result = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies if needed
            body: JSON.stringify({
                token: response.credential
            })
        });

        console.log('Response status:', result.status);
        console.log('Response headers:', Object.fromEntries(result.headers.entries()));

        if (result.ok) {
            const data = await result.json();
            console.log('Auth successful:', data);

            if (data.success && data.token) {
                // Store token and user data
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                console.log('Token stored, redirecting to dashboard');
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                console.error('Auth response missing success or token:', data);
                showError(data.error || 'Authentication failed - invalid response');
            }
        } else {
            let errorMessage = 'Authentication failed';
            try {
                const errorData = await result.json();
                errorMessage = errorData.error || errorMessage;
                if (errorData.details) {
                    console.error('Auth error details:', errorData.details);
                }
            } catch (e) {
                const errorText = await result.text();
                console.error('Auth failed with status:', result.status, 'Response:', errorText);
            }
            showError(`${errorMessage} (${result.status})`);
        }
    } catch (error) {
        console.error('Network or parsing error:', error);
        showError('Network error. Please check your connection and try again.');
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
        console.error('Token verification error:', error);
        return false;
    }
}

// Utility functions
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    console.error('Error displayed to user:', message);
}

function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}