'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ChevronLeft, ChevronRight, Search, Plus, Trash2, X } from 'lucide-react';

interface ConsultationStats {
  total: number;
  inProgress: number;
  completed: number;
  noShow: number;
}

interface Consultation {
  id: number;
  date: string;
  chat_history: string;
  chat_link: string;
  status: string;
  gender: string;
  name: string;
  birth_date: string;
  calendar_type: string;
  birth_time: string;
  ganji: string;
  email: string;
  product: string;
  amount: number;
  question: string;
  additional_payment: string;
  note: string;
}

const emptyConsultation = {
  date: '',
  chat_history: '',
  chat_link: '',
  status: 'pending',
  gender: '',
  name: '',
  birth_date: '',
  calendar_type: 'solar',
  birth_time: '',
  ganji: '',
  email: '',
  product: '',
  amount: 0,
  question: '',
  additional_payment: '',
  note: '',
};

const statusLabels: Record<string, string> = {
  pending: '대기',
  in_progress: '진행중',
  completed: '완료',
  no_show: '미출',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700',
};

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [stats, setStats] = useState<ConsultationStats>({ total: 0, inProgress: 0, completed: 0, noShow: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...emptyConsultation });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchConsultations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const response = await fetch(`/api/consultations?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations || []);
        setStats(data.stats || { total: 0, inProgress: 0, completed: 0, noShow: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch consultations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, statusFilter, search]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const navigateDate = (direction: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => setSelectedDate(new Date().toISOString().split('T')[0]);

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
  };

  // 새 기록 모달 열기
  const openNewModal = () => {
    setEditingId(null);
    setFormData({ ...emptyConsultation, date: selectedDate });
    setShowModal(true);
  };

  // 수정 모달 열기
  const openEditModal = (item: Consultation) => {
    setEditingId(item.id);
    setFormData({
      date: item.date || '',
      chat_history: item.chat_history || '',
      chat_link: item.chat_link || '',
      status: item.status || 'pending',
      gender: item.gender || '',
      name: item.name || '',
      birth_date: item.birth_date || '',
      calendar_type: item.calendar_type || 'solar',
      birth_time: item.birth_time || '',
      ganji: item.ganji || '',
      email: item.email || '',
      product: item.product || '',
      amount: item.amount || 0,
      question: item.question || '',
      additional_payment: item.additional_payment || '',
      note: item.note || '',
    });
    setShowModal(true);
  };

  // 저장 (생성/수정)
  const handleSave = async () => {
    try {
      if (editingId) {
        await fetch('/api/consultations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...formData }),
        });
      } else {
        await fetch('/api/consultations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      fetchConsultations();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // 새 행 추가 (빈 행 바로 추가)
  const addQuickRow = async () => {
    try {
      await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, status: 'pending' }),
      });
      fetchConsultations();
    } catch (err) {
      console.error('Quick add failed:', err);
    }
  };

  // 선택 삭제
  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };
  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await fetch('/api/consultations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      fetchConsultations();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // 인라인 상태 변경
  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch('/api/consultations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchConsultations();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === consultations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(consultations.map(c => c.id)));
    }
  };

  const columns = ['#', '날짜', '채팅내역', '채팅링크', '상태', '성별', '이름', '생년월일', '음양', '시간', '간지', '이메일', '상품', '금액', '질문', '추가입금', '비고'];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">상담 기록</h1>
            <p className="text-sm text-gray-500 mt-1">당근마켓 등 채팅 상담 기록을 관리합니다</p>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            새 기록
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => navigateDate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-400">📅</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <button onClick={() => navigateDate(1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              <ChevronRight size={18} />
            </button>
            <button onClick={goToToday} className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 ml-1">
              오늘
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-400">🔽</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="all">전체 상태</option>
              <option value="pending">대기</option>
              <option value="in_progress">진행중</option>
              <option value="completed">완료</option>
              <option value="no_show">미출</option>
            </select>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름, 이메일, 휴대폰 검색..."
              className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto text-sm">
            <span className="text-gray-600">총 <strong>{stats.total}</strong>건</span>
            <span className="text-blue-600">진행중 <strong>{stats.inProgress}</strong>건</span>
            <span className="text-green-600">완료 <strong>{stats.completed}</strong>건</span>
            <span className="text-red-600">미출 <strong>{stats.noShow}</strong>건</span>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">총 <strong>{consultations.length}</strong>건</span>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-blue-600">{selectedIds.size}건 선택됨</span>
                  <button onClick={handleDelete} className="ml-2 flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium">
                    <Trash2 size={12} />
                    선택 삭제
                  </button>
                </>
              )}
            </div>
            <button
              onClick={addQuickRow}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={12} />
              새 행 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={consultations.length > 0 && selectedIds.size === consultations.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  {columns.map(col => (
                    <th key={col} className="text-left px-3 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-16 text-center text-gray-400 text-sm">
                      로딩 중...
                    </td>
                  </tr>
                ) : consultations.length > 0 ? (
                  consultations.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                      onDoubleClick={() => openEditModal(item)}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.date || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-[150px] truncate">{item.chat_history || '-'}</td>
                      <td className="px-3 py-3 text-sm">
                        {item.chat_link ? (
                          <a href={item.chat_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">링크</a>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <select
                          value={item.status}
                          onChange={e => updateStatus(item.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${statusColors[item.status] || 'bg-gray-100 text-gray-700'}`}
                        >
                          <option value="pending">대기</option>
                          <option value="in_progress">진행중</option>
                          <option value="completed">완료</option>
                          <option value="no_show">미출</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {item.gender === 'male' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">남</span>
                        ) : item.gender === 'female' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-100 text-pink-700 text-xs font-bold">여</span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 font-medium">{item.name || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.birth_date || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {item.calendar_type === 'solar' ? '양력' : item.calendar_type === 'lunar' ? '음력' : item.calendar_type === 'leap' ? '윤달' : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.birth_time || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.ganji || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {item.email ? (
                          <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline">{item.email}</a>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.product || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.amount ? item.amount.toLocaleString() : '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-[150px] truncate">{item.question || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{item.additional_payment || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-[150px] truncate">{item.note || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-20 text-center">
                      <p className="text-gray-500 font-medium">등록된 상담 기록이 없습니다</p>
                      <p className="text-gray-400 text-sm mt-1">상단의 &apos;새 기록&apos; 버튼을 클릭하세요</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 mx-4 max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">삭제 확인</h3>
            <p className="text-gray-600 mb-6">{selectedIds.size}건의 기록을 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? '상담 기록 수정' : '새 상담 기록'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* 고객 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="고객 이름"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                  <div className="flex gap-3 pt-1">
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))} />
                      <span className="text-sm">남</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))} />
                      <span className="text-sm">여</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                  <input
                    type="text"
                    value={formData.birth_date}
                    onChange={e => setFormData(p => ({ ...p, birth_date: e.target.value }))}
                    placeholder="1990-01-01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">출생시간</label>
                  <input
                    type="text"
                    value={formData.birth_time}
                    onChange={e => setFormData(p => ({ ...p, birth_time: e.target.value }))}
                    placeholder="14:30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">음양력</label>
                  <select
                    value={formData.calendar_type}
                    onChange={e => setFormData(p => ({ ...p, calendar_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="solar">양력</option>
                    <option value="lunar">음력</option>
                    <option value="leap">윤달</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">간지</label>
                  <input
                    type="text"
                    value={formData.ganji}
                    onChange={e => setFormData(p => ({ ...p, ganji: e.target.value }))}
                    placeholder="간지 정보"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* 상담 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">대기</option>
                    <option value="in_progress">진행중</option>
                    <option value="completed">완료</option>
                    <option value="no_show">미출</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상품</label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={e => setFormData(p => ({ ...p, product: e.target.value }))}
                    placeholder="상품명"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">금액</label>
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={e => setFormData(p => ({ ...p, amount: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">채팅내역</label>
                <textarea
                  value={formData.chat_history}
                  onChange={e => setFormData(p => ({ ...p, chat_history: e.target.value }))}
                  placeholder="채팅 내역을 입력하세요"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">채팅링크</label>
                <input
                  type="url"
                  value={formData.chat_link}
                  onChange={e => setFormData(p => ({ ...p, chat_link: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">질문</label>
                <textarea
                  value={formData.question}
                  onChange={e => setFormData(p => ({ ...p, question: e.target.value }))}
                  placeholder="고객 질문 사항"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">추가입금</label>
                  <input
                    type="text"
                    value={formData.additional_payment}
                    onChange={e => setFormData(p => ({ ...p, additional_payment: e.target.value }))}
                    placeholder="추가입금 정보"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={e => setFormData(p => ({ ...p, note: e.target.value }))}
                    placeholder="비고"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {editingId ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
