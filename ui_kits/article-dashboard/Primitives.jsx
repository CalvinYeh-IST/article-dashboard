const { useState } = React;

// ========== Primitives ==========
const Pill = ({ tone = 'ok', children }) => {
  const tones = {
    ok: { bg: '#EAF3DE', fg: '#3B6D11' },
    warn: { bg: '#FAEEDA', fg: '#854F0B' },
    danger: { bg: '#FCEBEB', fg: '#A32D2D' },
  };
  const t = tones[tone];
  return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, fontWeight: 500, background: t.bg, color: t.fg, whiteSpace: 'nowrap' }}>{children}</span>;
};

const StatusTag = ({ tone = 'ok', children }) => {
  const tones = {
    ok: { bg: '#D1FAE5', fg: '#1A6B45' },
    warn: { bg: '#FEF3C7', fg: '#A35200' },
    danger: { bg: '#FEE2E2', fg: '#B91C1C' },
  };
  const t = tones[tone];
  return <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 2, fontWeight: 600, background: t.bg, color: t.fg }}>{children}</span>;
};

const ArticleBadge = ({ status }) => {
  const map = {
    '待初審': { bg: '#E6F1FB', fg: '#185FA5' },
    '翻譯中': { bg: '#EEEDFE', fg: '#3C3489' },
    '待上架': { bg: '#FAEEDA', fg: '#854F0B' },
    '已上架': { bg: '#EAF3DE', fg: '#0F6E56' },
    '待改稿': { bg: '#EEEDFE', fg: '#3C3489' },
  };
  const t = map[status] || { bg: '#F2F1EE', fg: '#6B6B6B' };
  return <span style={{ display: 'inline-block', fontSize: 10, padding: '3px 8px', borderRadius: 10, fontWeight: 500, background: t.bg, color: t.fg }}>{status}</span>;
};

const ProgressBar = ({ pct, color = '#C8621E', height = 6 }) => (
  <div style={{ height, background: '#F1EFE8', borderRadius: height / 2, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, transition: 'width .4s' }} />
  </div>
);

const pctColor = (p) => p >= 100 ? '#1A6B45' : p >= 80 ? '#A35200' : '#B91C1C';
const pctBg = (p) => p >= 100 ? '#D1FAE5' : p >= 80 ? '#FEF3C7' : '#FEE2E2';
const pctText = (p) => p >= 100 ? '達標' : p >= 80 ? '接近' : '落後';

const Eyebrow = ({ children, color = '#6B6B6B' }) => (
  <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color, marginBottom: 6, fontWeight: 500 }}>{children}</div>
);

const Card = ({ children, flat = true, style = {} }) => (
  <div style={{
    background: '#fff',
    border: `1px solid ${flat ? '#E2E0DC' : '#E8E8E4'}`,
    borderRadius: flat ? 0 : 12,
    padding: '1.25rem',
    ...style,
  }}>{children}</div>
);

Object.assign(window, { Pill, StatusTag, ArticleBadge, ProgressBar, Eyebrow, Card, pctColor, pctBg, pctText });
