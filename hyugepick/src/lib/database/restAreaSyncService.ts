import { RestAreaDatabase } from './restAreaDatabase';
import { highwayAPI } from '../highwayApi';
import { RestArea } from '@/types/map';

export class RestAreaSyncService {
  private db: RestAreaDatabase;
  private isRunning: boolean = false;

  constructor() {
    this.db = new RestAreaDatabase();
  }

  // 전체 동기화 (초기 로드 또는 강제 새로고침)
  async fullSync(): Promise<{
    success: boolean;
    message: string;
    stats?: {
      fetched: number;
      inserted: number;
      updated: number;
      failed: number;
    };
  }> {
    if (this.isRunning) {
      return {
        success: false,
        message: '동기화가 이미 진행 중입니다.'
      };
    }

    this.isRunning = true;
    let logId: string | null = null;

    try {
      console.log('🔄 전체 동기화 시작...');
      
      // 동기화 로그 생성
      logId = await this.db.createSyncLog({
        sync_type: 'full',
        source: 'highway_api',
        status: 'started',
        total_fetched: 0,
        total_inserted: 0,
        total_updated: 0,
        total_failed: 0
      });

      // 1. 한국도로공사 API에서 데이터 가져오기
      console.log('📡 한국도로공사 API 호출 중...');
      const restAreas = await highwayAPI.getRestAreas();
      
      if (!restAreas || restAreas.length === 0) {
        throw new Error('API에서 데이터를 가져올 수 없습니다.');
      }

      console.log(`✅ API에서 ${restAreas.length}개 휴게소 데이터 수신`);

      // 2. 데이터베이스에 저장 (RestArea를 RestAreaDB로 변환)
      const result = await this.db.upsertRestAreas(restAreas as any);

      // 3. 동기화 로그 업데이트
      if (logId) {
        await this.db.updateSyncLog(logId, {
          status: 'completed',
          total_fetched: restAreas.length,
          total_inserted: result.inserted,
          total_updated: result.updated,
          total_failed: result.failed
        });
      }

      console.log('✅ 전체 동기화 완료!');
      console.log(`📊 통계: 가져옴 ${restAreas.length}개, 신규 ${result.inserted}개, 업데이트 ${result.updated}개, 실패 ${result.failed}개`);

      return {
        success: true,
        message: '전체 동기화가 완료되었습니다.',
        stats: {
          fetched: restAreas.length,
          inserted: result.inserted,
          updated: result.updated,
          failed: result.failed
        }
      };

    } catch (error) {
      console.error('❌ 전체 동기화 실패:', error);
      
      // 동기화 로그 업데이트 (실패)
      if (logId) {
        await this.db.updateSyncLog(logId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }

      return {
        success: false,
        message: `동기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    } finally {
      this.isRunning = false;
    }
  }

  // 증분 동기화 (변경사항만 업데이트)
  async incrementalSync(): Promise<{
    success: boolean;
    message: string;
    stats?: {
      checked: number;
      updated: number;
      failed: number;
    };
  }> {
    if (this.isRunning) {
      return {
        success: false,
        message: '동기화가 이미 진행 중입니다.'
      };
    }

    this.isRunning = true;
    let logId: string | null = null;

    try {
      console.log('🔄 증분 동기화 시작...');
      
      // 마지막 동기화 시간 확인
      const lastSyncTime = await this.db.getLastSyncTime();
      
      if (!lastSyncTime) {
        console.log('⚠️ 이전 동기화 기록이 없습니다. 전체 동기화를 실행합니다.');
        const fullSyncResult = await this.fullSync();
        return {
          success: fullSyncResult.success,
          message: fullSyncResult.message,
          stats: fullSyncResult.stats ? {
            checked: fullSyncResult.stats.fetched,
            updated: fullSyncResult.stats.inserted + fullSyncResult.stats.updated,
            failed: fullSyncResult.stats.failed
          } : undefined
        };
      }

      const hoursSinceLastSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
      console.log(`📅 마지막 동기화: ${lastSyncTime.toLocaleString()} (${hoursSinceLastSync.toFixed(1)}시간 전)`);

      // 동기화 로그 생성
      logId = await this.db.createSyncLog({
        sync_type: 'incremental',
        source: 'highway_api',
        status: 'started',
        total_fetched: 0,
        total_inserted: 0,
        total_updated: 0,
        total_failed: 0
      });

      // API에서 최신 데이터 가져오기
      console.log('📡 최신 데이터 확인 중...');
      const latestRestAreas = await highwayAPI.getRestAreas();
      
      if (!latestRestAreas || latestRestAreas.length === 0) {
        throw new Error('API에서 데이터를 가져올 수 없습니다.');
      }

      // 변경된 데이터만 필터링 (실제로는 API가 변경 시간을 제공해야 함)
      // 현재는 모든 데이터를 업데이트하되, DB에서 자동으로 중복 처리
      const result = await this.db.upsertRestAreas(latestRestAreas as any);

      // 동기화 로그 업데이트
      if (logId) {
        await this.db.updateSyncLog(logId, {
          status: 'completed',
          total_fetched: latestRestAreas.length,
          total_inserted: result.inserted,
          total_updated: result.updated,
          total_failed: result.failed
        });
      }

      console.log('✅ 증분 동기화 완료!');
      console.log(`📊 통계: 확인 ${latestRestAreas.length}개, 업데이트 ${result.updated}개, 실패 ${result.failed}개`);

      return {
        success: true,
        message: '증분 동기화가 완료되었습니다.',
        stats: {
          checked: latestRestAreas.length,
          updated: result.inserted + result.updated,
          failed: result.failed
        }
      };

    } catch (error) {
      console.error('❌ 증분 동기화 실패:', error);
      
      if (logId) {
        await this.db.updateSyncLog(logId, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }

      return {
        success: false,
        message: `동기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    } finally {
      this.isRunning = false;
    }
  }

  // 동기화 필요 여부 확인
  async needsSync(): Promise<boolean> {
    try {
      const lastSyncTime = await this.db.getLastSyncTime();
      
      if (!lastSyncTime) {
        console.log('⚠️ 동기화 기록이 없습니다. 동기화가 필요합니다.');
        return true;
      }

      const hoursSinceLastSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
      const SYNC_INTERVAL_HOURS = 24 * 7; // 1주일

      if (hoursSinceLastSync >= SYNC_INTERVAL_HOURS) {
        console.log(`⚠️ 마지막 동기화로부터 ${hoursSinceLastSync.toFixed(1)}시간 경과. 동기화가 필요합니다.`);
        return true;
      }

      console.log(`✅ 마지막 동기화로부터 ${hoursSinceLastSync.toFixed(1)}시간 경과. 동기화 불필요.`);
      return false;
    } catch (error) {
      console.error('동기화 필요 여부 확인 실패:', error);
      return true; // 오류 시 동기화 필요로 간주
    }
  }

  // 자동 동기화 시작 (주기적 실행)
  async startAutoSync(intervalHours: number = 24 * 7): Promise<void> {
    console.log(`🤖 자동 동기화 시작 (주기: ${intervalHours}시간)`);
    
    // 초기 동기화
    const needsInitialSync = await this.needsSync();
    if (needsInitialSync) {
      await this.incrementalSync();
    }

    // 주기적 동기화 설정
    setInterval(async () => {
      console.log('🤖 자동 동기화 체크...');
      const needsSync = await this.needsSync();
      if (needsSync) {
        await this.incrementalSync();
      }
    }, intervalHours * 60 * 60 * 1000);
  }

  // 데이터베이스 상태 확인
  async checkDatabaseStatus(): Promise<{
    isReady: boolean;
    totalCount: number;
    lastSyncTime: Date | null;
    needsSync: boolean;
  }> {
    try {
      const isReady = await this.db.checkDatabaseReady();
      const lastSyncTime = await this.db.getLastSyncTime();
      const needsSync = await this.needsSync();
      
      // 전체 휴게소 수 조회
      const allRestAreas = await this.db.getRestAreas();
      
      return {
        isReady,
        totalCount: allRestAreas.length,
        lastSyncTime,
        needsSync
      };
    } catch (error) {
      console.error('데이터베이스 상태 확인 실패:', error);
      return {
        isReady: false,
        totalCount: 0,
        lastSyncTime: null,
        needsSync: true
      };
    }
  }
}

// 싱글톤 인스턴스
export const restAreaSyncService = new RestAreaSyncService();