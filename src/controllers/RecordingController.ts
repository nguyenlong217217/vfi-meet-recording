import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { RecordingService } from '../services/RecordingService';
import { Logger } from '../utils/Logger';

const logger = new Logger('RecordingController');

export class RecordingController {
    public router: Router;

    constructor(private readonly recordingService: RecordingService) {
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.router.post('/start',
            [
                body('roomId').notEmpty().withMessage('roomId is required'),
                body('requestedBy').notEmpty().withMessage('requestedBy is required')
            ],
            this.validateRequest.bind(this),
            this.startRecording.bind(this)
        );

        this.router.post('/:recordingId/stop',
            [param('recordingId').notEmpty().withMessage('Invalid recording ID')],
            this.validateRequest.bind(this),
            this.stopRecording.bind(this)
        );

        this.router.get('/:recordingId',
            [param('recordingId').notEmpty().withMessage('Invalid recording ID')],
            this.validateRequest.bind(this),
            this.getRecording.bind(this)
        );

        this.router.get('/', this.listRecordings.bind(this));
        this.router.delete('/:recordingId', this.deleteRecording.bind(this));
        this.router.get('/admin/stats', this.getStats.bind(this));
    }

    private validateRequest(req: Request, res: Response, next: any): void {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ error: 'Validation Error', details: errors.array() });
            return;
        }
        next();
    }

    private async startRecording(req: Request, res: Response): Promise<void> {
        try {
            logger.info('Starting recording request', { roomId: req.body.roomId });
            const result = await this.recordingService.startRecording(req.body);
            
            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Start recording failed:', error);
            res.status(500).json({
                error: 'Recording Error',
                message: (error as Error).message
            });
        }
    }

    private async stopRecording(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.recordingService.stopRecording(req.params.recordingId);
            res.json({ success: true, data: result });
        } catch (error) {
            logger.error('Stop recording failed:', error);
            res.status(500).json({
                error: 'Recording Error',
                message: (error as Error).message
            });
        }
    }

    private async getRecording(req: Request, res: Response): Promise<void> {
        try {
            const recording = this.recordingService.getRecording(req.params.recordingId);
            if (!recording) {
                res.status(404).json({ error: 'Recording not found' });
                return;
            }
            res.json({ success: true, data: recording });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private async listRecordings(req: Request, res: Response): Promise<void> {
        try {
            const recordings = this.recordingService.getAllRecordings();
            res.json({ success: true, data: recordings });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private async deleteRecording(req: Request, res: Response): Promise<void> {
        try {
            await this.recordingService.deleteRecording(req.params.recordingId);
            res.json({ success: true, message: 'Recording deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    private async getStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = this.recordingService.getStats();
            res.json({ success: true, data: stats });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
