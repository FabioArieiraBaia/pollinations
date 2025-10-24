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

    // Check for token in query parameter
    const tokenFromQuery = c.req.query("token");

    // Prepare headers, potentially adding Authorization header from query token
    let headers = c.req.raw.headers;
    if (tokenFromQuery) {
        // Create a new Headers object with the Authorization header added
        const modifiedHeaders = new Headers(headers);
        modifiedHeaders.set("Authorization", `Bearer ${tokenFromQuery}`);
        headers = modifiedHeaders;
    }

    const result = await client.api.getSession({
        headers,
    });

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
