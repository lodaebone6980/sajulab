'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface UserSettings {
  id: number;
  email: string;
  name: string;
  shop_name: string;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </DashboardLayout>
    }>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Google Drive state
  const [driveConnected, setDriveConnected] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [driveEmail, setDriveEmail] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveTesting, setDriveTesting] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveDisconnecting, setDriveDisconnecting] = useState(false);

  // URL 파라미터로 Drive 연결 결과 처리
  useEffect(() => {
    const driveSuccess = searchParams.get('drive_success');
    const driveError = searchParams.get('drive_error');

    if (driveSuccess) {
      setSuccess('Google Drive가 성공적으로 연결되었습니다!');
      // URL 파라미터 제거
      router.replace('/settings', { scroll: false });
    }
    if (driveError) {
      setError(decodeURIComponent(driveError));
      router.replace('/settings', { scroll: false });
    }
  }, [searchParams, router]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/auth/me', { method: 'GET' });

        if (!response.ok) {
          setError('사용자 정보를 불러올 수 없습니다.');
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setUser(data.user);
        setShopName(data.user.shop_name || '');
        setEmail(data.user.email);
        setError('');
      } catch (err) {
        console.error('Fetch user error:', err);
        setError('사용자 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    // Google Drive 상태 가져오기
    const fetchDriveStatus = async () => {
      try {
        const res = await fetch('/api/settings/drive-test');
        if (res.ok) {
          const data = await res.json();
          setOauthConfigured(data.oauthConfigured);
          setDriveConnected(data.configured);
          setDriveEmail(data.driveEmail || '');
          setDriveFolderId(data.folderId || '');
        }
      } catch { /* ignore */ }
    };
    fetchDriveStatus();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_name: shopName }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || '프로필 업데이트에 실패했습니다.');
      } else {
        setSuccess('프로필이 성공적으로 업데이트되었습니다.');
        if (user) setUser({ ...user, shop_name: shopName });
      }
    } catch (err) {
      console.error('Update profile error:', err);
      setError('프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      setIsSaving(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      setIsSaving(false);
      return;
    }
    if (newPassword.length < 6) {
      setError('새 비밀번호는 6자 이상이어야 합니다.');
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || '비밀번호 변경에 실패했습니다.');
      } else {
        setSuccess('비밀번호가 성공적으로 변경되었습니다.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error('Change password error:', err);
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Google Drive 연결 시작
  const handleDriveConnect = async () => {
    setDriveConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google');
      const data = await res.json();
      if (res.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Google Drive 연결 실패');
        setDriveConnecting(false);
      }
    } catch (err) {
      setError('Google Drive 연결 중 오류가 발생했습니다.');
      setDriveConnecting(false);
    }
  };

  // Google Drive 연결 해제
  const handleDriveDisconnect = async () => {
    if (!confirm('Google Drive 연결을 해제하시겠습니까?\n새로 생성되는 PDF가 더 이상 Drive에 업로드되지 않습니다.')) return;
    setDriveDisconnecting(true);
    try {
      const res = await fetch('/api/settings/drive-test', { method: 'DELETE' });
      if (res.ok) {
        setDriveConnected(false);
        setDriveEmail('');
        setDriveFolderId('');
        setDriveTestResult(null);
        setSuccess('Google Drive 연결이 해제되었습니다.');
      }
    } catch {
      setError('연결 해제 중 오류가 발생했습니다.');
    } finally {
      setDriveDisconnecting(false);
    }
  };

  // Drive 연결 테스트
  const handleDriveTest = async () => {
    setDriveTesting(true);
    setDriveTestResult(null);
    try {
      const res = await fetch('/api/settings/drive-test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setDriveTestResult({ success: true, message: data.message });
      } else {
        setDriveTestResult({ success: false, message: data.error });
        if (data.needReconnect) {
          setDriveConnected(false);
          setDriveEmail('');
        }
      }
    } catch {
      setDriveTestResult({ success: false, message: '연결 테스트 중 오류가 발생했습니다.' });
    } finally {
      setDriveTesting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">설정</h1>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">기본 정보</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <input type="email" value={email} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed" />
              <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상호명</label>
              <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="상호명을 입력하세요" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={isSaving} className="px-6 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors">
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>

        {/* Google Drive Integration */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Google Drive 연동</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${driveConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {driveConnected ? '연결됨' : '미연결'}
            </span>
          </div>

          {driveConnected ? (
            <div className="space-y-4">
              {/* 연결된 계정 정보 */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  G
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{driveEmail}</p>
                  <p className="text-xs text-gray-500">Google Drive 연결됨</p>
                </div>
              </div>

              {driveFolderId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">대상 폴더 ID</label>
                  <p className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">{driveFolderId}</p>
                </div>
              )}

              {driveTestResult && (
                <div className={`p-3 rounded-lg text-sm ${driveTestResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {driveTestResult.message}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleDriveDisconnect}
                  disabled={driveDisconnecting}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  {driveDisconnecting ? '해제 중...' : '연결 해제'}
                </button>
                <button
                  onClick={handleDriveTest}
                  disabled={driveTesting}
                  className="px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  {driveTesting ? '테스트 중...' : '연동 테스트'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Google Drive를 연결하면 생성된 사주분석 PDF가 자동으로 내 Google Drive에 저장됩니다.
              </p>

              {oauthConfigured ? (
                <div className="flex justify-center">
                  <button
                    onClick={handleDriveConnect}
                    disabled={driveConnecting}
                    className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 rounded-lg transition-all shadow-sm"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="font-medium text-gray-700">
                      {driveConnecting ? '연결 중...' : 'Google Drive 연결하기'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-500 space-y-3">
                  <p>Google Drive 연동을 위해 Railway 환경변수에 다음 값을 설정해주세요:</p>
                  <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs space-y-1">
                    <p>GOOGLE_CLIENT_ID=OAuth 클라이언트 ID</p>
                    <p>GOOGLE_CLIENT_SECRET=OAuth 클라이언트 시크릿</p>
                  </div>
                  <p className="text-xs text-gray-400">Google Cloud Console에서 OAuth2 자격증명을 생성하세요.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Password Change */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">비밀번호 변경</h2>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">현재 비밀번호</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="현재 비밀번호를 입력하세요" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="새 비밀번호를 입력하세요 (6자 이상)" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호 확인</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="새 비밀번호를 다시 입력하세요" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={isSaving} className="px-6 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors">
                {isSaving ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
