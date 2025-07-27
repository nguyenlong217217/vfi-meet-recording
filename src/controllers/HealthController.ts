import { Router, Request, Response } from 'express';

export class HealthController {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.router.get('/', this.healthCheck.bind(this));
        this.router.get('/detailed', this.detailedHealthCheck.bind(this));
    }

    private healthCheck(req: Request, res: Response): void {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            service: 'edumeet-recording-service',
            version: '1.0.0'
        });
    }

    private detailedHealthCheck(req: Request, res: Response): void {
        const memoryUsage = process.memoryUsage();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            service: 'edumeet-recording-service',
            version: '1.0.0',
            memory: {
                rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
                heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
                heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
            },
            node: {
                version: process.version,
                platform: process.platform,
                arch: process.arch
            }
        });
    }
}
