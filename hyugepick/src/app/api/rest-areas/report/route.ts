import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST: 휴게소 정보 제보
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reportType,
      restAreaId,
      reportedData,
      coordinates
    } = body;

    // IP 주소 가져오기
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               'unknown';

    // 세션 ID 생성 (간단한 방식)
    const sessionId = `${ip}_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    console.log('📝 사용자 제보 수신:', {
      type: reportType,
      restAreaId,
      ip: ip.substring(0, 8) + '***' // IP 마스킹
    });

    // 제보 유형별 검증
    const validReportTypes = [
      'missing_rest_area',
      'wrong_location', 
      'wrong_info',
      'closed_permanently',
      'temporarily_closed',
      'new_facility',
      'removed_facility',
      'wrong_name'
    ];

    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 제보 유형입니다.' },
        { status: 400 }
      );
    }

    // 필수 필드 검증
    if (!reportedData || typeof reportedData !== 'object') {
      return NextResponse.json(
        { success: false, error: '제보 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 스팸 방지: 같은 IP에서 최근 5분 내 동일한 제보 확인
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { data: recentReports } = await supabase
      .from('user_reports')
      .select('id')
      .eq('reporter_ip', ip)
      .eq('report_type', reportType)
      .gte('created_at', fiveMinutesAgo.toISOString());

    if (recentReports && recentReports.length > 0) {
      return NextResponse.json(
        { success: false, error: '동일한 제보를 너무 빨리 연속으로 보낼 수 없습니다.' },
        { status: 429 }
      );
    }

    // 좌표 검증 (누락된 휴게소 제보인 경우)
    if (reportType === 'missing_rest_area') {
      if (!coordinates || !coordinates.lat || !coordinates.lng) {
        return NextResponse.json(
          { success: false, error: '누락된 휴게소 제보에는 좌표가 필요합니다.' },
          { status: 400 }
        );
      }

      // 좌표 범위 검증 (한국 영토 내)
      if (coordinates.lat < 33 || coordinates.lat > 39 || 
          coordinates.lng < 124 || coordinates.lng > 132) {
        return NextResponse.json(
          { success: false, error: '유효하지 않은 좌표 범위입니다.' },
          { status: 400 }
        );
      }
    }

    // 제보 데이터 저장
    const reportData = {
      report_type: reportType,
      rest_area_id: restAreaId || null,
      reported_data: {
        ...reportedData,
        coordinates,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      reporter_ip: ip,
      reporter_session: sessionId,
      status: 'pending'
    };

    const { data: savedReport, error: saveError } = await supabase
      .from('user_reports')
      .insert(reportData)
      .select('id')
      .single();

    if (saveError) {
      console.error('제보 저장 실패:', saveError);
      throw saveError;
    }

    // 기존 휴게소의 제보 횟수 업데이트
    if (restAreaId) {
      await supabase.rpc('increment_user_reports', {
        rest_area_uuid: restAreaId
      });
    }

    console.log('✅ 제보 저장 성공:', savedReport.id);

    // 제보 유형별 응답 메시지
    const responseMessages = {
      'missing_rest_area': '누락된 휴게소 정보가 접수되었습니다. 검토 후 반영하겠습니다.',
      'wrong_location': '위치 정보 수정 요청이 접수되었습니다.',
      'wrong_info': '휴게소 정보 수정 요청이 접수되었습니다.',
      'closed_permanently': '휴게소 폐점 정보가 접수되었습니다.',
      'temporarily_closed': '휴게소 임시 휴업 정보가 접수되었습니다.',
      'new_facility': '새로운 편의시설 정보가 접수되었습니다.',
      'removed_facility': '편의시설 제거 정보가 접수되었습니다.',
      'wrong_name': '휴게소명 수정 요청이 접수되었습니다.'
    };

    return NextResponse.json({
      success: true,
      message: responseMessages[reportType as keyof typeof responseMessages],
      reportId: savedReport.id,
      estimatedProcessingTime: '1-3일'
    });

  } catch (error) {
    console.error('제보 처리 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '제보 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// GET: 제보 현황 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const restAreaId = searchParams.get('restAreaId');

    if (reportId) {
      // 특정 제보 상태 조회
      const { data: report, error } = await supabase
        .from('user_reports')
        .select('id, report_type, status, created_at, processed_at, admin_notes')
        .eq('id', reportId)
        .single();

      if (error || !report) {
        return NextResponse.json(
          { success: false, error: '제보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        report: {
          id: report.id,
          type: report.report_type,
          status: report.status,
          submittedAt: report.created_at,
          processedAt: report.processed_at,
          adminNotes: report.admin_notes
        }
      });

    } else if (restAreaId) {
      // 특정 휴게소의 제보 통계
      const { data: reports, error } = await supabase
        .from('user_reports')
        .select('report_type, status, created_at')
        .eq('rest_area_id', restAreaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 제보 통계 계산
      const stats = {
        total: reports?.length || 0,
        pending: reports?.filter(r => r.status === 'pending').length || 0,
        verified: reports?.filter(r => r.status === 'verified').length || 0,
        rejected: reports?.filter(r => r.status === 'rejected').length || 0,
        recentReports: reports?.slice(0, 5) || []
      };

      return NextResponse.json({
        success: true,
        stats
      });

    } else {
      // 전체 제보 통계
      const { data: allReports, error } = await supabase
        .from('user_reports')
        .select('report_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const stats = {
        total: allReports?.length || 0,
        pending: allReports?.filter(r => r.status === 'pending').length || 0,
        verified: allReports?.filter(r => r.status === 'verified').length || 0,
        rejected: allReports?.filter(r => r.status === 'rejected').length || 0,
        byType: {} as { [key: string]: number }
      };

      // 제보 유형별 통계
      allReports?.forEach(report => {
        stats.byType[report.report_type] = (stats.byType[report.report_type] || 0) + 1;
      });

      return NextResponse.json({
        success: true,
        stats
      });
    }

  } catch (error) {
    console.error('제보 조회 실패:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '제보 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}