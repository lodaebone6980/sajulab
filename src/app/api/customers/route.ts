import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getCustomers } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = authResult;

    // Get search query parameter
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';

    // Get all customers for the user
    const allCustomers = getCustomers(userId) as Array<{
      id: number;
      name: string;
      gender: string;
      birth_date: string;
      birth_time: string;
      calendar_type: string;
      phone: string;
      email: string;
      created_at: string;
    }>;

    // Filter by search query if provided
    let filteredCustomers = allCustomers;
    if (search) {
      filteredCustomers = allCustomers.filter((customer) =>
        customer.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json(
      {
        customers: filteredCustomers,
        total: filteredCustomers.length,
      },
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
