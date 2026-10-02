import { apiRequest } from './client';

export async function fetchProfile() {
  const res = await apiRequest('/protected/profile', { auth: true });
  return res.user;
}

export async function uploadProfileImage(asset) {
  if (!asset?.uri) throw new Error('Please select a profile image');

  const formData = new FormData();
  formData.append('profile_image', {
    uri: asset.uri,
    type: asset.type || 'image/jpeg',
    name: asset.fileName || `profile-${Date.now()}.jpg`,
  });

  const res = await apiRequest('/protected/profile/image', {
    method: 'PUT',
    auth: true,
    body: formData,
  });
  return res.user || { profile_image: res.profile_image };
}
