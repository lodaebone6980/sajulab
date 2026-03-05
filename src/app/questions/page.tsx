'use client';

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { HelpCircle, MessageSquare, X, Search, RefreshCw, Check, Clock, FileText, Copy } from 'lucide-react';

interface Question {
  id: number;
  order_id: number;
  extra_question: string;
  extra_answer: string;
  question_status: string;
  answered_at: string;
  customer_name: string;
  customer_code: string;
  customer_gender: string;
  customer_birth_date: string;
  product_name: string;
  product_code: string;
  order_status: string;
  created_at: string;
}

const productColorMap: Record<string, { bg: string; text: string; badge: string }> = {
  'saju-data': { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-200 text-gray-800' },
  'saju-basic': { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-200 text-blue-800' },
  'saju-premium': { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-200 text-purple-800' },
  'saju-newyear': { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-200 text-amber-800' },
  'saju-love': { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-200 text-red-800' },
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'answered'>('all');

  // Answer Modal States
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Text Modal States
  const [showTextModal, setShowTextModal] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const [textOrderInfo, setTextOrderInfo] = useState<{ name: string; product: string } | null>(null);

  // Fetch questions
  useEffect(() => {
    fetchQuestions();
  }, [filterStatus]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const filterParam = filterStatus === 'all' ? '' : `?filter=${filterStatus}`;
      const response = await fetch(`/api/questions${filterParam}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter questions based on search
  const filteredQuestions = questions.filter(q => {
    if (!search) return true;
    const q_lower = search.toLowerCase();
    return (
      q.customer_name.toLowerCase().includes(q_lower) ||
      q.customer_code.toLowerCase().includes(q_lower) ||
      q.extra_question.toLowerCase().includes(q_lower)
    );
  });

  // Open answer modal for new or edit
  const openAnswerModal = (question: Question) => {
    setSelectedQuestion(question);
    setAnswerText(question.extra_answer || '');
    setSaveError('');
    setShowAnswerModal(true);
  };

  // Save answer
  const handleSaveAnswer = async () => {
    if (!selectedQuestion) return;
    setIsSaving(true);
    setSaveError('');

    try {
      const response = await fetch('/api/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedQuestion.order_id,
          answer: answerText,
        }),
      });

      if (response.ok) {
        setShowAnswerModal(false);
        setAnswerText('');
        setSelectedQuestion(null);
        await fetchQuestions();
      } else {
        setSaveError('답변 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('Failed to save answer:', err);
      setSaveError('답변 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open text modal
  const openTextModal = async (orderId: number, question: Question) => {
    setTextLoading(true);
    setTextContent('');
    setShowTextModal(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/text`);
      if (!res.ok) throw new Error('텍스트 로드 실패');
      const data = await res.json();
      setTextContent(data.text || '데이터 없음');
      setTextOrderInfo({ name: question.customer_name, product: question.product_name });
    } catch (err) {
      setTextContent('분석 텍스트를 불러올 수 없습니다.');
    } finally {
      setTextLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Get gender badge
  const getGenderBadge = (gender: string) => {
    if (gender === 'male') return '남';
    if (gender === 'female') return '여';
    return '-';
  };

  // Get product badge
  const getProductBadge = (productCode: string) => {
    const colors = productColorMap[productCode] || {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      badge: 'bg-gray-200 text-gray-800',
    };
    return colors;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle size={28} className="text-indigo-600" />
            추가 질문 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">고객의 추가 질문을 관리하고 답변합니다</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                미답변
              </button>
              <button
                onClick={() => setFilterStatus('answered')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterStatus === 'answered'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                답변완료
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="고객명, 질문 검색..."
                className="flex-1 border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchQuestions()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">로드 중...</span>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <HelpCircle size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">추가 질문이 없습니다</h3>
              <p className="text-sm text-gray-500">
                {search ? '검색 조건에 맞는 질문이 없습니다.' : '새로운 추가 질문이 들어올 때까지 기다립니다.'}
              </p>
            </div>
          ) : (
            filteredQuestions.map(question => {
              const productColor = getProductBadge(question.product_code);
              const isAnswered = question.question_status === 'answered';

              return (
                <div
                  key={question.id}
                  className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md ${productColor.bg}`}
                >
                  {/* Customer & Product Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{question.customer_name}</span>
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {question.customer_code}
                          </span>
                          <span className="text-xs font-medium text-gray-600">
                            {getGenderBadge(question.customer_gender)}
                          </span>
                          <span className="text-xs text-gray-500">{question.customer_birth_date}</span>
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${productColor.badge}`}
                          >
                            {question.product_name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isAnswered && question.answered_at && (
                        <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <Check size={14} />
                          {formatDate(question.answered_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">질문</p>
                    <p className="text-sm text-gray-800 leading-relaxed">{question.extra_question}</p>
                  </div>

                  {/* Answer Text (if exists) */}
                  {isAnswered && question.extra_answer && (
                    <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <p className="text-xs font-medium text-indigo-700 mb-1">답변</p>
                      <p className="text-sm text-indigo-900 leading-relaxed">{question.extra_answer}</p>
                    </div>
                  )}

                  {/* Footer Info & Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        📅 {formatDate(question.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        {isAnswered ? (
                          <>
                            <Check size={14} className="text-green-600" />
                            <span className="text-green-600 font-medium">답변완료</span>
                          </>
                        ) : (
                          <>
                            <Clock size={14} className="text-amber-600" />
                            <span className="text-amber-600 font-medium">미답변</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAnswerModal(question)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                      >
                        <MessageSquare size={14} />
                        {isAnswered ? '수정' : '답변 작성'}
                      </button>
                      <button
                        onClick={() => openTextModal(question.order_id, question)}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                      >
                        <FileText size={14} />
                        분석 텍스트 보기
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Stats Footer */}
        {!isLoading && questions.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            총 <span className="font-bold text-gray-900">{total}</span>개 |{' '}
            <span className="font-bold text-amber-600">
              {questions.filter(q => q.question_status === 'pending').length}개 미답변
            </span>{' '}
            |{' '}
            <span className="font-bold text-green-600">
              {questions.filter(q => q.question_status === 'answered').length}개 답변완료
            </span>
          </div>
        )}
      </div>

      {/* ========== Answer Modal ========== */}
      {showAnswerModal && selectedQuestion && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowAnswerModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">답변 작성</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedQuestion.customer_name} - {selectedQuestion.product_name}
                </p>
              </div>
              <button
                onClick={() => setShowAnswerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Question Display */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">질문</p>
                <p className="text-sm text-gray-800 leading-relaxed">{selectedQuestion.extra_question}</p>
              </div>

              {/* Answer Input */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">답변</label>
                <textarea
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  placeholder="고객의 질문에 대한 답변을 작성하세요..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={8}
                />
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {answerText.length}자 / 5000자
                  </p>
                  {answerText.length > 5000 && (
                    <p className="text-xs text-red-600 font-medium">최대 5000자를 초과했습니다.</p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 font-medium">{saveError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowAnswerModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveAnswer}
                  disabled={isSaving || answerText.length > 5000}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      저장
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== Text Modal ========== */}
      {showTextModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowTextModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">분석 텍스트</h3>
                {textOrderInfo && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {textOrderInfo.name} - {textOrderInfo.product}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(textContent);
                    alert('클립보드에 복사되었습니다.');
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <Copy size={14} />
                  복사
                </button>
                <button
                  onClick={() => setShowTextModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {textLoading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw size={24} className="animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">텍스트 변환 중...</span>
                </div>
              ) : (
                <>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[65vh]">
                    <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-words">
                      {textContent}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    총 {textContent.split('\n').length}줄 | 프롬프트에 활용하려면 &quot;복사&quot; 버튼을 눌러 클립보드에 복사하세요.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
