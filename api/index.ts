import { app, initializeApp } from '../server/app';

// Vercel serverless function entry point
export default async function handler(req: any, res: any) {
  // Ensure app is initialized
  await initializeApp();
  
  // Forward request to express app
  // Note: Vercel passes standard Node.js req/res objects
  // Express's app() function can handle them directly
  return app(req, res);
}
