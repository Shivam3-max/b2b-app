/** Brand tokens, taken from the approved design (B2B-Store-App-Design-v1.pdf). */
export const color = {
  ink: '#16130E',
  ink2: '#5B554B',
  ink3: '#8B8478',
  line: '#EBE6DD',
  line2: '#DCD5C9',
  wash: '#F6F3EE',
  paper: '#FFFFFF',
  orange: '#F26A1B',
  orangeDeep: '#B84A0B',
  orangeSoft: '#FFF0E6',
  sun: '#FDC656',
  sunSoft: '#FFF6DC',
  green: '#12804A',
  greenSoft: '#E7F5ED',
  red: '#B3261E',
  redSoft: '#FDECEA',
  navy: '#1D2D6B',
  navySoft: '#E9EDFB',
  whatsapp: '#1F9D55',
} as const;

export const font = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  hindi: 'NotoSansDevanagari_500Medium',
} as const;

export const radius = { sm: 9, md: 12, lg: 14, xl: 18, xxl: 22, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 18, xxl: 24 } as const;
export const gutter = 18;
