import pino from 'pino';
import pinoHttp from 'pino-http';

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
  serializers: {
    req(req) {
      return { method: req.method, url: req.url };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});

export default logger;
