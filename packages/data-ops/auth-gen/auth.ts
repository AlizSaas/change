import { createBetterAuth } from "@/auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";


export const auth: ReturnType<typeof betterAuth> = createBetterAuth(drizzleAdapter(
  {},
  {
    provider: "sqlite"
  }
), )
//this is a placeholder file to make sure that the auth instance is created only once in the data-ops package 