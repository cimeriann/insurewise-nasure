import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Daily rotate file transport for all logs
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'insurewise-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

// Daily rotate file transport for error logs only
const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'insurewise-error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat,
});

// Create winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'insurewise-api' },
  transports: [
    fileRotateTransport,
    errorFileRotateTransport,
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug',
  }));
}

// Handle transport errors
fileRotateTransport.on('error', (error) => {
  console.error('File transport error:', error);
});

errorFileRotateTransport.on('error', (error) => {
  console.error('Error file transport error:', error);
});

// Create a stream for Morgan HTTP request logging
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper functions for structured logging
export const logInfo = (message: string, meta?: object) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | object) => {
  logger.error(message, { error: error instanceof Error ? error.stack : error });
};

export const logWarn = (message: string, meta?: object) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: object) => {
  logger.debug(message, meta);
};

// Request logging helper
export const logRequest = (req: any, message: string, meta?: object) => {
  logger.info(message, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    ...meta,
  });
};

export default logger;
