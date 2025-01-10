import winston from 'winston';
import moment from 'moment-timezone';
import fs from 'fs';
import path from 'path';

const timeZone = 'Asia/Kolkata'; // Set your local time zone

// Ensure log directory exists
const logDir = '/var/logs/VTS';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => moment().tz(timeZone).format('YYYY-MM-DD HH:mm:ss')
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console({ level: 'debug' }),
    new winston.transports.File({ filename: path.join(logDir, 'info.log'), level: 'info', format: winston.format.combine(
      winston.format((info) => info.level === 'info' ? info : false)()
    )}),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', format: winston.format.combine(
      winston.format((info) => info.level === 'error' ? info : false)()
    )}),
    new winston.transports.File({ filename: path.join(logDir, 'debug.log'), level: 'debug', format: winston.format.combine(
      winston.format((info) => info.level === 'debug' ? info : false)()
    )})
  ],
  exitOnError: false // Do not exit on handled exceptions
});

// Override console.log to use logger.debug
console.log = (...args) => {
  const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg)).join(' ');
  logger.debug(message);
};

export default logger;