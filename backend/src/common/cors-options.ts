import type { CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { Request } from 'express';

/** Only the existing anonymous, revocable report-image capability supports external readers. */
export function applicationCors(allowedOrigins: string[]): CorsOptionsDelegate<Request> {
  return (req, callback) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) && /^\/api\/zalo\/report-image\/[a-f0-9]{48}\.png$/.test(req.path)) {
      callback(null, { origin: '*', credentials: false, methods: ['GET', 'HEAD'], allowedHeaders: [] });
      return;
    }
    callback(null, {
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
      credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  };
}
