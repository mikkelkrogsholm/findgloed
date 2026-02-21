import { createAuthClient } from "better-auth/client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4564";

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    credentials: "include"
  }
});
