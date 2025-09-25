import NextAuth from "next-auth";
import LinkedInProvider from "next-auth/providers/linkedin";

import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    linkedinId?: string;
  }
  interface JWT {
    accessToken?: string;
    linkedinId?: string;
  }
}

import { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile email w_member_social",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        // Save LinkedIn user ID from profile - LinkedIn uses 'sub' in OIDC
        console.log("LinkedIn profile:", profile);
        token.linkedinId = profile?.sub;
      }
      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.linkedinId = token.linkedinId as string;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
