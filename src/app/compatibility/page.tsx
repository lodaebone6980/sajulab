'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Heart, Users, Plus, Play, RefreshCw, X, Search, FileText, Trash2, UserPlus, ChevronDown } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

// Types
interface Member {
  name: string;
  gender: 'M' | 'F';
  birthDate: string;
  birthTime: string;
  calendarType: 'solar' | 'lunar';
  relation: string;
  customerId?: string;
}

interface Pair {
  id: string;
  person1Name: string;
  person2Name: string;
  relationLabel: string;
  score?: number;
  grade?: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  result_text?: string;
}

interface CompatibilityGroup {
  id: string;
  name: string;
  type: 'family' | 'couple' | 'other';
  members: Member[];
  pairs: Pair[];
  createdAt: string;
  updatedAt: string;
}

interface CompatibilityData {
  groups: CompatibilityGroup[];
  standalone: Pair[];
}

interface Customer {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  birthTime?: string;
  calendarType: string;
}

const groupTypeLabels: { [key: string]: string } = {
  family: '가족',
  couple: '커플',
  other: '기타',
};

const statusLabels: { [key: string]: string } = {
  pending: '대기',
  analyzing: '분석중',
  completed: '완료',
  failed: '실패',
};

const statusColors: { [key: string]: string } = {
  pending: 'bg-gray-100 text-gray-700',
  analyzing: 'bg-blue-100 text-blue-700 animate-pulse',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

// Customer Search Modal
function CustomerSearchModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCustomers = useCallback(async (term: string) => {
    if (!term.trim()) {
      setCustomers([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(term)}`);
      if (!response.ok) throw new Error('고객 검색 실패');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value;
      setSearchTerm(term);
      searchCustomers(term);
    },
    [searchCustomers]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">기존 고객 불러오기</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="고객명 검색..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            autoFocus
          />
        </div>

        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">검색 중...</div>
          ) : customers.length > 0 ? (
            <div className="space-y-2">
              {customers.map((customer: any) => (
                <button
                  key={customer.id}
                  onClick={() => {
                    // Normalize snake_case DB fields to camelCase
                    const normalized: Customer = {
                      id: customer.id,
                      name: customer.name,
                      gender: customer.gender === 'male' ? 'M' : customer.gender === 'female' ? 'F' : customer.gender,
                      birthDate: customer.birth_date || customer.birthDate || '',
                      birthTime: customer.birth_time || customer.birthTime || '',
                      calendarType: customer.calendar_type || customer.calendarType || 'solar',
                    };
                    onSelect(normalized);
                    onClose();
                  }}
                  className="w-full text-left p-3 hover:bg-pink-50 rounded-lg border border-gray-200 hover:border-pink-300 transition"
                >
                  <div className="font-medium text-sm">{customer.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {customer.gender === 'male' || customer.gender === 'M' ? '남' : '여'} · {customer.birth_date || customer.birthDate || ''} · {(customer.calendar_type || customer.calendarType) === 'solar' ? '양력' : '음력'}
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="text-center py-8 text-gray-500 text-sm">검색 결과가 없습니다</div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">검색어를 입력하세요</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Text View Modal
function TextViewModal({
  isOpen,
  onClose,
  text,
}: {
  isOpen: boolean;
  onClose: () => void;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl p-6 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">궁합 분석 결과</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm mb-4 max-h-96 overflow-y-auto whitespace-pre-wrap break-words">
          {text}
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium"
        >
          {copied ? '복사됨!' : '복사하기'}
        </button>
      </div>
    </div>
  );
}

// Create Group Modal
function CreateGroupModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { groupName: string; groupType: string; members: Member[] }) => void;
}) {
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'family' | 'couple' | 'other'>('family');
  const [members, setMembers] = useState<Member[]>([
    { name: '', gender: 'M', birthDate: '', birthTime: '', calendarType: 'solar', relation: '' },
    { name: '', gender: 'F', birthDate: '', birthTime: '', calendarType: 'solar', relation: '' },
  ]);
  const [searchModalOpen, setSearchModalOpen] = useState<number | null>(null);

  const handleMemberChange = useCallback(
    (index: number, field: keyof Member, value: any) => {
      const newMembers = [...members];
      newMembers[index] = { ...newMembers[index], [field]: value };
      setMembers(newMembers);
    },
    [members]
  );

  const handleAddMember = useCallback(() => {
    setMembers([
      ...members,
      { name: '', gender: 'M', birthDate: '', birthTime: '', calendarType: 'solar', relation: '' },
    ]);
  }, [members]);

  const handleRemoveMember = useCallback(
    (index: number) => {
      if (members.length > 2) {
        setMembers(members.filter((_, i) => i !== index));
      }
    },
    [members]
  );

  const handleSelectCustomer = useCallback(
    (index: number, customer: Customer) => {
      setMembers(prev => {
        const newMembers = [...prev];
        newMembers[index] = {
          ...newMembers[index],
          name: customer.name,
          gender: customer.gender === 'M' ? 'M' : 'F',
          birthDate: customer.birthDate,
          birthTime: customer.birthTime || '',
          calendarType: customer.calendarType === 'solar' ? 'solar' : 'lunar',
          customerId: customer.id,
        };
        return newMembers;
      });
      setSearchModalOpen(null);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!groupName.trim()) {
      alert('그룹 이름을 입력하세요');
      return;
    }

    if (members.some((m) => !m.name.trim() || !m.birthDate)) {
      alert('모든 멤버의 이름과 생년월일을 입력하세요');
      return;
    }

    onSubmit({ groupName, groupType, members });
    setGroupName('');
    setGroupType('family');
    setMembers([
      { name: '', gender: 'M', birthDate: '', birthTime: '', calendarType: 'solar', relation: '' },
      { name: '', gender: 'F', birthDate: '', birthTime: '', calendarType: 'solar', relation: '' },
    ]);
    onClose();
  }, [groupName, groupType, members, onSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl p-6 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">그룹 생성</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">그룹 이름</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="예: 김가족"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">그룹 타입</label>
            <select
              value={groupType}
              onChange={(e) => setGroupType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="family">가족</option>
              <option value="couple">커플</option>
              <option value="other">기타</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">멤버</label>
              <button
                onClick={handleAddMember}
                className="flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700 font-medium"
              >
                <Plus size={16} /> 멤버 추가
              </button>
            </div>

            <div className="space-y-4">
              {members.map((member, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">멤버 {index + 1}</span>
                    {members.length > 2 && (
                      <button
                        onClick={() => handleRemoveMember(index)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">이름</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                        placeholder="이름"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">성별</label>
                      <select
                        value={member.gender}
                        onChange={(e) => handleMemberChange(index, 'gender', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="M">남</option>
                        <option value="F">여</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">생년월일</label>
                      <input
                        type="date"
                        value={member.birthDate}
                        onChange={(e) => handleMemberChange(index, 'birthDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">출생시간</label>
                      <input
                        type="time"
                        value={member.birthTime}
                        onChange={(e) => handleMemberChange(index, 'birthTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">력법</label>
                      <select
                        value={member.calendarType}
                        onChange={(e) => handleMemberChange(index, 'calendarType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="solar">양력</option>
                        <option value="lunar">음력</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">관계</label>
                      <input
                        type="text"
                        value={member.relation}
                        onChange={(e) => handleMemberChange(index, 'relation', e.target.value)}
                        placeholder="아버지, 첫째 등"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setSearchModalOpen(index)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Search size={14} /> 기존 고객 불러오기
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium"
          >
            생성
          </button>
        </div>

        {searchModalOpen !== null && (
          <CustomerSearchModal
            isOpen={true}
            onClose={() => setSearchModalOpen(null)}
            onSelect={(customer) => handleSelectCustomer(searchModalOpen, customer)}
          />
        )}
      </div>
    </div>
  );
}

// Create 1:1 Pair Modal
function CreatePairModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { person1: Member; person2: Member; relationLabel: string }) => void;
}) {
  const [person1, setPerson1] = useState<Member>({
    name: '',
    gender: 'M',
    birthDate: '',
    birthTime: '',
    calendarType: 'solar',
    relation: '',
  });
  const [person2, setPerson2] = useState<Member>({
    name: '',
    gender: 'F',
    birthDate: '',
    birthTime: '',
    calendarType: 'solar',
    relation: '',
  });
  const [relationLabel, setRelationLabel] = useState('');
  const [searchModalOpen, setSearchModalOpen] = useState<1 | 2 | null>(null);

  const handlePersonChange = useCallback(
    (person: 1 | 2, field: keyof Member, value: any) => {
      if (person === 1) {
        setPerson1((prev) => ({ ...prev, [field]: value }));
      } else {
        setPerson2((prev) => ({ ...prev, [field]: value }));
      }
    },
    []
  );

  const handleSelectCustomer = useCallback((person: 1 | 2, customer: Customer) => {
    const newData = {
      name: customer.name,
      gender: customer.gender === 'M' ? 'M' : 'F',
      birthDate: customer.birthDate,
      birthTime: customer.birthTime || '',
      calendarType: customer.calendarType === 'solar' ? 'solar' : 'lunar',
      customerId: customer.id,
    };

    if (person === 1) {
      setPerson1((prev) => ({ ...prev, ...newData }));
    } else {
      setPerson2((prev) => ({ ...prev, ...newData }));
    }
    setSearchModalOpen(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!person1.name.trim() || !person1.birthDate) {
      alert('첫 번째 사람의 이름과 생년월일을 입력하세요');
      return;
    }

    if (!person2.name.trim() || !person2.birthDate) {
      alert('두 번째 사람의 이름과 생년월일을 입력하세요');
      return;
    }

    onSubmit({ person1, person2, relationLabel });
    setPerson1({
      name: '',
      gender: 'M',
      birthDate: '',
      birthTime: '',
      calendarType: 'solar',
      relation: '',
    });
    setPerson2({
      name: '',
      gender: 'F',
      birthDate: '',
      birthTime: '',
      calendarType: 'solar',
      relation: '',
    });
    setRelationLabel('');
    onClose();
  }, [person1, person2, relationLabel, onSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl p-6 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">1:1 궁합 생성</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 mb-6">
          {/* Person 1 */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">첫 번째 사람</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={person1.name}
                  onChange={(e) => handlePersonChange(1, 'name', e.target.value)}
                  placeholder="이름"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">성별</label>
                <select
                  value={person1.gender}
                  onChange={(e) => handlePersonChange(1, 'gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="M">남</option>
                  <option value="F">여</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">생년월일</label>
                <input
                  type="date"
                  value={person1.birthDate}
                  onChange={(e) => handlePersonChange(1, 'birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">출생시간</label>
                <input
                  type="time"
                  value={person1.birthTime}
                  onChange={(e) => handlePersonChange(1, 'birthTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">력법</label>
                <select
                  value={person1.calendarType}
                  onChange={(e) => handlePersonChange(1, 'calendarType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setSearchModalOpen(1)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Search size={14} /> 기존 고객 불러오기
            </button>
          </div>

          {/* Person 2 */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">두 번째 사람</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={person2.name}
                  onChange={(e) => handlePersonChange(2, 'name', e.target.value)}
                  placeholder="이름"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">성별</label>
                <select
                  value={person2.gender}
                  onChange={(e) => handlePersonChange(2, 'gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="M">남</option>
                  <option value="F">여</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">생년월일</label>
                <input
                  type="date"
                  value={person2.birthDate}
                  onChange={(e) => handlePersonChange(2, 'birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">출생시간</label>
                <input
                  type="time"
                  value={person2.birthTime}
                  onChange={(e) => handlePersonChange(2, 'birthTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">력법</label>
                <select
                  value={person2.calendarType}
                  onChange={(e) => handlePersonChange(2, 'calendarType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="solar">양력</option>
                  <option value="lunar">음력</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setSearchModalOpen(2)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Search size={14} /> 기존 고객 불러오기
            </button>
          </div>

          {/* Relation Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">관계 (선택)</label>
            <input
              type="text"
              value={relationLabel}
              onChange={(e) => setRelationLabel(e.target.value)}
              placeholder="연인, 부부, 친구 등"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium"
          >
            생성
          </button>
        </div>

        {searchModalOpen && (
          <CustomerSearchModal
            isOpen={true}
            onClose={() => setSearchModalOpen(null)}
            onSelect={(customer) => handleSelectCustomer(searchModalOpen, customer)}
          />
        )}
      </div>
    </div>
  );
}

// Group Card
function GroupCard({
  group,
  onAnalyze,
  onDelete,
  onAddMember,
  onViewText,
}: {
  group: CompatibilityGroup;
  onAnalyze: (pairId: string) => void;
  onDelete: (groupId: string) => void;
  onAddMember: (groupId: string) => void;
  onViewText: (text: string) => void;
}) {
  const handleBatchAnalyze = useCallback(() => {
    const pendingPairs = group.pairs.filter((p) => p.status === 'pending' || p.status === 'failed');
    if (pendingPairs.length === 0) {
      alert('분석할 항목이 없습니다');
      return;
    }
    pendingPairs.forEach((pair) => onAnalyze(pair.id));
  }, [group.pairs, onAnalyze]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-pink-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-1 rounded text-xs font-medium bg-pink-100 text-pink-700">
                {groupTypeLabels[group.type]}
              </span>
              <span className="text-sm text-gray-600">멤버 {group.members.length} · 궁합 {group.pairs.length}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onDelete(group.id)}
          className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Members */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">멤버</h4>
        <div className="space-y-2">
          {group.members.map((member, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">{member.name}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  {member.gender === 'M' || member.gender === 'male' ? '남' : '여'}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {(member as any).relation_label || member.relation} · {(member as any).birth_date || member.birthDate}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pairs */}
      {group.pairs.length > 0 ? (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">궁합 분석</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">관계</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">점수</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">등급</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">상태</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">액션</th>
                </tr>
              </thead>
              <tbody>
                {group.pairs.map((pair) => (
                  <tr key={pair.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="text-sm font-medium text-gray-900">
                        {pair.person1Name} ↔ {pair.person2Name}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">{pair.relationLabel}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {pair.score !== undefined ? `${pair.score}점` : '-'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-sm text-gray-600">{pair.grade || '-'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[pair.status]}`}>
                        {statusLabels[pair.status]}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {(pair.status === 'pending' || pair.status === 'failed') && (
                          <button
                            onClick={() => onAnalyze(pair.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition font-medium"
                          >
                            <Play size={12} /> 실행
                          </button>
                        )}
                        {pair.status === 'completed' && pair.result_text && (
                          <button
                            onClick={() => onViewText(pair.result_text!)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition font-medium"
                          >
                            <FileText size={12} /> 텍스트 보기
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBatchAnalyze}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          <RefreshCw size={16} /> 전체 실행
        </button>
        <button
          onClick={() => onAddMember(group.id)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
        >
          <UserPlus size={16} /> 멤버 추가
        </button>
      </div>
    </div>
  );
}

// Main Component
export default function CompatibilityPage() {
  const [data, setData] = useState<CompatibilityData>({ groups: [], standalone: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createPairOpen, setCreatePairOpen] = useState(false);
  const [textViewOpen, setTextViewOpen] = useState(false);
  const [textViewContent, setTextViewContent] = useState('');
  const [pendingAddMember, setPendingAddMember] = useState<{ groupId: string; showModal: boolean }>({
    groupId: '',
    showModal: false,
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/compatibility');
      if (!response.ok) throw new Error('데이터 로드 실패');
      const result = await response.json();

      // Normalize snake_case DB fields to camelCase
      const normalizedGroups = (result.groups || []).map((g: any) => ({
        id: String(g.id),
        name: g.group_name || g.name || '',
        type: g.group_type || g.type || 'other',
        createdAt: g.created_at || g.createdAt || '',
        updatedAt: g.updated_at || g.updatedAt || '',
        members: (g.members || []).map((m: any) => ({
          name: m.name || '',
          gender: m.gender === 'male' ? 'M' : m.gender === 'female' ? 'F' : m.gender || 'M',
          birthDate: m.birth_date || m.birthDate || '',
          birthTime: m.birth_time || m.birthTime || '',
          calendarType: m.calendar_type || m.calendarType || 'solar',
          relation: m.relation_label || m.relation || '',
          customerId: String(m.customer_id || m.customerId || ''),
        })),
        pairs: (g.results || []).map((r: any) => ({
          id: String(r.id),
          person1Name: r.person1_name || r.person1Name || '',
          person2Name: r.person2_name || r.person2Name || '',
          relationLabel: r.relation_label || r.relationLabel || '',
          score: r.score || undefined,
          grade: r.grade || '',
          status: r.status || 'pending',
          result_text: r.result_text || '',
        })),
      }));

      const normalizedStandalone = (result.standalone || []).map((r: any) => ({
        id: String(r.id),
        person1Name: r.person1_name || r.person1Name || '',
        person2Name: r.person2_name || r.person2Name || '',
        relationLabel: r.relation_label || r.relationLabel || '',
        score: r.score || undefined,
        grade: r.grade || '',
        status: r.status || 'pending',
        result_text: r.result_text || '',
      }));

      setData({ groups: normalizedGroups, standalone: normalizedStandalone });
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create group
  const handleCreateGroup = useCallback(
    async (groupData: { groupName: string; groupType: string; members: Member[] }) => {
      try {
        const response = await fetch('/api/compatibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_group',
            groupName: groupData.groupName,
            groupType: groupData.groupType,
            members: groupData.members.map(m => ({
              ...m,
              gender: m.gender === 'M' ? 'male' : m.gender === 'F' ? 'female' : m.gender,
            })),
          }),
        });

        if (!response.ok) throw new Error('그룹 생성 실패');
        await fetchData();
      } catch (err) {
        alert(err instanceof Error ? err.message : '오류가 발생했습니다');
      }
    },
    [fetchData]
  );

  // Create 1:1 pair
  const handleCreatePair = useCallback(
    async (pairData: { person1: Member; person2: Member; relationLabel: string }) => {
      try {
        const response = await fetch('/api/compatibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_pair',
            person1: { ...pairData.person1, gender: pairData.person1.gender === 'M' ? 'male' : pairData.person1.gender === 'F' ? 'female' : pairData.person1.gender },
            person2: { ...pairData.person2, gender: pairData.person2.gender === 'M' ? 'male' : pairData.person2.gender === 'F' ? 'female' : pairData.person2.gender },
            relationLabel: pairData.relationLabel,
          }),
        });

        if (!response.ok) throw new Error('궁합 생성 실패');
        await fetchData();
      } catch (err) {
        alert(err instanceof Error ? err.message : '오류가 발생했습니다');
      }
    },
    [fetchData]
  );

  // Delete group
  const handleDeleteGroup = useCallback(
    async (groupId: string) => {
      if (!confirm('정말 삭제하시겠습니까?')) return;

      try {
        const response = await fetch('/api/compatibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_group',
            groupId,
          }),
        });

        if (!response.ok) throw new Error('그룹 삭제 실패');
        await fetchData();
      } catch (err) {
        alert(err instanceof Error ? err.message : '오류가 발생했습니다');
      }
    },
    [fetchData]
  );

  // Analyze pair
  const handleAnalyzePair = useCallback(
    async (pairId: string) => {
      try {
        const response = await fetch(`/api/compatibility/${pairId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'analyze' }),
        });

        if (!response.ok) throw new Error('분석 실행 실패');
        await fetchData();
      } catch (err) {
        alert(err instanceof Error ? err.message : '오류가 발생했습니다');
      }
    },
    [fetchData]
  );

  // Add member to group
  const handleAddMember = useCallback((groupId: string) => {
    setPendingAddMember({ groupId, showModal: true });
  }, []);

  const handleConfirmAddMember = useCallback(
    async (member: Member) => {
      if (!pendingAddMember.groupId) return;

      try {
        const response = await fetch('/api/compatibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_member',
            groupId: pendingAddMember.groupId,
            member: { ...member, gender: member.gender === 'M' ? 'male' : member.gender === 'F' ? 'female' : member.gender },
          }),
        });

        if (!response.ok) throw new Error('멤버 추가 실패');
        await fetchData();
        setPendingAddMember({ groupId: '', showModal: false });
      } catch (err) {
        alert(err instanceof Error ? err.message : '오류가 발생했습니다');
      }
    },
    [pendingAddMember.groupId, fetchData]
  );

  const handleViewText = useCallback((text: string) => {
    setTextViewContent(text);
    setTextViewOpen(true);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full mb-4"></div>
            <p className="text-gray-600">로드 중...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Heart size={32} className="text-pink-600" />
            궁합 주문 관리
          </h1>
          <p className="text-gray-600">궁합 분석을 관리합니다</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateGroupOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium"
          >
            <Plus size={20} /> 그룹 생성
          </button>
          <button
            onClick={() => setCreatePairOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium"
          >
            <Plus size={20} /> 1:1 궁합
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Groups */}
        {data.groups.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">그룹</h2>
            <div className="space-y-4">
              {data.groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onAnalyze={handleAnalyzePair}
                  onDelete={handleDeleteGroup}
                  onAddMember={handleAddMember}
                  onViewText={handleViewText}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 bg-gray-50 rounded-2xl text-center">
            <Users size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">아직 생성된 그룹이 없습니다</p>
          </div>
        )}

        {/* Standalone Pairs */}
        {data.standalone.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1:1 궁합</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">관계</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">점수</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">등급</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">상태</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.standalone.map((pair) => (
                      <tr key={pair.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            {pair.person1Name} ↔ {pair.person2Name}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">{pair.relationLabel}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">{pair.score !== undefined ? `${pair.score}점` : '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{pair.grade || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[pair.status]}`}>
                            {statusLabels[pair.status]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {(pair.status === 'pending' || pair.status === 'failed') && (
                            <button
                              onClick={() => handleAnalyzePair(pair.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition font-medium"
                            >
                              <Play size={12} /> 실행
                            </button>
                          )}
                          {pair.status === 'completed' && pair.result_text && (
                            <button
                              onClick={() => handleViewText(pair.result_text!)}
                              className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition font-medium"
                            >
                              <FileText size={12} /> 텍스트 보기
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onSubmit={handleCreateGroup}
      />

      <CreatePairModal
        isOpen={createPairOpen}
        onClose={() => setCreatePairOpen(false)}
        onSubmit={handleCreatePair}
      />

      <TextViewModal isOpen={textViewOpen} onClose={() => setTextViewOpen(false)} text={textViewContent} />

      {/* Add Member Modal */}
      {pendingAddMember.showModal && (
        <AddMemberModal
          isOpen={true}
          onClose={() => setPendingAddMember({ groupId: '', showModal: false })}
          onSubmit={handleConfirmAddMember}
        />
      )}
    </DashboardLayout>
  );
}

// Add Member Modal
function AddMemberModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (member: Member) => void;
}) {
  const [member, setMember] = useState<Member>({
    name: '',
    gender: 'M',
    birthDate: '',
    birthTime: '',
    calendarType: 'solar',
    relation: '',
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const handleChange = useCallback((field: keyof Member, value: any) => {
    setMember((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setMember({
      name: customer.name,
      gender: customer.gender === 'M' ? 'M' : 'F',
      birthDate: customer.birthDate,
      birthTime: customer.birthTime || '',
      calendarType: customer.calendarType === 'solar' ? 'solar' : 'lunar',
      customerId: customer.id,
    });
    setSearchModalOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!member.name.trim() || !member.birthDate) {
      alert('이름과 생년월일을 입력하세요');
      return;
    }

    onSubmit(member);
    setMember({
      name: '',
      gender: 'M',
      birthDate: '',
      birthTime: '',
      calendarType: 'solar',
      relation: '',
    });
    onClose();
  }, [member, onSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">멤버 추가</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
            <input
              type="text"
              value={member.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="이름"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
            <select
              value={member.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="M">남</option>
              <option value="F">여</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">생년월일</label>
            <input
              type="date"
              value={member.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">출생시간</label>
            <input
              type="time"
              value={member.birthTime}
              onChange={(e) => handleChange('birthTime', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">력법</label>
            <select
              value={member.calendarType}
              onChange={(e) => handleChange('calendarType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="solar">양력</option>
              <option value="lunar">음력</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">관계</label>
            <input
              type="text"
              value={member.relation}
              onChange={(e) => handleChange('relation', e.target.value)}
              placeholder="아버지, 어머니, 형 등"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center justify-center gap-1 w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Search size={16} /> 기존 고객 불러오기
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-medium"
          >
            추가
          </button>
        </div>

        {searchModalOpen && (
          <CustomerSearchModal
            isOpen={true}
            onClose={() => setSearchModalOpen(false)}
            onSelect={handleSelectCustomer}
          />
        )}
      </div>
    </div>
  );
}
