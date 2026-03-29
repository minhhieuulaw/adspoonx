import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email    = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null; // Google-only account

        const valid = await compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email ?? "", name: user.name ?? "", image: user.image ?? "" };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },  // 24 hours
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Credentials sign-in: user object is available directly
      if (user?.id && account?.provider === "credentials") {
        token.sub = user.id;
        return token;
      }

      // Google sign-in
      if (account?.provider === "google" && profile?.email) {
        try {
          let dbUser = await prisma.user.findUnique({ where: { email: profile.email } });
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email: profile.email,
                name:  (profile.name as string) ?? null,
                image: (profile as Record<string, unknown>).picture as string ?? null,
              },
            });
            await prisma.account.create({
              data: {
                userId:            dbUser.id,
                type:              "oauth",
                provider:          "google",
                providerAccountId: account.providerAccountId,
                access_token:      account.access_token  ?? null,
                refresh_token:     account.refresh_token ?? null,
                expires_at:        account.expires_at    ?? null,
                token_type:        account.token_type    ?? null,
                scope:             account.scope         ?? null,
                id_token:          account.id_token      ?? null,
              },
            });
          }
          token.sub = dbUser.id;
        } catch (e) {
          console.error("[auth] DB error during jwt callback:", e);
        }
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
    error:  "/login",
  },
});
