import { NextRequest, NextResponse } from 'next/server';
import { restAreaSyncService } from '@/lib/database/restAreaSyncService';

// GET: 동기화 상태 확인
export async function GET(request: NextRequest) {
  try {
    const status = await restAreaSyncService.checkDatabaseStatus();
    
    return NextResponse.json({
      success: true,
      status: {
        isReady: status.isReady,
        totalCount: status.totalCount,
        lastSyncTime: status.lastSyncTime?.toISOString() || null,
        needsSync: status.needsSync,
        nextSyncTime: status.lastSyncTime 
          ? new Date(status.lastSyncTime.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null
      }
    });
  } catch (error) {
    console.error('동기화 상태 확인 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '동기화 상태 확인 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// POST: 수동 동기화 실행
export async function POST(request: NextRequest) {
  try {
    // 인증 토큰 확인 (보안을 위해)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Vercel Cron Job이나 수동 트리거 확인
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 요청 바디에서 동기화 타입 확인
    const body = await request.json().catch(() => ({}));
    const syncType = body.type || 'incremental'; // 'full' or 'incremental'

    console.log(`🔄 수동 동기화 요청 (타입: ${syncType})`);

    // 동기화 실행
    let result;
    if (syncType === 'full') {
      result = await restAreaSyncService.fullSync();
    } else {
      result = await restAreaSyncService.incrementalSync();
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        stats: result.stats,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('동기화 실행 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '동기화 실행 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}