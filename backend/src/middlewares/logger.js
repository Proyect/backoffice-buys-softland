import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' }
  }
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: true,
  genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});

export function setRequestIdHeader(req, res, next) {
  if (req.id) {
    res.setHeader('X-Request-Id', req.id);
  }
  next();
}

export default logger;
