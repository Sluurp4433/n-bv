// Gemensamma val för formulär och filter. Kan justeras av föreningen.

export const OBSERVATION_CATEGORIES = [
  'Misstänkt aktivitet',
  'Fordon',
  'Person',
  'Inbrott/skadegörelse',
  'Trafik',
  'Övrigt',
] as const

export const OBSERVATION_TYPES = [
  'Iakttagelse',
  'Misstänkt beteende',
  'Känt fordon',
  'Okänt fordon',
  'Störning',
  'Övrigt',
] as const

export const LOGBOOK_CATEGORIES = [
  'Körpass',
  'Möte',
  'Information',
  'Händelse',
  'Övrigt',
] as const

export const PRIORITIES = [
  { value: 'lag', label: 'Låg' },
  { value: 'normal', label: 'Normal' },
  { value: 'hog', label: 'Hög' },
] as const

export const VEHICLE_TYPES = [
  'Personbil',
  'Skåpbil',
  'Lastbil',
  'Motorcykel',
  'Moped',
  'EPA-traktor',
  'A-traktor',
  'Släpvagn',
  'Husbil/husvagn',
  'Annat',
] as const

export const GENDERS = [
  { value: 'man', label: 'Man' },
  { value: 'kvinna', label: 'Kvinna' },
  { value: 'okant', label: 'Okänt' },
] as const

export function priorityLabel(value: string | null | undefined): string {
  return PRIORITIES.find((p) => p.value === value)?.label ?? 'Normal'
}

export function genderLabel(value: string | null | undefined): string {
  return GENDERS.find((g) => g.value === value)?.label ?? ''
}
