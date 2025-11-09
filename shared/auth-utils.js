/**
 * Minimal authentication utilities for Pollinations services
 * 
 * All authentication is now handled by enter.pollinations.ai
 * This module only contains utility for detecting enter.pollinations.ai requests
 */

// Auto-load environment variables from shared and local .env files
import "./env-loader.js";

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
