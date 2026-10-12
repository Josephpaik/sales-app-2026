import { Modal, Form, Select, Input, InputNumber, Space, Alert, Segmented, Row, Col } from 'antd';
import { useDB, uid } from '@/api/store';
import { upsertLine } from '@/api';
import { RELATIONS, PARENT_REQUIRED_RELATIONS, type SalesLine, type SalesOpportunity, type LineKind } from '@/types';
import { won } from '@/utils/format';

const fmt = (v: unknown) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * 제품라인 입력 — V2.4 입력체계
 *  제품군 → 제품 → 세부품목(216 품목) 순서로 선택하면 구분(매출/매입/내부원가/서비스)과 단위 안내가 연동된다.
 *  라이선스 전체/유상/무상 사양, 망 구분, HyBoost 모델·수량, 미러/인라인, 매출·매입 → 이익 자동계산.
 */
export default function LineModal({ open, line, onClose, sales }: { open: boolean; line?: SalesLine; onClose: () => void; sales: SalesOpportunity }) {
  const [form] = Form.useForm();
  const items = useDB((d) => d.productItems);
  const hbModels = useDB((d) => d.hyboostModels);
  const group = Form.useWatch('group', form) as string | undefined;
  const product = Form.useWatch('product', form) as string | undefined;
  const sub = Form.useWatch('sub', form) as string | undefined;
  const kind = Form.useWatch('kind', form) as LineKind | undefined;
  const qty = Form.useWatch('qty', form) as number | undefined;
  const salesAmt = Form.useWatch('sales', form) as number | undefined;
  const buyAmt = Form.useWatch('buy', form) as number | undefined;
  const hyboost = Form.useWatch('hyboost', form) as string | undefined;
  const relation = Form.useWatch('relation', form) as SalesLine['relation'] | undefined;
  const groups = [...new Set(items.map((i) => i.group))];
  const products = [...new Set(items.filter((i) => i.group === group).map((i) => i.product))];
  const subs = items.filter((i) => i.group === group && i.product === product);
  const item = subs.find((i) => i.sub === sub);
  const isNetwork = group === 'Network';

  const onSubChange = (v: string) => {
    const it = subs.find((i) => i.sub === v);
    if (it) form.setFieldsValue({ kind: it.kind, itemId: it.id, license: it.unit ? `${form.getFieldValue('qty') ?? 1} ${it.unit}` : undefined });
  };
  const onQty = (v: number | null) => { if (item?.unit && kind === '매출') form.setFieldsValue({ license: `${v ?? 0} ${item.unit}`, paidLicense: `${v ?? 0} ${item.unit}` }); };

  return (
    <Modal open={open} width={820} title={line ? '제품라인 수정' : '제품라인 추가'} destroyOnHidden onCancel={onClose} okText="제품라인 저장" cancelText="취소"
      afterOpenChange={(o) => { if (o) { form.resetFields(); form.setFieldsValue(line ?? { kind: '매출', relation: sales.relation, qty: 1, hyboost: '없음', hyboostQty: 0, mirror: '미해당', sales: 0, buy: 0 }); if (line && !line.hyboost) form.setFieldsValue({ hyboost: '없음' }); } }}
      onOk={async () => {
        const v = await form.validateFields();
        const hb = v.hyboost && v.hyboost !== '없음' ? v.hyboost : undefined;
        upsertLine(sales.salescd, { id: line?.id ?? uid('L'), kind: v.kind, relation: v.relation, group: v.group, product: v.product, sub: v.sub, itemId: v.itemId, version: v.version, license: v.license, paidLicense: v.paidLicense, freeLicense: v.freeLicense, network: v.network, hyboost: hb, qty: v.qty, hyboostQty: hb ? (v.hyboostQty ?? 0) : 0, mirror: v.mirror, detail: v.detail, other: v.other, sales: v.sales ?? 0, buy: v.buy ?? 0 });
        onClose();
      }}>
      <Alert type="info" showIcon style={{ marginBottom: 10 }} message="엑셀 ‘제품분류’ 시트 216개 품목 기준. 제품군 → 제품 → 세부품목 순서로 선택하면 구분과 단위가 연동되고, 매출·매입 입력 시 이익이 자동 계산됩니다." />
      <Form form={form} layout="vertical" size="middle">
        <Form.Item name="itemId" hidden><Input /></Form.Item>
        <Row gutter={12}>
          <Col span={6}><Form.Item name="relation" label="도입관계" rules={[{ required: true }]}><Select options={RELATIONS.map((r) => ({ value: r }))} /></Form.Item></Col>
          <Col span={6}><Form.Item name="group" label="제품군" rules={[{ required: true }]}><Select showSearch options={groups.map((g) => ({ value: g }))} onChange={() => form.setFieldsValue({ product: undefined, sub: undefined })} /></Form.Item></Col>
          <Col span={6}><Form.Item name="product" label="제품" rules={[{ required: true }]}><Select showSearch options={products.map((p) => ({ value: p }))} onChange={() => form.setFieldsValue({ sub: undefined })} disabled={!group} /></Form.Item></Col>
          <Col span={6}><Form.Item name="sub" label="세부품목" rules={[{ required: true }]}><Select showSearch options={subs.map((s) => ({ value: s.sub, label: `${s.sub} · ${s.kind}${s.unit ? ` (${s.unit})` : ''}` }))} onChange={onSubChange} disabled={!product} /></Form.Item></Col>
          <Col span={6}><Form.Item name="kind" label="구분" rules={[{ required: true }]}><Select options={['매출', '매입', '내부원가', '서비스', '매출·매입'].map((k) => ({ value: k }))} /></Form.Item></Col>
          <Col span={6}><Form.Item name="version" label="버전 (직접 입력)"><Input placeholder="예: v12.0" /></Form.Item></Col>
          <Col span={6}><Form.Item name="qty" label={`수량${item?.unit ? ` (${item.unit})` : ''}`} rules={[{ required: true, type: 'number', min: 1 }]}><InputNumber min={1} style={{ width: '100%' }} onChange={onQty} /></Form.Item></Col>
          <Col span={6}><Form.Item name="network" label="망 구분 (직접 입력)"><Input placeholder="내부망 / 외부망 / 업무망 / VDI망" /></Form.Item></Col>
          <Col span={8}><Form.Item name="license" label="라이선스 전체 사양"><Input placeholder={item?.unit ? `예: ${qty ?? 1} ${item.unit}` : '-'} /></Form.Item></Col>
          <Col span={8}><Form.Item name="paidLicense" label="유상 라이선스"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="freeLicense" label="무상 라이선스"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="hyboost" label="HyBoost 모델"><Select showSearch options={['없음', ...hbModels].map((m) => ({ value: m }))} /></Form.Item></Col>
          <Col span={8}><Form.Item name="hyboostQty" label="HyBoost 수량 (출고 기준)" rules={hyboost && hyboost !== '없음' ? [{ required: true, type: 'number', min: 1, message: 'HyBoost 모델 지정 시 수량 1 이상' }] : []}><InputNumber min={0} style={{ width: '100%' }} disabled={!hyboost || hyboost === '없음'} /></Form.Item></Col>
          <Col span={8}><Form.Item name="mirror" label="미러 / 인라인"><Segmented options={['미해당', '미러', '인라인']} disabled={!isNetwork} /></Form.Item></Col>
          <Col span={12}><Form.Item name="detail" label="상세"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="other" label="기타"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="sales" label="매출금액" rules={kind && ['매출', '서비스', '매출·매입'].includes(kind) ? [{ required: true, type: 'number', min: 0 }] : []}><InputNumber min={0} step={10000} style={{ width: '100%' }} formatter={fmt} parser={(v) => Number(String(v).replace(/,/g, ''))} disabled={kind === '매입' || kind === '내부원가'} /></Form.Item></Col>
          <Col span={8}><Form.Item name="buy" label="매입·비용금액" rules={kind && ['매입', '내부원가', '매출·매입'].includes(kind) ? [{ required: true, type: 'number', min: 0 }] : []}><InputNumber min={0} step={10000} style={{ width: '100%' }} formatter={fmt} parser={(v) => Number(String(v).replace(/,/g, ''))} /></Form.Item></Col>
          <Col span={8}><Form.Item label="이익 (자동계산)"><Input readOnly value={won((salesAmt ?? 0) - (buyAmt ?? 0))} /></Form.Item></Col>
        </Row>
        <Space direction="vertical" size={4}>
          {relation && PARENT_REQUIRED_RELATIONS.includes(relation) && !sales.parentSalescd && <Alert type="warning" showIcon message="증설·고도화·재계약 라인은 영업 건에 본사업이 연결되어 있어야 합니다. 기본정보 수정에서 본사업을 선택하세요." />}
          <span className="muted">‘내부원가’와 수수료는 프로젝트 관리손익에 포함됩니다. 회계상 매출총이익·판관비 처리 기준은 별도 확인 필요.</span>
        </Space>
      </Form>
    </Modal>
  );
}
