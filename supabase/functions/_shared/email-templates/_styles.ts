// Shared branded styles for Martial Athletic auth emails.
// Email body MUST be white per platform guidance, even though the app is dark themed.

const FONT_BODY = "'Inter', 'Helvetica Neue', Arial, sans-serif"
const FONT_DISPLAY = "'Oswald', 'Impact', 'Arial Narrow', Arial, sans-serif"

const PRIMARY = '#DC2828' // hsl(0 72% 51%)
const FOREGROUND = '#14181F' // hsl(220 20% 10%)
const MUTED = '#5C6370' // hsl(220 10% 40%)
const SOFT_BORDER = '#E5E7EB'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: FONT_BODY,
  margin: 0,
  padding: '24px 0',
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0 24px',
}

export const brandBar = {
  padding: '20px 0 28px',
  borderBottom: `3px solid ${PRIMARY}`,
  marginBottom: '32px',
}

export const brandMark = {
  fontFamily: FONT_DISPLAY,
  fontSize: '22px',
  fontWeight: 700 as const,
  letterSpacing: '0.12em',
  color: FOREGROUND,
  margin: 0,
  textTransform: 'uppercase' as const,
}

export const brandTag = {
  fontFamily: FONT_BODY,
  fontSize: '11px',
  letterSpacing: '0.18em',
  color: PRIMARY,
  margin: '4px 0 0',
  textTransform: 'uppercase' as const,
  fontWeight: 600 as const,
}

export const h1 = {
  fontFamily: FONT_DISPLAY,
  fontSize: '28px',
  fontWeight: 700 as const,
  color: FOREGROUND,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  margin: '0 0 20px',
}

export const text = {
  fontFamily: FONT_BODY,
  fontSize: '15px',
  color: MUTED,
  lineHeight: '1.6',
  margin: '0 0 24px',
}

export const link = { color: PRIMARY, textDecoration: 'underline' }

export const button = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  fontFamily: FONT_DISPLAY,
  fontSize: '14px',
  fontWeight: 700 as const,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const codeStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  letterSpacing: '0.3em',
  color: FOREGROUND,
  backgroundColor: '#F3F4F6',
  borderRadius: '8px',
  padding: '16px 20px',
  textAlign: 'center' as const,
  margin: '0 0 28px',
}

export const divider = {
  borderTop: `1px solid ${SOFT_BORDER}`,
  margin: '32px 0 16px',
}

export const footer = {
  fontFamily: FONT_BODY,
  fontSize: '12px',
  color: MUTED,
  lineHeight: '1.5',
  margin: '0',
}
