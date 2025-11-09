/**
 * Shared authentication utilities for Pollinations services
 * 
 * Note: Authentication validation has been removed.
 * All authentication is now handled by enter.pollinations.ai
 * 
 * This module only contains utility functions for:
 * - Token validation (simple string comparison)
 * - Domain whitelisting
 * - Enter.pollinations.ai request detection
 */

// Auto-load environment variables from shared and local .env files
import "./env-loader.js";

/**
 * Validate token against allowed tokens
 * Simple string comparison for now
 * @param {string} token - The token to validate
 * @param {string[]|string} validTokens - Array of valid tokens or comma-separated string
 * @returns {boolean} Whether the token is valid
 */
export function isValidToken(token, validTokens) {
	if (!token) return false;

	// Convert validTokens to array if it's a string
	const tokensArray = Array.isArray(validTokens)
		? validTokens
		: (validTokens || "").split(",");

	// Check if token is in the array
	return tokensArray.includes(token);
}

/**
 * Check if domain is whitelisted
 * @param {string} referrer - The referrer URL to check
 * @param {string[]|string} whitelist - Array of whitelisted domains or comma-separated string
 * @returns {boolean} Whether the domain is whitelisted
 */
export function isDomainWhitelisted(referrer, whitelist) {
	if (!referrer) return false;

	// Handle comma-separated string (from env vars)
	if (typeof whitelist === "string") {
		whitelist = whitelist
			.split(",")
			.map((d) => d.trim())
			.filter(Boolean);
	}

	try {
		const url = new URL(referrer);
		return whitelist.some((domain) => url.hostname.includes(domain));
	} catch (e) {
		// If referrer is not a valid URL, check if it includes any whitelisted domain
		return whitelist.some((domain) => referrer.includes(domain));
		return false;
	}
}

/**
 * Check if a domain is allowed for a specific user in the auth database.
 * @param {string} userId - The user ID.
 * @param {string} referrer - The referrer URL to check.
 * @param {D1Database} db - The D1 Database instance.
 * @param {function} isDomainAllowedDb - The function to check domain against DB.
 * @returns {Promise<boolean>} Whether the domain is allowed for the user.
 */
export async function isUserDomainAllowedFromDb(
	userId,
	referrer,
	db,
	isDomainAllowedDb,
) {
	if (!userId || !referrer || !db || !isDomainAllowedDb) return false;

	try {
		const url = new URL(referrer);
		const hostname = url.hostname.toLowerCase();
		return await isDomainAllowedDb(db, userId, hostname);
	} catch (e) {
		// Invalid URL
		return false;
	}
}

/**
 * Check if request is from enter.pollinations.ai
 * @param {Object} req - Request object
 * @returns {boolean} True if request has valid enter token
 */
export function isEnterRequest(req) {
	const enterToken = req.headers?.['x-enter-token'] || req.headers?.get?.('x-enter-token');
	const validEnterToken = process.env.ENTER_TOKEN;
	
	if (!enterToken || !validEnterToken) {
		return false;
	}
	
	return enterToken === validEnterToken;
}

// Legacy authentication functions removed:
// - shouldBypassQueue() - no longer needed (no queue)
// - handleAuthentication() - no longer needed (no validation)
// - addAuthDebugHeaders() - no longer needed (no auth debugging)
// - createAuthDebugResponse() - no longer needed (no auth debugging)
// - getUserPreferences() - called auth.pollinations.ai (deprecated)
//
// All authentication is now handled by enter.pollinations.ai
