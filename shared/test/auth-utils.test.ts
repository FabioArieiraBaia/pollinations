import { expect, test } from "vitest";
import { isEnterRequest } from "../auth-utils.js";

// Test enter.pollinations.ai request detection
test("isEnterRequest validates token correctly", () => {
    process.env.ENTER_TOKEN = "test-token-123";
    
    expect(isEnterRequest({ headers: { 'x-enter-token': 'test-token-123' } })).toBe(true);
    expect(isEnterRequest({ headers: { 'x-enter-token': 'wrong-token' } })).toBe(false);
    expect(isEnterRequest({ headers: {} })).toBe(false);
});

test("isEnterRequest handles missing env var", () => {
    delete process.env.ENTER_TOKEN;
    expect(isEnterRequest({ headers: { 'x-enter-token': 'some-token' } })).toBe(false);
});

test("isEnterRequest supports both header access patterns", () => {
    process.env.ENTER_TOKEN = "test-token-123";
    
    // Express/Node.js style
    expect(isEnterRequest({ headers: { 'x-enter-token': 'test-token-123' } })).toBe(true);
    
    // Cloudflare Workers style
    const cfReq = {
        headers: {
            get: (name: string) => name === 'x-enter-token' ? 'test-token-123' : null
        }
    };
    expect(isEnterRequest(cfReq)).toBe(true);
});
