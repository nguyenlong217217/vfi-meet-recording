import { config as dotenvConfig } from 'dotenv';
import path from 'path';

dotenvConfig();

export interface AppConfig {
    server: { host: string; port: number; env: string };
    cors: { origins: string[] };
    recording: {
        maxConcurrentRecordings: number;
        recordingTimeout: number;
        cleanupInterval: number;
        ffmpegPath: string;
    };
    storage: {
        recordingsPath: string;
        tempPath: string;
        maxFileAge: number;
        maxDiskUsage: number;
    };
}

export const config: AppConfig = {
    server: {
        host: process.env.HOST || '0.0.0.0',
        port: parseInt(process.env.PORT || '3001'),
        env: process.env.NODE_ENV || 'development'
    },
    cors: {
        origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
    },
    recording: {
        maxConcurrentRecordings: parseInt(process.env.MAX_CONCURRENT_RECORDINGS || '5'),
        recordingTimeout: parseInt(process.env.RECORDING_TIMEOUT || '3600000'),
        cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '300000'),
        ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg'
    },
    storage: {
        recordingsPath: path.resolve(process.env.RECORDINGS_PATH || './recordings'),
        tempPath: path.resolve(process.env.TEMP_PATH || './temp'),
        maxFileAge: parseInt(process.env.MAX_FILE_AGE_DAYS || '30'),
        maxDiskUsage: parseInt(process.env.MAX_DISK_USAGE_GB || '50')
    }
};
