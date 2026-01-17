declare module "../dist-server/app.cjs" {
  export const app: any;
  export function initializeApp(): Promise<void>;
}

