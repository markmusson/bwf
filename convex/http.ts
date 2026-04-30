import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth's magic-link verification routes (POST /api/auth/signin,
// GET /api/auth/callback/resend, etc.) — required for the Resend
// provider to complete the round-trip.
auth.addHttpRoutes(http);

export default http;
