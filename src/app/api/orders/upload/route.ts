import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createOrder, createCustomer, getProducts, updateOrderStatus, updateOrderProgress, findCustomerByNameAndBirth, assignCustomerCode, assignOrderCode, updateCustomerNickname, createCompatibilityPair } from '@/lib/db/index';

// 간지시간 → 시각 매핑
const GANJI_TO_TIME: Record<string, string> = {
  '자시': '23:30', '축시': '01:30', '인시': '03:30', '묘시': '05:30',
  '진시': '07:30', '사시': '09:30', '오시': '11:30', '미시': '13:30',
  '신시': '15:30', '유시': '17:30', '술시': '19:30', '해시': '21:30',
};

function parseExcelDate(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  // ISO datetime like "2025-03-12 00:00:00" or "2025-03-12T00:00:00"
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.slice(0, 10);
  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().slice(0, 10);
  }
  return s;
}

function parseExcelTime(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  // Already HH:MM
  if (s.match(/^\d{1,2}:\d{2}$/)) return s;
  // Datetime like "2025-03-12 00:45:46"
  if (s.match(/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}/)) {
    const timePart = s.split(/[\sT]/)[1];
    return timePart ? timePart.slice(0, 5) : '';
  }
  // Excel serial (time fraction)
  const num = Number(s);
  if (!isNaN(num) && num > 0 && num < 1) {
    const totalMin = Math.round(num * 1440);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return s;
}

function parseBirthTime(tangsaeng: any, extraCol: any): string {
  if (!tangsaeng && !extraCol) return '';
  const s = String(tangsaeng || '').trim();

  // 간지시간인 경우 (자시, 축시 등)
  for (const [ganji, time] of Object.entries(GANJI_TO_TIME)) {
    if (s.includes(ganji)) {
      // extraCol에 실제 시각이 있으면 그걸 사용
      if (extraCol) {
        const extraTime = parseExcelTime(extraCol);
        if (extraTime) return extraTime;
      }
      return time;
    }
  }

  // 일반 시각 (HH:MM 또는 HH:MM:SS)
  if (s.match(/^\d{1,2}:\d{2}/)) return s.slice(0, 5);
  // 숫자만 (예: 1430 → 14:30)
  if (s.match(/^\d{4}$/)) return s.slice(0, 2) + ':' + s.slice(2, 4);
  return s;
}

function parseGender(val: any): 'male' | 'female' {
  const s = String(val || '').trim();
  if (s === '여' || s === 'female' || s === 'F' || s === 'f') return 'female';
  return 'male';
}

function parseCalendarType(val: any): 'solar' | 'lunar' | 'leap' {
  const s = String(val || '').trim();
  if (s.includes('음')) return 'lunar';
  if (s.includes('윤')) return 'leap';
  return 'solar';
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;

  try {
    const body = await request.json();
    const { rows, productCode } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: '업로드할 데이터가 없습니다.' }, { status: 400 });
    }
    if (!productCode) {
      return NextResponse.json({ error: '상품을 선택해주세요.' }, { status: 400 });
    }

    const products = getProducts(userId) as any[];
    const product = products.find((p: any) => p.code === productCode);
    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }

    const results: Array<{ row: number; success: boolean; orderId?: number; error?: string; name?: string }> = [];

    // 궁합(saju-love) 페어링: 닉네임으로 그룹핑
    const isLoveProduct = product.code === 'saju-love';
    // 닉네임별 행 인덱스 매핑 (궁합 페어링용)
    const nicknameGroups = new Map<string, number[]>();
    if (isLoveProduct) {
      for (let i = 0; i < rows.length; i++) {
        const nick = String(rows[i]['닉네임'] || '').trim();
        if (nick) {
          if (!nicknameGroups.has(nick)) nicknameGroups.set(nick, []);
          nicknameGroups.get(nick)!.push(i);
        }
      }
    }

    // 행 인덱스 → {customerId, orderId} 매핑 (궁합 연결용)
    const rowResults = new Map<number, { customerId: number; orderId: number }>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = String(row['이름'] || '').trim();
        if (!name) {
          results.push({ row: i + 1, success: false, error: '이름 없음' });
          continue;
        }

        const birthDate = parseExcelDate(row['생년월일']);
        if (!birthDate) {
          results.push({ row: i + 1, success: false, error: '생년월일 없음', name });
          continue;
        }

        const gender = parseGender(row['성별']);
        const calendarType = parseCalendarType(row['양/음력']);
        const birthTime = parseBirthTime(row['탄생시각'], row['Unnamed: 11'] || row['실제시각']);
        const orderTime = parseExcelTime(row['시각']);
        const consultationDate = parseExcelDate(row['상담날짜']);

        const nicknameVal = String(row['닉네임'] || '').trim();

        // 궁합대상 컬럼 확인 (명시적 궁합 대상 이름)
        const partnerName = String(row['궁합대상'] || '').trim();

        // 고객 재사용: 이름+생년월일로 검색
        let customerId: number;
        const matched = findCustomerByNameAndBirth(userId, name, birthDate);
        if (matched) {
          customerId = matched.id;
          if (nicknameVal && !matched.nickname) {
            updateCustomerNickname(matched.id, userId, nicknameVal);
          }
        } else {
          const customerResult = createCustomer(userId, {
            name,
            gender,
            birth_date: birthDate,
            birth_time: birthTime,
            calendar_type: calendarType,
            phone: '',
            email: '',
            memo: '',
          });
          customerId = customerResult.lastInsertRowid as number;
          assignCustomerCode(customerId);
        }

        // Create order
        const orderResult = createOrder(userId, {
          customer_id: customerId,
          product_id: product.id,
          points_used: 0,
          extra_answer: '',
          internal_memo: '',
          nickname: nicknameVal,
          code2: String(row['코드2'] || '').trim(),
          account: String(row['계정'] || '').trim(),
          extra_question: String(row['추가질문'] || '').trim(),
          order_time: orderTime,
          consultation_date: consultationDate,
        });

        const orderId = orderResult.lastInsertRowid as number;
        assignOrderCode(orderId);
        updateOrderStatus(orderId, userId, 'pending');

        rowResults.set(i, { customerId, orderId });
        results.push({ row: i + 1, success: true, orderId, name });
      } catch (err: any) {
        results.push({ row: i + 1, success: false, error: err.message, name: row['이름'] });
      }
    }

    // 궁합 페어링 처리: 같은 닉네임의 2행을 페어링
    if (isLoveProduct) {
      for (const [nick, indices] of nicknameGroups) {
        if (indices.length === 2) {
          const r0 = rowResults.get(indices[0]);
          const r1 = rowResults.get(indices[1]);
          if (r0 && r1) {
            try {
              // 첫 번째 행의 주문에 두 사람 연결
              createCompatibilityPair(r0.orderId, r0.customerId, r1.customerId);
            } catch (e) {
              console.error(`[Upload] 궁합 페어링 실패 (${nick}):`, e);
            }
          }
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `총 ${rows.length}건 중 ${successCount}건 성공, ${failCount}건 실패`,
      results,
      successCount,
      failCount,
    });
  } catch (error: any) {
    console.error('Excel upload error:', error);
    return NextResponse.json({ error: `엑셀 업로드 실패: ${error?.message || String(error)}` }, { status: 500 });
  }
}
