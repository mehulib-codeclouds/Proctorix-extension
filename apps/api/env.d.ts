declare module 'bun' {
  interface Env {
    NODE_ENV: string;
    PORT: string;
    DATABASE_URL: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URL: string;
    RESEND_API_KEY: string;
    VERIFICATION_MAIL_FROM: string;
    VERIFICATION_LINK: string;
  }
}
