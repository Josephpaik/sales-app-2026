import { useMemo, useState } from 'react';
import { Table, Button, Space, DatePicker, Tag, Statistic, Row, Col, Alert, Segmented, Collapse, App as AntApp } from 'antd';
import { DownloadOutlined, SaveOutlined, BarChartOutlined } from '@ant-design/icons';
import { List } from 'antd-mobile';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useDB, today, nowStamp } from '@/api/store';
import { currentUser, visibleSales, logAudit, saveReportSnapshot, arStatus, can } from '@/api';
import { useLookups } from '@/components/common';
import { useDevice } from '@/hooks/useDevice';
import { SALES_TYPE_LABEL } from '@/types';
import { compact } from '@/utils/format';

/** 내부보고 공통 스키마 — V2.4 commonHeaders (제품라인 단위 행) */
export const REPORT_HEADERS = ['프로젝트코드', '도입관계', '팀', '영업담당', '분류', '소속팀', '고객사', '계약처', '계약처 사업자등록번호', '발행구분', '구분', '제품군', '제품', '세부품목', '라이선스 사양', '버전', 'HyBoost', '품목수량', 'HyBoost 수량', '매출', '매입', '이익', '세금계산서 발행일자', '입금예정일자', '수금현황', '비고란'];

export function useReportRows(month: string) {
  const all = useDB((d) => d.sales); const parties = useDB((d) => d.contractParties); const ars = useDB((d) => d.receivables); const contracts = useDB((d) => d.contracts); useDB((d) => d.session.userId);
  const me = currentUser(); const lk = useLookups();
  return useMemo(() => {
    const rows: Record<string, string | number>[] = [];
    visibleSales(me, all).filter((s) => !s.legacy && ['SN05Z', 'SN07Z', 'SN09Z', 'SN10Z', 'SN12M', 'SN12Z'].includes(s.status) && (s.taxDate ?? s.orderDate ?? s.forecastYm).startsWith(month)).forEach((s) => {
      const party = parties.find((p) => p.id === s.partyId); const ar = ars.find((r) => r.salescd === s.salescd); const ct = contracts.find((c) => c.id === s.contractId);
      s.lines.forEach((l) => rows.push({
        프로젝트코드: s.salescd, 도입관계: l.relation, 팀: lk.teamName(s.teamId), 영업담당: lk.userName(s.ownerId), 분류: lk.customers.find((c) => c.custcd === s.custcd)?.subCategory ?? '', 소속팀: lk.teamName(s.teamId),
        고객사: lk.customerName(s.custcd), 계약처: s.partyName ?? '', '계약처 사업자등록번호': party?.bizNo ?? '', 발행구분: SALES_TYPE_LABEL[s.salesType], 구분: l.kind, 제품군: l.group, 제품: l.product, 세부품목: l.sub,
        '라이선스 사양': l.license ?? '', 버전: l.version ?? '', HyBoost: l.hyboost ?? '', 품목수량: l.qty, 'HyBoost 수량': l.hyboostQty ?? 0, 매출: l.sales, 매입: l.buy, 이익: l.sales - l.buy,
        '세금계산서 발행일자': s.taxDate ?? '', 입금예정일자: ar?.contractDue ?? (ct && s.taxDate ? dayjs(s.taxDate).add(ct.paymentDueDays, 'day').format('YYYY-MM-DD') : ''), 수금현황: ar ? arStatus(ar) : '미발행', 비고란: s.memo ?? '',
      }));
    });
    return rows;
  }, [all, parties, ars, contracts, month, me, lk]);
}

/** 보고 · 통계 — 가마감/마감 실적보고(월 스냅샷) + 집계·통계 진입 (V2.4) */
export default function ReportPage() {
  const device = useDevice(); const nav = useNavigate(); const { message } = AntApp.useApp();
  const [month, setMonth] = useState(today().slice(0, 7));
  const [kind, setKind] = useState<'가마감' | '마감'>('가마감');
  const rows = useReportRows(month);
  const snaps = useDB((d) => d.reportSnapshots);
  const me = currentUser();
  const snap = snaps.find((x) => x.month === month && x.kind === kind);
  const pre = snaps.find((x) => x.month === month && x.kind === '가마감');
  const sum = (k: string) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
  const missing = rows.filter((r) => !r['세금계산서 발행일자'] || !r['입금예정일자'] || !r['계약처']).length;
  const diff = kind === '마감' && pre ? rows.length - pre.rows.length : 0;
  const deadline = dayjs(month + '-01').endOf('month');
  const csv = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [REPORT_HEADERS, ...rows.map((r) => REPORT_HEADERS.map((h) => r[h] ?? ''))].map((x) => x.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = `${kind}_실적보고_${month}.csv`; a.click();
    logAudit('다운로드', `${kind} 실적보고`, `${month} · ${rows.length}행`);
  };
  const save = () => { saveReportSnapshot({ month, kind, savedAt: nowStamp(), by: me.name, rows }); message.success(`${month} ${kind} 실적보고를 확정 저장했습니다 (${rows.length}행).`); };
  const controls = (
    <Space wrap>
      <Segmented size="small" value={kind} onChange={(v) => setKind(v as typeof kind)} options={['가마감', '마감'].map((k) => ({ value: k, label: `${k} 실적보고` }))} />
      <span className="muted">보고 기준월</span><DatePicker size="small" picker="month" value={dayjs(month + '-01')} onChange={(d) => d && setMonth(d.format('YYYY-MM'))} />
      <Button size="small" icon={<DownloadOutlined />} onClick={csv}>Excel 보고서</Button>
      {can.receivable(me) && <Button size="small" type="primary" icon={<SaveOutlined />} onClick={save}>{kind} 실적보고 확정 저장</Button>}
      <Button size="small" icon={<BarChartOutlined />} onClick={() => nav('/biz/stats')}>집계 · 통계</Button>
    </Space>
  );
  const stats = (
    <Row gutter={10} style={{ marginBottom: 10 }}>
      <Col flex={1}><Statistic title="보고 행" value={rows.length} suffix="건" /></Col><Col flex={1}><Statistic title="매출" value={compact(sum('매출'))} /></Col><Col flex={1}><Statistic title="매입" value={compact(sum('매입'))} /></Col><Col flex={1}><Statistic title="이익" value={compact(sum('이익'))} /></Col>
      <Col flex={1}><Statistic title="필수 보완 필요" value={missing} suffix="건" styles={{ content: { color: missing ? '#cf1322' : undefined } }} /></Col>
      <Col flex={2}><div className="muted">재무팀 제출기한</div><b>{deadline.format('YYYY-MM-DD')} · 영업일 14:00</b><div className="muted">{snap ? `${kind} 저장됨 · ${snap.savedAt} · ${snap.by}` : `${kind} 미저장`}{kind === '마감' && pre ? ` · 가마감 대비 ${diff >= 0 ? '+' : ''}${diff}행` : ''}</div></Col>
    </Row>
  );
  if (device !== 'desktop') {
    return <div><div className="m-section" style={{ padding: 12 }}>{controls}</div><div className="m-kpis"><div className="m-kpi"><div className="l">보고 행</div><div className="v">{rows.length}</div></div><div className="m-kpi"><div className="l">매출</div><div className="v">{compact(sum('매출'))}</div></div><div className="m-kpi"><div className="l">이익</div><div className="v">{compact(sum('이익'))}</div></div><div className="m-kpi"><div className="l">보완 필요</div><div className="v">{missing}</div></div></div><List style={{ margin: 10, borderRadius: 12, overflow: 'hidden' }}>{rows.slice(0, 40).map((r, i) => <List.Item key={i} description={`${r['고객사']} · ${r['제품']} / ${r['세부품목']} · ${r['수금현황']}`} extra={compact(Number(r['매출']))}>{r['프로젝트코드']}</List.Item>)}</List></div>;
  }
  return (
    <div className="pane">
      <div className="pane-title"><span>{kind} 실적보고 <span className="muted">매월 말일 영업일 오후 2시 재무팀 제출용 스냅샷</span></span>{controls}</div>
      {stats}
      {missing > 0 && <Alert type="warning" showIcon style={{ marginBottom: 10 }} message={`빨간색 '미등록' 항목 ${missing}건은 보완 입력 후 확정 저장하세요. 마감 보고서는 가마감 저장 시점과 비교하여 신규·삭제·금액·일정 변경을 표시합니다.`} />}
      <Table size="small" dataSource={rows} rowKey={(r, i) => `${r['프로젝트코드']}-${i}`} pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 2600 }}
        columns={REPORT_HEADERS.map((h) => ({ title: h, dataIndex: h, width: ['매출', '매입', '이익'].includes(h) ? 110 : h.length > 8 ? 150 : 100, align: ['매출', '매입', '이익', '품목수량', 'HyBoost 수량'].includes(h) ? 'right' as const : undefined,
          render: (v: string | number) => (['매출', '매입', '이익'].includes(h) ? Number(v).toLocaleString('ko-KR') : v === '' && ['세금계산서 발행일자', '입금예정일자', '계약처'].includes(h) ? <Tag color="red">미등록</Tag> : v) }))} />
      <Collapse size="small" ghost style={{ marginTop: 10 }} items={[{ key: 'c', label: '공통 실적보고 데이터 기준 보기', children: <div className="muted">보고 행은 수주 이후 영업 건의 제품라인 단위이며, 기준월은 세금계산서 발행일(없으면 수주일·매출예상시기)로 판정합니다. 수금현황은 매출채권 상태(시스템 계산)를 그대로 가져옵니다. 가마감·마감 저장본은 브라우저에 보관되는 시연 스냅샷입니다.</div> }]} />
    </div>
  );
}
