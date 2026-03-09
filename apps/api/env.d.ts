declare module 'bun' {
  interface Env {
    NODE_ENV: string;
    PORT: string;
    DATABASE_URL: string;
  }
}
