import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/Logger';
import { Recording } from '../models/Recording';

const logger = new Logger('RecordingService');

export interface RecordingOptions {
    roomId: string;
    roomName?: string;
    requestedBy: string;
    layout?: { type: 'grid' | 'speaker' | 'sidebar' };
    encoding?: {
        videoBitrate?: string;
        audioBitrate?: string;
        resolution?: { width: number; height: number };
    };
    includeAudio?: boolean;
    includeVideo?: boolean;
}

export class RecordingService extends EventEmitter {
    private recordings = new Map<string, Recording>();
    private maxConcurrentRecordings: number;

    constructor(private config: any) {
        super();
        this.maxConcurrentRecordings = config.maxConcurrentRecordings || 5;
        this.ensureDirectories();
    }

    private async ensureDirectories(): Promise<void> {
        const dirs = ['./recordings', './temp', './logs'];
        for (const dir of dirs) {
            await fs.ensureDir(dir);
        }
    }

    public async startRecording(options: RecordingOptions): Promise<{
        recordingId: string;
        status: string;
    }> {
        if (this.recordings.size >= this.maxConcurrentRecordings) {
            throw new Error('Maximum concurrent recordings reached');
        }

        const recordingId = uuidv4();
        
        logger.info(`Starting recording [id:${recordingId}, room:${options.roomId}]`);

        try {
            const recording = new Recording({
                id: recordingId,
                roomId: options.roomId,
                roomName: options.roomName,
                options,
                status: 'recording',
                requestedBy: options.requestedBy,
                startTime: new Date()
            });

            // Generate output path
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `recording_${options.roomId}_${timestamp}.mp4`;
            recording.outputPath = path.join('./recordings', filename);

            this.recordings.set(recordingId, recording);

            // Start mock FFmpeg process for demo
            await this.startMockRecording(recording);

            logger.info(`Recording started successfully [id:${recordingId}]`);
            
            return {
                recordingId,
                status: 'started'
            };

        } catch (error) {
            this.recordings.delete(recordingId);
            logger.error(`Failed to start recording [id:${recordingId}]:`, error);
            throw error;
        }
    }

    private async startMockRecording(recording: Recording): Promise<void> {
        // Create a mock video file for demonstration
        const ffmpegArgs = [
            '-f', 'lavfi',
            '-i', 'testsrc2=duration=10:size=1280x720:rate=30',
            '-f', 'lavfi', 
            '-i', 'sine=frequency=1000:duration=10',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-c:a', 'aac',
            '-shortest',
            '-y',
            recording.outputPath!
        ];

        const ffmpegProcess = spawn(this.config.ffmpegPath, ffmpegArgs);
        recording.ffmpegProcess = ffmpegProcess;

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                recording.status = 'completed';
                recording.endTime = new Date();
                logger.info(`Recording completed [id:${recording.id}]`);
            } else {
                recording.status = 'failed';
                logger.error(`Recording failed [id:${recording.id}] with code ${code}`);
            }
        });

        ffmpegProcess.on('error', (error) => {
            recording.status = 'failed';
            recording.error = error.message;
            logger.error(`FFmpeg error [id:${recording.id}]:`, error);
        });
    }

    public async stopRecording(recordingId: string): Promise<{
        recordingId: string;
        status: string;
        duration?: number;
    }> {
        const recording = this.recordings.get(recordingId);

        if (!recording) {
            throw new Error(`Recording ${recordingId} not found`);
        }

        if (recording.ffmpegProcess && !recording.ffmpegProcess.killed) {
            recording.ffmpegProcess.kill('SIGINT');
        }

        recording.status = 'stopped';
        recording.endTime = new Date();

        const duration = recording.endTime.getTime() - recording.startTime.getTime();

        logger.info(`Recording stopped [id:${recordingId}]`);

        return {
            recordingId,
            status: 'stopped',
            duration
        };
    }

    public getRecording(recordingId: string): Recording | null {
        return this.recordings.get(recordingId) || null;
    }

    public getAllRecordings(): Recording[] {
        return Array.from(this.recordings.values());
    }

    public async deleteRecording(recordingId: string): Promise<void> {
        const recording = this.recordings.get(recordingId);

        if (!recording) {
            throw new Error(`Recording ${recordingId} not found`);
        }

        if (recording.outputPath && await fs.pathExists(recording.outputPath)) {
            await fs.remove(recording.outputPath);
        }

        this.recordings.delete(recordingId);
        logger.info(`Recording deleted [id:${recordingId}]`);
    }

    public getStats(): any {
        const recordings = Array.from(this.recordings.values());
        
        return {
            activeRecordings: recordings.filter(r => r.status === 'recording').length,
            totalRecordings: recordings.length,
            completedRecordings: recordings.filter(r => r.status === 'completed').length,
            failedRecordings: recordings.filter(r => r.status === 'failed').length,
            systemResources: {
                memory: process.memoryUsage(),
                uptime: process.uptime()
            }
        };
    }

    public async cleanup(): Promise<void> {
        logger.info('Cleaning up recording service...');
        
        for (const [recordingId, recording] of this.recordings) {
            if (recording.status === 'recording') {
                try {
                    await this.stopRecording(recordingId);
                } catch (error) {
                    logger.error(`Failed to stop recording ${recordingId}:`, error);
                }
            }
        }

        this.recordings.clear();
    }
}
