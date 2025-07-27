import { ChildProcess } from 'child_process';

export type RecordingStatus = 'initializing' | 'recording' | 'paused' | 'stopped' | 'completed' | 'failed';

export interface RecordingData {
    id: string;
    roomId: string;
    roomName?: string;
    status: RecordingStatus;
    requestedBy: string;
    startTime: Date;
    endTime?: Date;
    outputPath?: string;
    options: any;
    error?: string;
    ffmpegProcess?: ChildProcess;
}

export class Recording {
    public id: string;
    public roomId: string;
    public roomName?: string;
    public status: RecordingStatus;
    public requestedBy: string;
    public startTime: Date;
    public endTime?: Date;
    public outputPath?: string;
    public options: any;
    public error?: string;
    public ffmpegProcess?: ChildProcess;

    constructor(data: RecordingData) {
        this.id = data.id;
        this.roomId = data.roomId;
        this.roomName = data.roomName;
        this.status = data.status;
        this.requestedBy = data.requestedBy;
        this.startTime = data.startTime;
        this.endTime = data.endTime;
        this.outputPath = data.outputPath;
        this.options = data.options;
        this.error = data.error;
        this.ffmpegProcess = data.ffmpegProcess;
    }

    public toJSON(): any {
        return {
            id: this.id,
            roomId: this.roomId,
            roomName: this.roomName,
            status: this.status,
            requestedBy: this.requestedBy,
            startTime: this.startTime,
            endTime: this.endTime,
            outputPath: this.outputPath,
            options: this.options,
            error: this.error,
            duration: this.endTime ? 
                this.endTime.getTime() - this.startTime.getTime() : 
                Date.now() - this.startTime.getTime()
        };
    }
}
