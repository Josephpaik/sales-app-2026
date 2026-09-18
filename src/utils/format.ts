export const won = (n: number | undefined | null) => (n == null ? '-' : `${Math.round(n).toLocaleString('ko-KR')}원`);
export const eok = (n: number) => `${(n / 1e8).toFixed(1)}억`;
export const manwon = (n: number) => `${Math.round(n / 1e4).toLocaleString('ko-KR')}만원`;
export const compact = (n: number) => (Math.abs(n) >= 1e8 ? eok(n) : manwon(n));
export const pct = (n: number) => `${n}%`;

/** 개인정보 마스킹 — 전화번호 가운데, 이메일 아이디 일부 */
export const maskPhone = (p: string) => p.replace(/(\d{2,3})-(\d{3,4})-(\d{4})/, (_, a, _b, c) => `${a}-****-${c}`);
export const maskEmail = (e: string) => e.replace(/^(.{2})[^@]*(@.*)$/, '$1***$2');
export const maskName = (n: string) => (n.length > 1 ? n[0] + '*'.repeat(n.length - 1) : n);
