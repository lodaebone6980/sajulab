import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  createCompatibilityGroup, addCompatibilityMember, getCompatibilityGroups,
  getStandaloneCompatibilityResults, createCompatibilityResult,
  generateGroupPairs, findCustomerByNameAndBirth, createCustomer,
  assignCustomerCode, deleteCompatibilityGroup,
} from '@/lib/db/index';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const groups = getCompatibilityGroups(auth.userId);
    const standalone = getStandaloneCompatibilityResults(auth.userId);
    return NextResponse.json({ groups, standalone });
  } catch (error) {
    console.error('Compatibility GET error:', error);
    return NextResponse.json({ error: '궁합 데이터 조회 실패' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { action } = body;

    // 그룹 생성
    if (action === 'create_group') {
      const { groupName, groupType, members } = body;
      if (!groupName || !members || members.length < 2) {
        return NextResponse.json({ error: '그룹명과 최소 2명의 멤버가 필요합니다.' }, { status: 400 });
      }

      const groupId = createCompatibilityGroup(auth.userId, { groupName, groupType: groupType || 'custom' });

      // 멤버 추가 (기존 고객 또는 새로 생성)
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        let customerId = m.customerId;
        if (!customerId && m.name && m.birthDate) {
          const existing = findCustomerByNameAndBirth(auth.userId, m.name, m.birthDate);
          if (existing) {
            customerId = existing.id;
          } else {
            const result = createCustomer(auth.userId, {
              name: m.name, gender: m.gender || 'male',
              birth_date: m.birthDate, birth_time: m.birthTime || '',
              calendar_type: m.calendarType || 'solar', phone: '', email: '',
            }) as any;
            customerId = result.lastInsertRowid;
            assignCustomerCode(customerId);
          }
        }
        if (customerId) {
          addCompatibilityMember(groupId, customerId, m.relation || '', i);
        }
      }

      // 모든 쌍 자동 생성
      const pairIds = generateGroupPairs(auth.userId, groupId);

      return NextResponse.json({ groupId, pairsCreated: pairIds.length });
    }

    // 1:1 궁합 생성
    if (action === 'create_pair') {
      const { person1, person2, relationLabel } = body;

      const getOrCreate = async (p: any) => {
        if (p.customerId) return p.customerId;
        const existing = findCustomerByNameAndBirth(auth.userId, p.name, p.birthDate);
        if (existing) return existing.id;
        const result = createCustomer(auth.userId, {
          name: p.name, gender: p.gender || 'male',
          birth_date: p.birthDate, birth_time: p.birthTime || '',
          calendar_type: p.calendarType || 'solar', phone: '', email: '',
        }) as any;
        assignCustomerCode(result.lastInsertRowid);
        return result.lastInsertRowid;
      };

      const cid1 = await getOrCreate(person1);
      const cid2 = await getOrCreate(person2);

      const resultId = createCompatibilityResult(auth.userId, {
        customerId1: cid1, customerId2: cid2, relationLabel: relationLabel || '',
      });

      return NextResponse.json({ resultId });
    }

    // 그룹 삭제
    if (action === 'delete_group') {
      deleteCompatibilityGroup(body.groupId, auth.userId);
      return NextResponse.json({ message: '삭제되었습니다.' });
    }

    // 그룹에 멤버 추가 + 새 쌍 생성
    if (action === 'add_member') {
      const { groupId, member } = body;
      let customerId = member.customerId;
      if (!customerId && member.name && member.birthDate) {
        const existing = findCustomerByNameAndBirth(auth.userId, member.name, member.birthDate);
        if (existing) {
          customerId = existing.id;
        } else {
          const result = createCustomer(auth.userId, {
            name: member.name, gender: member.gender || 'male',
            birth_date: member.birthDate, birth_time: member.birthTime || '',
            calendar_type: member.calendarType || 'solar', phone: '', email: '',
          }) as any;
          customerId = result.lastInsertRowid;
          assignCustomerCode(customerId);
        }
      }
      if (customerId) {
        addCompatibilityMember(groupId, customerId, member.relation || '', 99);
        generateGroupPairs(auth.userId, groupId);
      }
      return NextResponse.json({ message: '멤버가 추가되었습니다.' });
    }

    return NextResponse.json({ error: '잘못된 액션입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Compatibility POST error:', error);
    return NextResponse.json({ error: '궁합 처리 중 오류 발생' }, { status: 500 });
  }
}
