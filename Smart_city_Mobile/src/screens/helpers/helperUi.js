export const HELPER_SERVICE_ICONS = {
  'House Helper': 'home-outline',
  Cleaning: 'sparkles-outline',
  Cooking: 'restaurant-outline',
  Laundry: 'shirt-outline',
  'Elder Care': 'hand-left-outline',
  'Child Care': 'happy-outline',
  Maintenance: 'construct-outline',
};

export const HELPER_GENDER_OPTIONS = [
  {
    label: 'No preference',
    value: 'No Preference',
    icon: 'male-female-outline',
  },
  { label: 'Female', value: 'Female', icon: 'female-outline' },
  { label: 'Male', value: 'Male', icon: 'male-outline' },
];

export function getHelperServiceIcon(category) {
  return HELPER_SERVICE_ICONS[category] || 'people-outline';
}

export function normalizeHelperCatalog(items, fallback = []) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  const seen = new Set();

  return source.filter(item => {
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

export function buildHelperQuery(gender) {
  return {
    status: 'Active',
    ...(gender && gender !== 'No Preference' ? { gender } : {}),
  };
}

export function filterMatchingHelpers(items, gender) {
  if (!Array.isArray(items)) return [];

  return items.filter(item => {
    const active = String(item?.status || 'Active').toLowerCase() === 'active';
    const genderMatches =
      !gender ||
      gender === 'No Preference' ||
      String(item?.gender || '').toLowerCase() === gender.toLowerCase();
    return active && genderMatches;
  });
}

export function buildHelperRequestPayload({ category, gender, note, helper }) {
  return {
    ...(helper?._id ? { helper_id: helper._id } : {}),
    type: category,
    gender_preferred: gender || 'No Preference',
    note: String(note || '').trim(),
  };
}
