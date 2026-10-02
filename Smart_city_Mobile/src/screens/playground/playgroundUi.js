export const DEFAULT_PLAYGROUND_SLOTS = ['Morning', 'Afternoon', 'Evening'];

const SLOT_ICONS = {
  morning: 'partly-sunny-outline',
  afternoon: 'sunny-outline',
  evening: 'moon-outline',
};

export function normalizePlaygroundSlots(configSlots) {
  if (!Array.isArray(configSlots)) return DEFAULT_PLAYGROUND_SLOTS;

  const slots = configSlots.filter(
    (slot, index) =>
      typeof slot === 'string' &&
      slot.trim().length > 0 &&
      configSlots.indexOf(slot) === index,
  );

  return slots.length ? slots : DEFAULT_PLAYGROUND_SLOTS;
}

export function getPlaygroundSlotIcon(slot) {
  return (
    SLOT_ICONS[
      String(slot || '')
        .trim()
        .toLowerCase()
    ] || 'time-outline'
  );
}

export function getPlaygroundValidation({ childName, childAge, date }) {
  if (!String(childName || '').trim()) {
    return {
      title: 'Child name required',
      message: 'Enter the child name for this registration.',
    };
  }

  const age = Number(childAge);
  if (!Number.isInteger(age) || age < 1 || age > 17) {
    return {
      title: 'Invalid age',
      message: 'Child age must be between 1 and 17.',
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '').trim())) {
    return {
      title: 'Invalid date',
      message: 'Use the YYYY-MM-DD date format.',
    };
  }

  return null;
}

export function buildPlaygroundRegistrationPayload({
  childName,
  childAge,
  date,
  timeSlot,
  paymentMethod,
  hasPaidPrice,
  notes,
}) {
  return {
    child_name: String(childName || '').trim(),
    child_age: Number(childAge),
    requested_date: String(date || '').trim(),
    time_slot: timeSlot,
    payment_method: hasPaidPrice ? paymentMethod : 'Pay at desk',
    notes: String(notes || '').trim(),
  };
}

export function getPlaygroundStatusTone(status) {
  switch (String(status || '').toLowerCase()) {
    case 'confirmed':
      return 'confirmed';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'pending':
    case 'waitlisted':
      return 'warning';
    default:
      return 'neutral';
  }
}
