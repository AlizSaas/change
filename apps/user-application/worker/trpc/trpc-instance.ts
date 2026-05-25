import { initTRPC } from "@trpc/server";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create(); // Initialize tRPC with the custom context type
