import { apiRequest, setTokens, clearTokens } from './client';

export async function loginStep1(email, password) {
  return apiRequest('/auth/login/step1', {
    method: 'POST',
    body: { email, password, },
  });
}

export async function loginStep2(email, otp) {
  const res = await apiRequest('/auth/login/step2', {
    method: 'POST',
    body: { email, otp },
  });
  await setTokens({
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
  });
  return res;
}

export async function logout(email) {
  try {
    if (email) {
      await apiRequest('/auth/logout', { method: 'POST', body: { email } });
    }
  } finally {
    await clearTokens();
  }
}

export async function forgotPasswordStep1(email) {
  return apiRequest('/auth/forgot-password/step1', {
    method: 'POST',
    body: { email },
  });
}

export async function forgotPasswordStep2(email, otp, newPassword) {
  return apiRequest('/auth/forgot-password/step2', {
    method: 'POST',
    body: { email, otp, newPassword },
  });
}
