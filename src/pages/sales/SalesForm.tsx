import { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, App as AntApp } from 'antd';
import { Form as MForm, Input as MInput, Popup, Button as MButton, Selector, Stepper, TextArea } from 'antd-mobile';
import dayjs from 'dayjs';
import { useLookups } from '@/components/common';
import { createSales, updateSales, currentUser } from '@/api';
import { RELATIONS, SALES_TYPE_LABEL, type SalesOpportunity, type SalesType, type Relation } from '@/types';

interface Props {
  open: boolean;
  onClose: (savedId?: string) => void;
  value?: SalesOpportunity; // 수정 시
  presetCustcd?: string;
  mobile?: boolean;
}

const PROBS = [10, 30, 50, 70, 90, 100] as const;

/** 영업 건 등록/수정 — PC: AntD Modal Form / 모바일: antd-mobile Bottom Sheet Form (빠른 입력 항목 위주) */
export default function SalesForm({ open, onClose, value, presetCustcd, mobile }: Props) {
  return mobile ? <MobileForm open={open} onClose={onClose} value={value} presetCustcd={presetCustcd} /> : <DesktopForm open={open} onClose={onClose} value={value} presetCustcd={presetCustcd} />;
}

function buildPayload(v: Record<string, unknown>, me = currentUser()) {
  return {
    custcd: v.custcd as string,
    name: v.name as string,
    tqsProjectCode: (v.tqsProjectCode as string) || undefined,
    salesType: (v.salesType as SalesType) ?? '1',
    status: (v.status as SalesOpportunity['status']) ?? 'SN02Z',
    probability: (Number(v.probability) as SalesOpportunity['probability']) ?? 30,
    forecastYm: dayjs.isDayjs(v.forecastYm) ? v.forecastYm.format('YYYY-MM') : (v.forecastYm as string),
    forecastDate: dayjs().format('YYYY-MM-DD'),
    teamId: (v.teamId as string) ?? me.teamId,
    ownerId: (v.ownerId as string) ?? me.id,
    partnerId: (v.partnerId as string) || undefined,
    partyName: (v.partyName as string) || undefined,
    relation: (v.relation as Relation) ?? '신규',
    lines: [] as SalesOpportunity['lines'],
    memo: (v.memo as string) || undefined,
  };
}

function DesktopForm({ open, onClose, value, presetCustcd }: Omit<Props, 'mobile'>) {
  const [form] = Form.useForm();
  const lk = useLookups();
  const { message } = AntApp.useApp();
  const me = currentUser();
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (value) form.setFieldsValue({ ...value, forecastYm: dayjs(value.forecastYm + '-01') });
    else form.setFieldsValue({ custcd: presetCustcd, salesType: '1', status: 'SN02Z', probability: 30, forecastYm: dayjs(), teamId: me.teamId, ownerId: me.id, relation: '신규' });
  }, [open, value, presetCustcd, form, me]);

  const submit = async () => {
    const v = await form.validateFields();
    const payload = buildPayload(v, me);
    if (value) {
      const { lines: _l, ...patch } = payload;
      updateSales(value.salescd, patch);
      message.success('영업 건을 수정했습니다.');
      onClose(value.salescd);
    } else {
      const id = createSales(payload);
      message.success(`영업 건 ${id}을(를) 등록했습니다. 제품 라인을 추가하세요.`);
      onClose(id);
    }
  };

  const teamId = Form.useWatch('teamId', form);
  return (
    <Modal open={open} title={value ? `영업 건 수정 · ${value.salescd}` : '영업 건 등록'} onCancel={() => onClose()} onOk={submit} okText="저장" cancelText="취소" width={760} destroyOnHidden>
      <Form form={form} layout="vertical" size="middle" style={{ marginTop: 12 }}>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="custcd" label="고객사" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={lk.customers.map((c) => ({ value: c.custcd, label: `${c.name} (${c.custcd})` }))} /></Form.Item></Col>
          <Col span={12}><Form.Item name="name" label="프로젝트명" rules={[{ required: true }]}><Input placeholder="예: 한빛전자 DLP 고도화" /></Form.Item></Col>
          <Col span={6}><Form.Item name="salesType" label="영업구분" rules={[{ required: true }]}><Select options={Object.entries(SALES_TYPE_LABEL).map(([v, l]) => ({ value: v, label: `${v} · ${l}` }))} /></Form.Item></Col>
          <Col span={6}><Form.Item name="relation" label="도입관계"><Select options={RELATIONS.map((r) => ({ value: r, label: r }))} /></Form.Item></Col>
          <Col span={6}><Form.Item name="probability" label="수주확도" rules={[{ required: true }]}><Select options={PROBS.map((p) => ({ value: p, label: `${p}%` }))} /></Form.Item></Col>
          <Col span={6}><Form.Item name="forecastYm" label="매출시기" rules={[{ required: true }]}><DatePicker picker="month" style={{ width: '100%' }} /></Form.Item></Col>
          <Col span={6}><Form.Item name="teamId" label="영업팀" rules={[{ required: true }]}><Select options={lk.teams.map((t) => ({ value: t.id, label: t.name }))} /></Form.Item></Col>
          <Col span={6}><Form.Item name="ownerId" label="담당자" rules={[{ required: true }]}><Select options={lk.users.filter((u) => u.role === 'sales' && (!teamId || u.teamId === teamId)).map((u) => ({ value: u.id, label: u.name }))} /></Form.Item></Col>
          <Col span={6}><Form.Item name="partnerId" label="파트너(채널)"><Select allowClear options={lk.partners.filter((p) => p.status === 'active').map((p) => ({ value: p.id, label: p.name }))} /></Form.Item></Col>
          <Col span={6}><Form.Item name="partyName" label="계약처"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="tqsProjectCode" label="TQS 프로젝트코드" tooltip="1차: 필드만 보관 (2차 기술지원 시스템 연계)"><Input placeholder="TQ5488xxxx" /></Form.Item></Col>
          <Col span={16}><Form.Item name="memo" label="비고"><Input /></Form.Item></Col>
        </Row>
        {value && <Form.Item name="status" hidden><Input /></Form.Item>}
        {!value && <div className="muted">등록 시 상태는 「포케스팅(대기)」로 시작합니다. 제품 라인(매출·매입)은 등록 후 상세 화면에서 추가합니다.</div>}
      </Form>
    </Modal>
  );
}

/** 현장용 빠른 등록 — 필수 항목만, 큰 터치 영역 */
function MobileForm({ open, onClose, value, presetCustcd }: Omit<Props, 'mobile'>) {
  const [form] = MForm.useForm();
  const lk = useLookups();
  const me = currentUser();
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (value) form.setFieldsValue({ ...value, probability: [String(value.probability)], custcd: [value.custcd], relation: [value.relation], forecastMonth: Number(value.forecastYm.slice(5, 7)) });
    else form.setFieldsValue({ custcd: presetCustcd ? [presetCustcd] : [], probability: ['30'], relation: ['신규'], forecastMonth: dayjs().month() + 1 });
  }, [open, value, presetCustcd, form]);

  const submit = async () => {
    const v = await form.validateFields();
    const payload = buildPayload({
      custcd: v.custcd?.[0], name: v.name, probability: v.probability?.[0], relation: v.relation?.[0],
      forecastYm: `2026-${String(v.forecastMonth).padStart(2, '0')}`, memo: v.memo, salesType: value?.salesType ?? '1',
      teamId: value?.teamId ?? me.teamId, ownerId: value?.ownerId ?? me.id, partnerId: value?.partnerId, status: value?.status,
    }, me);
    if (value) {
      const { lines: _l, ...patch } = payload;
      updateSales(value.salescd, patch);
      onClose(value.salescd);
    } else {
      const id = createSales(payload);
      onClose(id);
    }
  };

  return (
    <Popup visible={open} onMaskClick={() => onClose()} position="bottom" bodyStyle={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
      <div className="sheet-title">{value ? '영업 건 수정' : '영업 건 빠른 등록'}</div>
      <div className="sheet-body">
        <MForm form={form} layout="vertical" footer={<MButton block color="primary" size="large" onClick={submit}>저장</MButton>}>
          <MForm.Item name="custcd" label="고객사" rules={[{ required: true, message: '고객사를 선택하세요' }]}>
            <Selector columns={2} options={lk.customers.slice(0, 8).map((c) => ({ label: c.name, value: c.custcd }))} />
          </MForm.Item>
          <MForm.Item name="name" label="프로젝트명" rules={[{ required: true, message: '프로젝트명을 입력하세요' }]}><MInput placeholder="예: DLP 고도화" /></MForm.Item>
          <MForm.Item name="probability" label="수주확도"><Selector columns={6} options={PROBS.map((p) => ({ label: `${p}%`, value: String(p) }))} /></MForm.Item>
          <MForm.Item name="relation" label="도입관계"><Selector columns={4} options={RELATIONS.slice(0, 4).map((r) => ({ label: r, value: r }))} /></MForm.Item>
          <MForm.Item name="forecastMonth" label="매출시기 (월)"><Stepper min={1} max={12} /></MForm.Item>
          <MForm.Item name="memo" label="메모"><TextArea rows={2} placeholder="현장 메모" /></MForm.Item>
        </MForm>
        <div className="muted" style={{ marginTop: 6 }}>영업팀·담당자는 로그인 사용자({me.name}) 기준으로 자동 지정됩니다. 상세 항목은 PC에서 보완하세요.</div>
      </div>
    </Popup>
  );
}
