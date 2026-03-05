import { uploadPdfToDriveOAuth, refreshAccessToken } from './index';
import { getUserGoogleTokens, updateUserGoogleTokens, updateOrderDriveInfo } from '@/lib/db';

/**
 * 사용자의 Google Drive에 PDF 업로드하는 헬퍼
 * - 사용자의 OAuth 토큰을 자동으로 가져와서 사용
 * - 토큰 만료 시 자동 갱신
 * - 주문 DB에 Drive 정보 업데이트
 */
export async function uploadPdfToUserDrive(
  pdfBuffer: Buffer,
  fileName: string,
  userId: number,
  orderId: number,
): Promise<{ success: boolean; webViewLink?: string; error?: string }> {
  try {
    const tokens = getUserGoogleTokens(userId);
    if (!tokens?.google_refresh_token) {
      console.log(`[Drive Upload] User ${userId} has no Drive connected, skipping`);
      return { success: false, error: 'Drive not connected' };
    }

    // 토큰 갱신 확인
    let accessToken = tokens.google_access_token;
    const isExpired = !tokens.google_token_expiry || new Date(tokens.google_token_expiry) < new Date();

    if (isExpired) {
      try {
        const refreshed = await refreshAccessToken(tokens.google_refresh_token);
        accessToken = refreshed.access_token;
        updateUserGoogleTokens(userId, {
          refresh_token: tokens.google_refresh_token,
          access_token: refreshed.access_token,
          token_expiry: refreshed.expiry_date,
          drive_email: tokens.google_drive_email,
        });
      } catch (err: any) {
        console.error(`[Drive Upload] Token refresh failed for user ${userId}:`, err.message);
        return { success: false, error: 'Token refresh failed' };
      }
    }

    // 업로드
    const result = await uploadPdfToDriveOAuth(
      pdfBuffer,
      fileName,
      accessToken,
      tokens.google_refresh_token,
      tokens.google_drive_folder_id || undefined
    );

    // DB 업데이트
    updateOrderDriveInfo(orderId, userId, result.fileId, result.webViewLink);

    console.log(`[Drive Upload] Order ${orderId} uploaded to Drive: ${result.webViewLink}`);
    return { success: true, webViewLink: result.webViewLink };
  } catch (err: any) {
    console.error(`[Drive Upload] Order ${orderId} failed:`, err.message);
    return { success: false, error: err.message };
  }
}
