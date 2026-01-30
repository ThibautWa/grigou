import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Health check endpoint pour le monitoring et les CI/CD
 * 
 * Retourne:
 * - 200 OK si tout fonctionne
 * - 503 Service Unavailable si la DB est inaccessible
 */
export async function GET() {
    const startTime = Date.now();

    try {
        // Vérifier la connexion à la base de données
        const dbCheck = await pool.query('SELECT 1 as ok');
        const dbOk = dbCheck.rows[0]?.ok === 1;

        if (!dbOk) {
            return NextResponse.json(
                {
                    status: 'error',
                    message: 'Database check failed',
                    timestamp: new Date().toISOString(),
                },
                { status: 503 }
            );
        }

        const responseTime = Date.now() - startTime;

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
            uptime: process.uptime(),
            database: 'connected',
            responseTime: `${responseTime}ms`,
            environment: process.env.NODE_ENV,
        });
    } catch (error) {
        console.error('Health check failed:', error);

        return NextResponse.json(
            {
                status: 'error',
                message: 'Health check failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }
}