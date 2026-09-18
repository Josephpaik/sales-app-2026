import { useState } from 'react';
import { Tabs, Typography, Input, Select, Button, Space, Alert, Descriptions, Tag } from 'antd';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { logAudit } from '@/api';

/**
 * 고객정보 공유 — 제공(Outbound) 미리보기 (§3-2 ②)
 *  - 조회 전용 REST API /api/v1/customers (토큰 인증, 필드 단위 권한, 호출 한도)
 *  - PostgreSQL 읽기 전용 뷰 v_customer_master (별도 DB 계정)
 */
export default function ApiPreviewPage() {
  const device = useDevice();
  const customers = useDB((d) => d.customers);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'basic' | 'full'>('basic');
  const [result, setResult] = useState<string>('');

  const call = () => {
    const rows = customers.filter((c) => !q || c.name.includes(q) || c.custcd === q).slice(0, 5).map((c) => scope === 'basic'
      ? { custcd: c.custcd, name: c.name, corp_type: c.corpType, biz_no: c.bizNo.replace(/\d{5}$/, '*****'), category: c.category, sub_category: c.subCategory, group: c.group ?? null, updated_at: c.updatedAt }
      : { custcd: c.custcd, name: c.name, corp_type: c.corpType, corp_no: c.corpNo, biz_no: c.bizNo, category: c.category, sub_category: c.subCategory, group: c.group ?? null, sites: c.sites.map((s) => ({ id: s.id, name: s.name, road_address: s.roadAddress, building_code: s.buildingCode, is_primary: s.isPrimary })), contacts_count: c.contacts.length, updated_at: c.updatedAt });
    setResult(JSON.stringify({ count: rows.length, next: null, results: rows, _meta: { scope, token: 'tqs-readonly-****', rate_limit: '600/min', field_policy: scope === 'basic' ? '사업자번호 부분 마스킹, 담당자 미포함' : '사이트 포함, 담당자 연락처는 별도 스코프(contacts:read) 필요' } }, null, 2));
    logAudit('조회', '/api/v1/customers', `scope=${scope} q=${q}`);
  };

  const viewDDL = `CREATE VIEW v_customer_master AS
SELECT c.custcd, c.name, c.corp_type, c.biz_no, c.category, c.sub_category, c."group",
       s.road_address AS primary_address, s.building_code, c.updated_at
  FROM customer c
  LEFT JOIN customer_site s ON s.custcd = c.custcd AND s.is_primary;
-- 별도 읽기 전용 계정: GRANT SELECT ON v_customer_master TO tqs_reader;  (개인정보 컬럼 제외)`;

  const openapi = `GET /api/v1/customers?q=한빛&page=1          # 목록 (필드 정책: basic)
GET /api/v1/customers/{custcd}                 # 단건
GET /api/v1/customers/{custcd}/sites           # 사이트
GET /api/v1/customers/{custcd}/contacts        # 담당자 (scope contacts:read, 열람 로그)
Authorization: Bearer <token>   X-Client: tqs | goldmine | license-center
429 Too Many Requests  → 호출 한도 600/min/클라이언트`;

  const body = (
    <Tabs items={[
      { key: 'api', label: '조회 API 시뮬레이션', children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            <Input placeholder="q= 고객사명 / custcd" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
            <Select value={scope} onChange={setScope} options={[{ value: 'basic', label: 'scope: customers:read (basic)' }, { value: 'full', label: 'scope: customers:read + sites:read' }]} style={{ width: 300 }} />
            <Button type="primary" onClick={call}>GET /api/v1/customers</Button>
          </Space>
          <Typography.Paragraph><pre style={{ background: '#0f172f', color: '#d6e0ff', padding: 12, borderRadius: 8, fontSize: 12, maxHeight: 420, overflow: 'auto' }}>{result || '// 호출 결과가 여기에 표시됩니다 (조회는 감사 로그에 기록)'}</pre></Typography.Paragraph>
        </Space>) },
      { key: 'spec', label: 'OpenAPI 개요', children: <pre style={{ background: '#f4f6fb', padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>{openapi}</pre> },
      { key: 'view', label: '읽기 전용 뷰 DDL', children: <pre style={{ background: '#f4f6fb', padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>{viewDDL}</pre> },
      { key: 'consumers', label: '소비자', children: (
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="2차 기술지원 시스템"><Tag color="blue">API</Tag> 이 API만으로 고객 정보를 얻을 수 있음이 설계 리뷰로 확인되어야 함 (설계 게이트)</Descriptions.Item>
          <Descriptions.Item label="TQS (과도기)"><Tag color="gold">대사</Tag> 수정 불가 → 일 1회 대사 배치 + 예외 화면</Descriptions.Item>
          <Descriptions.Item label="라이선스센터 (향후)"><Tag color="purple">뷰</Tag> v_customer_master 참조 검토 — TQS 키 공유 방식 확인필요</Descriptions.Item>
          <Descriptions.Item label="골드마인 (2차 이관)"><Tag>매핑</Tag> goldmine_customer_alias로 키 복원</Descriptions.Item>
        </Descriptions>) },
    ]} />
  );

  if (device !== 'desktop') return <div className="m-body" style={{ padding: 12 }}><Alert type="info" showIcon message="조회 API·뷰 설계는 PC 화면에 최적화되어 있습니다." style={{ marginBottom: 10 }} />{body}</div>;
  return <div className="pane" style={{ minHeight: 'calc(100vh - 96px)' }}><Alert type="info" showIcon style={{ marginBottom: 10 }} message="신규 시스템이 고객 마스터의 Owner. 외부 시스템은 조회 전용 REST API 또는 읽기 전용 DB 뷰로만 참조하며, 쓰기는 신규 시스템 화면에서만 수행합니다." />{body}</div>;
}
