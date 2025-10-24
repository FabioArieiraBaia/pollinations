import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth.ts";
import { LoggerVariables } from "./logger.ts";
import { HTTPException } from "hono/http-exception";
import type { Session } from "@/auth.ts";

export type AuthVariables = {
    auth: {
        client: ReturnType<typeof createAuth>;
        session?: Session["session"];
        user?: Session["user"];
        requireActiveSession: (message?: string) => Session;
    };
};

export type AuthEnv = {
    Bindings: CloudflareBindings;
    Variables: LoggerVariables & AuthVariables;
};

export const authenticate = createMiddleware<AuthEnv>(async (c, next) => {
    const client = createAuth(c.env);

    // Check for token in URL query parameter
    const urlToken = c.req.query("token");

    let result;
    if (urlToken) {
        // If token is provided in URL, authenticate using API key
        try {
            // Create a temporary request with the token in the Authorization header
            const tempHeaders = new Headers(c.req.raw.headers);
            tempHeaders.set("Authorization", `Bearer ${urlToken}`);

            result = await client.api.getSession({
                headers: tempHeaders,
            });
        } catch (error) {
            // If URL token validation fails, fall back to standard authentication
            result = await client.api.getSession({
                headers: c.req.raw.headers,
            });
        }
    } else {
        // Standard session-based authentication
        result = await client.api.getSession({
            headers: c.req.raw.headers,
        });
    }

    const session = result?.session;
    const user = result?.user;

    const requireActiveSession = (message?: string): Session => {
        if (!user || !session) {
            throw new HTTPException(401, {
                message:
                    message || "You need to be signed-in to access this route.",
            });
        }
        return { user, session };
    };

    c.set("auth", {
        client,
        session,
        user,
        requireActiveSession,
    });

    await next();
});
