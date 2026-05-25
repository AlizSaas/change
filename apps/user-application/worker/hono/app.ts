import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/worker/trpc/router";
import { createContext } from "@/worker/trpc/context";
import { getAuth } from "@repo/data-ops/auth";
import { createMiddleware } from "hono/factory";

export const App = new Hono<{
  Bindings: ServiceBindings;
  Variables: { userId: string };
}>();

const getAuthInstance = (env: Env) => {
  return getAuth(
    {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    {
      stripeWebhookSecret: env.STRIPE_WEBHOOK_KEY,
      stripeApiKey: env.STRIPE_SECRET_KEY,
      plans: [
        { name: "basic", priceId: env.STRIPE_PRODUCT_BASIC },
        { name: "pro", priceId: env.STRIPE_PRODUCT_PRO },
        { name: "enterprise", priceId: env.STRIPE_PRODUCT_ENTERPRISE },
      ],
    },
    env.RESEND_API_KEY,
  );
};

const authMiddleware = createMiddleware(async (c, next) => {
  const auth = getAuthInstance(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.text("Unauthorized", 401);
  }
  const userId = session.user.id;
  c.set("userId", userId);
  await next();
});

App.all("/trpc/*", authMiddleware, (c) => {
      const userId = c.get("userId");
  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () =>
      createContext({
        req: c.req.raw,
        env: c.env,
        workerCtx: c.executionCtx,
        userId,
      }),
  });
});

const FORGOT_PASSWORD_LIMIT = 5; // max requests
const FORGOT_PASSWORD_WINDOW = 60 * 60; // 1 hour in seconds

App.post("/api/auth/forget-password", async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const key = `rate:forgot:${ip}`;
  const current = await c.env.AUTH_RATE_LIMIT.get(key);
  const count = current ? parseInt(current) : 0;
  if (count >= FORGOT_PASSWORD_LIMIT) {
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }
  await c.env.AUTH_RATE_LIMIT.put(key, String(count + 1), { expirationTtl: FORGOT_PASSWORD_WINDOW });
  await next();
});

App.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = getAuthInstance(c.env);
  return auth.handler(c.req.raw);
});


App.get("/click-socket", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const headers = new Headers(c.req.raw.headers);
  headers.set("account-id", userId);
  const proxiedRequest = new Request(c.req.raw, { headers }); //
  return c.env.BACKEND_SERVICE.fetch(proxiedRequest); //
});