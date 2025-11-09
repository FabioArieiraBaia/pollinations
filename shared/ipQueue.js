/**
 * Shared IP-based queue management for Pollinations services
 * This module provides a consistent way to handle rate limiting across services
 *
 * Usage:
 * import { enqueue } from '../shared/ipQueue.js';
 * await enqueue(req, () => processRequest(), { interval: 6000 });
 */

import PQueue from "p-queue";
import { incrementUserMetric } from "./userMetrics.js";
import debug from "debug";
import { shouldBypassQueue, isEnterRequest } from "./auth-utils.js";

// Import rate limit logger for detailed 429 error logging
let logRateLimitError = null;

// Async function to load rate limit logger
async function loadRateLimitLogger() {
	try {
		// Dynamic import to avoid breaking services that don't have the text service logging
		const rateLimitLogger = await import("../text.pollinations.ai/logging/rateLimitLogger.js");
		logRateLimitError = rateLimitLogger.logRateLimitError;
	} catch (error) {
		// Silently fail if rate limit logger not available (e.g., in image service)
		debug("pollinations:queue")("Rate limit logger not available:", error.message);
	}
}

// Load the logger asynchronously
loadRateLimitLogger();

// Set up debug loggers with namespaces
const log = debug("pollinations:queue");
const errorLog = debug("pollinations:error");
const authLog = debug("pollinations:auth");

// Helper: Create error with status and context
const createError = (message, status, context = {}) => {
	const error = new Error(message);
	error.status = status;
	Object.assign(error, context);
	return error;
};

// Helper: Get cap for user (priority users or default)
const getCapForUser = (authResult) => {
	const userId = authResult.userId;
	if (userId && specialModelPriorityUsers.has(userId)) {
		const cap = specialModelPriorityUsers.get(userId);
		log('Using priority cap: %d for user: %s', cap, userId);
		return cap;
	}
	
	// Default cap for all users (authenticated or not)
	const defaultCap = 3;
	log('Using default cap: %d', defaultCap);
	return defaultCap;
};

// In-memory queue storage
const queues = new Map();

// Parse priority users from environment variable
const parsePriorityUsers = () => {
    const envVar = process.env.PRIORITY_MODEL_USERS;
    if (!envVar) return new Map();
    
    const priorityUsers = new Map();
    envVar.split(',').forEach(entry => {
        const [username, limit] = entry.split(':');
        priorityUsers.set(username.trim(), parseInt(limit) || 5); // Default to 5 concurrent if no limit specified
    });
    return priorityUsers;
};

const specialModelPriorityUsers = parsePriorityUsers();

// Log priority users on startup for debugging
if (specialModelPriorityUsers.size > 0) {
    log('Priority users loaded: %o', Array.from(specialModelPriorityUsers.entries()));
}

/**
 * Enqueue a function to be executed based on IP address
 * Requests with valid tokens or from allowlisted domains bypass the queue
 *
 * @param {Request|Object} req - The request object
 * @param {Function} fn - The function to execute
 * @param {Object} options - Queue options
 * @param {number} [options.interval=6000] - Time between requests in ms
 * @param {number} [options.cap=1] - Number of requests allowed per interval
 * @param {boolean} [options.forceCap=false] - If true, use provided cap instead of user-based cap
 * @returns {Promise<any>} Result of the function execution
 */
export async function enqueue(req, fn, { interval = 6000, cap = 1, forceCap = false } = {}) {
    // Extract useful request info for logging
    const url = req.url || "no-url";
    const method = req.method || "no-method";
    const path = url.split("?")[0] || "no-path";
    let ip =
        req.headers?.get?.("cf-connecting-ip") ||
        req.headers?.["cf-connecting-ip"] ||
        req.ip ||
        "unknown";

    authLog("Processing %s %s from IP: %s", method, path, ip);

    // Get authentication status (for logging/tracking, not for rate limiting)
    const authResult = await shouldBypassQueue(req);
    authLog("Auth: %s, userId=%s", authResult.reason, authResult.userId || "none");

    // Check if there's an error in the auth result (invalid token)
    if (authResult.error) {
        errorLog("Auth error: %s (status: %d)", authResult.error.message, authResult.error.status);
        if (authResult.debugInfo) {
            authLog("Debug: %o", authResult.debugInfo);
        }
        throw createError(authResult.error.message, authResult.error.status, {
            details: authResult.error.details,
            queueContext: { request: { method, path, ip }, issuedAt: new Date().toISOString() }
        });
    }

    // RATE LIMITING DEACTIVATED - ALL REQUESTS EXECUTE IMMEDIATELY
    // No queue delays, no concurrency limits, no 429 errors
    authLog("⚡ Rate limiting deactivated - executing immediately");
    return fn();
}

/**
 * Clean up old queues to prevent memory leaks
 * Call this periodically (e.g., every hour)
 * @param {number} maxAgeMs - Maximum age of inactive queues in milliseconds
 */
export function cleanupQueues(maxAgeMs = 3600000) {
	const now = Date.now();

	for (const [ip, queue] of queues.entries()) {
		if (queue.lastUsed && now - queue.lastUsed > maxAgeMs) {
			queues.delete(ip);
		}
	}
}
