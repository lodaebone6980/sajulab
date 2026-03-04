'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface UserSettings {
  id: number;
  email: string;
  name: string;
  shop_name: string;
}

export default function SettingsPage() {
  const router = useRouter();
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
  const [driveConfigured, setDriveConfigured] = useState(false);
  const [driveEmail, setDriveEmail] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveTesting, setDriveTesting] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/auth/me', {
          method: 'GET',
        });

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

    // Google Drive 설정 상태 가져오기
    const fetchDriveStatus = async () => {
      try {
        const res = await fetch('/api/settings/drive-test');
        if (res.ok) {
          const data = await res.json();
          setDriveConfigured(data.configured);
          setDriveEmail(data.serviceAccountEmail || '');
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_name: shopName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || '프로필 업데이트에 실패했습니다.');
      } else {
        setSuccess('프로필이 성공적으로 업데이트되었습니다.');
        if (user) {
          setUser({ ...user, shop_name: shopName });
        }
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

    // Validation
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
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
      }
    } catch (err: any) {
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
        {/* Header */}
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

        {/* Profile Settings Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">기본 정보</h2>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다.</p>
            </div>

            {/* Shop Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상호명
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="상호명을 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>

        {/* Google Drive Integration Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Google Drive 연동</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${driveConfigured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {driveConfigured ? '연결됨' : '미연결'}
            </span>
          </div>

          {driveConfigured ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">서비스 계정 이메일</label>
                <p className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg break-all">{driveEmail}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대상 폴더 ID</label>
                <p className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                  {driveFolderId || '(기본 - 내 드라이브 루트)'}
                </p>
              </div>

              {driveTestResult && (
                <div className={`p-3 rounded-lg text-sm ${driveTestResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {driveTestResult.message}
                </div>
              )}

              <div className="flex justify-end">
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
            <div className="text-sm text-gray-500 space-y-3">
              <p>Google Drive 연동을 위해 Railway 환경변수에 다음 값을 설정해주세요:</p>
              <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs space-y-1">
                <p>GOOGLE_SERVICE_ACCOUNT_EMAIL=서비스계정@프로젝트.iam.gserviceaccount.com</p>
                <p>GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...키내용...\n-----END PRIVATE KEY-----</p>
                <p>GOOGLE_DRIVE_FOLDER_ID=폴더ID (선택사항)</p>
              </div>
              <p className="text-xs text-gray-400">설정 후 서버를 재시작하면 자동으로 연동됩니다.</p>
            </div>
          )}
        </div>

        {/* Password Change Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">비밀번호 변경</h2>

          <form onSubmit={handleChangePassword} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호를 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호를 입력하세요 (6자 이상)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isSaving ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
