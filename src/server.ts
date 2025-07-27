import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config/config';
import { Logger } from './utils/Logger';
import { RecordingController } from './controllers/RecordingController';
import { HealthController } from './controllers/HealthController';
import { RecordingService } from './services/RecordingService';
import { errorHandler } from './middleware/errorHandler';

const logger = new Logger('Server');

class RecordingServer {
    private app: express.Application;
    private server: any;
    private wss: WebSocketServer;
    private recordingService: RecordingService;

    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });
        
        this.initializeServices();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }

    private initializeServices(): void {
        logger.info('Initializing services...');
        this.recordingService = new RecordingService(config.recording);
        logger.info('Services initialized successfully');
    }

    private setupMiddleware(): void {
        this.app.use(helmet({ contentSecurityPolicy: false }));
        this.app.use(cors({ origin: config.cors.origins, credentials: true }));
        this.app.use(compression());
        this.app.use(express.json({ limit: '10mb' }));
    }

    private setupRoutes(): void {
        const healthController = new HealthController();
        const recordingController = new RecordingController(this.recordingService);
        
        this.app.use('/health', healthController.router);
        this.app.use('/api/recordings', recordingController.router);
        this.app.use('/files', express.static(config.storage.recordingsPath));
        
        this.app.get('/api', (req, res) => {
            res.json({
                service: 'Edumeet Recording Service',
                version: '1.0.0',
                status: 'running'
            });
        });
    }

    private setupWebSocket(): void {
        this.wss.on('connection', (ws) => {
            logger.info('New WebSocket connection');
            ws.send(JSON.stringify({
                type: 'connected',
                timestamp: new Date().toISOString()
            }));
        });
    }

    private setupErrorHandling(): void {
        this.app.use(errorHandler);
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());
    }

    public async start(): Promise<void> {
        this.server.listen(config.server.port, config.server.host, () => {
            logger.info(`🚀 Recording Service started at http://${config.server.host}:${config.server.port}`);
            logger.info(`📋 API Documentation: http://${config.server.host}:${config.server.port}/api`);
            logger.info(`❤️  Health Check: http://${config.server.host}:${config.server.port}/health`);
        });
    }

    private async gracefulShutdown(): Promise<void> {
        logger.info('Graceful shutdown initiated...');
        this.server.close();
        await this.recordingService.cleanup();
        process.exit(0);
    }
}

const server = new RecordingServer();
server.start().catch(console.error);
