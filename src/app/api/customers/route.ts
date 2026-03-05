import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getCustomers, getCustomersWithAnalyses } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const withAnalyses = searchParams.get('withAnalyses') === 'true';

    if (withAnalyses) {
      let customers = getCustomersWithAnalyses(userId) as any[];
      if (search) {
        const q = search.toLowerCase();
        customers = customers.filter((c: any) =>
          c.name?.toLowerCase().includes(q) ||
          c.nickname?.toLowerCase().includes(q) ||
          c.customer_code?.toLowerCase().includes(q)
        );
      }
      return NextResponse.json({ customers, total: customers.length }, { status: 200 });
    }

    const allCustomers = getCustomers(userId) as any[];

    let filteredCustomers = allCustomers;
    if (search) {
      const q = search.toLowerCase();
      filteredCustomers = allCustomers.filter((c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.nickname?.toLowerCase().includes(q) ||
        c.customer_code?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json(
      { customers: filteredCustomers, total: filteredCustomers.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
