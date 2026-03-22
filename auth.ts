import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ["state"], // PKCE disabled — causes invalid_grant on serverless due to stale cookies
    }),
  ],
  session: {
    strategy: "jwt", // JWT avoids DB queries on every request — critical for serverless reliability
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id; // persist DB user ID in JWT
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
