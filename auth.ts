import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // On first sign-in, account & profile are available
      if (account?.providerAccountId && profile?.email) {
        try {
          // Look up or create user manually (avoids PrismaAdapter compat issues with Prisma 7)
          let user = await prisma.user.findUnique({ where: { email: profile.email } });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: profile.email,
                name: (profile.name as string) ?? null,
                image: (profile as Record<string, unknown>).picture as string ?? null,
              },
            });
            await prisma.account.create({
              data: {
                userId: user.id,
                type: "oauth",
                provider: "google",
                providerAccountId: account.providerAccountId,
                access_token: account.access_token ?? null,
                refresh_token: account.refresh_token ?? null,
                expires_at: account.expires_at ?? null,
                token_type: account.token_type ?? null,
                scope: account.scope ?? null,
                id_token: account.id_token ?? null,
              },
            });
          }
          token.sub = user.id;
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
    error: "/login",
  },
});
