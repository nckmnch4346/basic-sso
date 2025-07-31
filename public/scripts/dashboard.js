const API_BASE_URL = "http://localhost:3000"; // Backend server URL

// Check authentication on page load
window.onload = function () {
	const token = localStorage.getItem("token");
	if (!token) {
		window.location.href = "index.html";
		return;
	}

	loadUserData();
};

// Load user data from API
async function loadUserData() {
	const token = localStorage.getItem("token");

	try {
		const response = await fetch(`${API_BASE_URL}/api/user`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.ok) {
			const data = await response.json();
			populateDashboard(data.user);
		} else {
			// Token is invalid, redirect to login
			localStorage.removeItem("token");
			localStorage.removeItem("user");
			window.location.href = "index.html";
		}
	} catch (error) {
		console.error("Error loading user data:", error);
		showError("Failed to load user data. Please try refreshing the page.");
	} finally {
		document.getElementById("loading").style.display = "none";
	}
}

function populateDashboard(user) {
	// Profile section
	document.getElementById("profileName").textContent = user.name;
	document.getElementById("profileEmail").textContent = user.email;
	document.getElementById("profileCreated").textContent = formatDate(
		user.createdAt
	);
	document.getElementById("profileLastLogin").textContent = formatDate(
		user.lastLogin
	);
	document.getElementById("profileAvatar").src =
		user.picture || "/default-avatar.png";
	document.getElementById("profileDisplayName").textContent = user.name;

	// Calculate days since joined
	const daysSince = Math.floor(
		(new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
	);
	document.getElementById("daysSinceJoined").textContent = daysSince;

	// Show dashboard content
	document.getElementById("dashboardContent").style.display = "block";
}

// Logout function
async function logout() {
	const token = localStorage.getItem("token");

	try {
		// Call logout endpoint
		await fetch("/api/logout", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
	} catch (error) {
		console.error("Logout error:", error);
	} finally {
		// Clear local storage and redirect
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		window.location.href = "/";
	}
}

// Utility function to format dates
function formatDate(dateString) {
	const options = {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	};
	return new Date(dateString).toLocaleDateString("en-US", options);
}

// Show error message
function showError(message) {
	const errorDiv = document.getElementById("errorMessage");
	errorDiv.textContent = message;
	errorDiv.style.display = "block";
}
