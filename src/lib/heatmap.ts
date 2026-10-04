const RAMP: [number, string][] = [
  [15, '#cde2fb'],
  [30, '#9ec5f4'],
  [45, '#6da7ec'],
  [60, '#3987e5'],
  [75, '#256abf'],
  [90, '#1c5cab'],
  [101, '#0d366b'],
];

export function heatColor(value: number): string {
  return RAMP.find(([threshold]) => value < threshold)?.[1] ?? RAMP[RAMP.length - 1][1];
}

export function heatInk(value: number): string {
  return value >= 45 ? '#ffffff' : '#1f2733';
}

export const HEAT_RAMP_SWATCHES = RAMP.map(([, color]) => color);