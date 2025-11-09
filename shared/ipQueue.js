/**
 * Shared IP-based queue management for Pollinations services
 * This module provides a consistent way to handle rate limiting across services
 *
 * Usage:
 * import { enqueue } from '../shared/ipQueue.js';
 * await enqueue(req, () => processRequest(), { interval: 6000 });
 */

import debug from "debug";

// Set up debug loggers with namespaces
const authLog = debug("pollinations:auth");

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

    // NO AUTHENTICATION - All requests assumed to come from enter.pollinations.ai
    // enter.pollinations.ai handles authentication and passes x-enter-token
    // RATE LIMITING DEACTIVATED - ALL REQUESTS EXECUTE IMMEDIATELY
    authLog("⚡ No auth validation, no rate limiting - executing immediately");
    return fn();
}

