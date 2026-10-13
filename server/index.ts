import path from 'node:path';
import express from 'express';
import { createServerApp } from './api.js';

const { app } = createServerApp();
const port = Number(process.env.PORT || 4180);

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve('dist');
  app.use(express.static(dist));
  // In Express 5, serve single page application fallback
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(dist, 'index.html'));
    }
    next();
  });
}

// Global server-side error handler
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Local server error:', err);
    res
      .status(500)
      .json({ error: err.message || 'The local service could not complete that request.' });
  }
);

app.listen(port, '127.0.0.1', () => {
  console.log(`Field Operations Local server running at http://127.0.0.1:${port}`);
});
