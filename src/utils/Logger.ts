import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export class Logger {
    private logger: winston.Logger;

    constructor(private context: string) {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ level, message, timestamp, stack }) => {
                    return `${timestamp} [${level.toUpperCase()}] [${this.context}] ${message}${stack ? '\n' + stack : ''}`;
                })
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });

        // Add file transport if enabled
        if (process.env.LOG_FILE_ENABLED === 'true') {
            this.logger.add(new DailyRotateFile({
                filename: 'logs/recording-service-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                maxFiles: '14d',
                maxSize: '20m'
            }));
        }
    }

    public debug(message: string, meta?: any): void {
        this.logger.debug(message, meta);
    }

    public info(message: string, meta?: any): void {
        this.logger.info(message, meta);
    }

    public warn(message: string, meta?: any): void {
        this.logger.warn(message, meta);
    }

    public error(message: string, error?: any, meta?: any): void {
        this.logger.error(message, { error, ...meta });
    }
}
