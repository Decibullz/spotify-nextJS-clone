import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'
import { refreshAccessToken } from 'spotify-web-api-node/src/server-methods'
import spotifyApi, { LOGIN_URL } from '../../../lib/spotify'

async function refreshedAccessToken(token) {
  try {
    spotifyApi.setAccessToken(token.accessToken)
    spotifyApi.setRefreshToken(token.refreshToken)
    const { body: refreshedToken } = await spotifyApi.refreshAccessToken()

    return {
      ...token,
      accessToken: refreshAccessToken.access_token,
      accessTokenExpires: Date.now + refreshedToken.expires_in * 1000,
      //  replace if new one came back else revert to old one
      refreshToken: refreshedToken.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    return {
      ...token,
      error: ' Refresh Access Token Error',
    }
  }
}

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    SpotifyProvider({
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
      authorization: LOGIN_URL,
    }),
    // ...add more providers here
  ],
  secret: process.env.JWT_SECRET,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // inital sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.access_token,
          username: account.providerAccountId,
          accessTokenExpires: account.expires_at * 1000,
        }
      }
      // token still valid
      if (Date.now() < token.accessTokenExpires) {
        return token
      }

      // token is expired
      return await refreshedAccessToken(token)
    },
    async session({ session, token }) {
      session.user.accessToken = token.accessToken
      session.user.refreshToken = token.refreshToken
      session.user.username = token.username
      return session
    },
  },
})
