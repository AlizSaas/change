import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db/database";
import { account, session, user, verification,subscription } from "./drizzle-out/auth-schema";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { Resend } from "resend";

let auth: BetterAuthInstance | undefined;
export type BetterAuthInstance = ReturnType<typeof betterAuth>;
type StripeConfig  = {
  stripeWebhookSecret: string;
  plans:any[],
  stripeApiKey?:string;
}

export function createBetterAuth(
  database: NonNullable<Parameters<typeof betterAuth>[0]>["database"],
  stripeConfig?: StripeConfig,
  google?: { clientId: string; clientSecret: string },
  resendApiKey?: string,
): BetterAuthInstance {
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  return betterAuth({
    database,
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user: u, url }) => {
        if (!resend) return;
        await resend.emails.send({
          from: "noreply@alizmail.com",
          to: u.email,
          subject: "Reset your password",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2>Reset your password</h2>
              <p>Click the button below to reset your password. This link expires in 1 hour.</p>
              <a href="${url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Reset password</a>
              <p style="margin-top:24px;color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      },
    },
    socialProviders: {
      google: {
        clientId: google?.clientId ?? "",
        clientSecret: google?.clientSecret ?? "",
      },
    },
    plugins: [
      stripe({
        stripeClient: new Stripe(stripeConfig?.stripeApiKey || process.env.STRIPE_KEY!, { apiVersion: "2025-07-30.basil" }),
        stripeWebhookSecret: stripeConfig?.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET!,
        createCustomerOnSignUp: true,
        subscription: {
          enabled: true,
          plans: stripeConfig?.plans || [],
        },
      }),
    ],
  });
}

export function getAuth(
  google: { clientId: string; clientSecret: string },
  stripe: StripeConfig,
  resendApiKey?: string,
): BetterAuthInstance {
  if (auth) return auth;
  auth = createBetterAuth(
    drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema: { user, session, account, verification, subscription },
    }),
    stripe,
    google,
    resendApiKey,
  );
  return auth;
}
