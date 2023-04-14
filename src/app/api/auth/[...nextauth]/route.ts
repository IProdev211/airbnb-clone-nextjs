import { TLoginInput, TUiUser } from '@/common/types';
import db from '@/db';
import { users } from '@/db/schema';
import { compare } from 'bcrypt';
import { eq } from 'drizzle-orm';
import NextAuth, { DefaultSession, NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

declare module 'next-auth' {
	interface Session extends DefaultSession {
		user?: TUiUser;
	}
}

const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			credentials: {},
			async authorize(credentials) {
				const { email, password } = credentials as Partial<TLoginInput>;
				if (!email || !password) {
					throw new Error('Invalid credentials');
				}

				const user = (
					await db.select().from(users).where(eq(users.email, email))
				)[0];

				if (!user || !user?.password) {
					throw new Error('Invalid credentials');
				}

				const { password: hashedPassword, ...uiUser } = user;
				const isCorrectPassword = await compare(password, hashedPassword);

				if (!isCorrectPassword) {
					throw new Error('Invalid credentials');
				}

				return uiUser as any;
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			user && (token.user = user);
			return token;
		},
		async session({ session, token }) {
			if (token.user) session.user = token.user as TUiUser;
			return session;
		},
	},
	pages: { signIn: '/' },
	debug: !Boolean(process.env.NODE_ENV === 'production'),
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };