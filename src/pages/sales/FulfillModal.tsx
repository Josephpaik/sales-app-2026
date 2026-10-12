import { Modal, Form, Select, Input, InputNumber, DatePicker, Alert, App as AntApp } from 'antd';
import dayjs from 'dayjs';
import { useDB, today } from '@/api/store';
import { createFulfillRequest, remainingQty } from '@/api';
import type { SalesLine, SalesOpportunity } from '@/types';

/** 라이선스 발급 / HyBoost 출고 요청 — 제품라인 단위, 남은 수량 이내, 라인당 대기 요청 1건 */
export default function FulfillModal({ open, kind, sales, line, onClose }: { open: boolean; kind: 'license' | 'shipment'; sales: SalesOpportunity; line?: SalesLine; onClose: () => void }) {
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
  const hbModels = useDB((d) => d.hyboostModels);
  const customer = useDB((d) => d.customers.find((c) => c.custcd === sales.custcd));
  const purpose = Form.useWatch('purpose', form);
  const remain = line ? remainingQty(kind, sales, line) : 0;
  const isShip = kind === 'shipment';
  return (
    <Modal open={open} title={`${isShip ? 'HyBoost 출고' : '라이선스 발급'} 요청 · ${line?.product ?? ''} / ${line?.sub ?? ''}`} destroyOnHidden onCancel={onClose} okText="요청" cancelText="취소"
      afterOpenChange={(o) => { if (o) { form.resetFields(); form.setFieldsValue({ qty: remain, date: dayjs(today()), purpose: '판매', model: line?.hyboost, address: customer?.sites[0]?.roadAddress, contact: customer?.contacts.find((k) => k.kind === '검수')?.name ?? customer?.contacts[0]?.name, licenseType: '신규' }); } }}
      onOk={async () => {
        const v = await form.validateFields();
        if (!line) return;
        const r = createFulfillRequest({ kind, salescd: sales.salescd, lineId: line.id, qty: v.qty, date: v.date.format('YYYY-MM-DD'), note: v.note, purpose: v.purpose, model: v.model, address: v.address, contact: v.contact, demoDays: v.demoDays, reason: v.reason, licenseType: v.licenseType });
        if (!r.ok) return message.error(r.message);
        message.success('요청을 등록했습니다. 영업지원 처리 후 이력에 반영됩니다.');
        onClose();
      }}>
      <Alert type="info" showIcon style={{ marginBottom: 10 }} message={`남은 수량 ${remain} (${isShip ? 'HyBoost 수량' : '품목 수량'} 기준). 라인당 처리 대기 요청은 1건만 허용됩니다.`} />
      <Form form={form} layout="vertical">
        <Form.Item name="qty" label="요청 수량" rules={[{ required: true, type: 'number', min: 1, max: Math.max(1, remain) }]}><InputNumber min={1} max={Math.max(1, remain)} /></Form.Item>
        <Form.Item name="date" label={isShip ? '출고 희망일' : '발급 희망일'} rules={[{ required: true }]}><DatePicker /></Form.Item>
        {isShip ? (
          <>
            <Form.Item name="purpose" label="용도" rules={[{ required: true }]}><Select options={['판매', '데모', '무상납품'].map((p) => ({ value: p }))} /></Form.Item>
            {purpose === '데모' && <Form.Item name="demoDays" label="데모 운용 기간(일)" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>}
            {purpose === '무상납품' && <Form.Item name="reason" label="출고 사유" rules={[{ required: true }]}><Input /></Form.Item>}
            <Form.Item name="model" label="HyBoost 모델" rules={[{ required: true }]}><Select options={hbModels.map((m) => ({ value: m }))} /></Form.Item>
            <Form.Item name="address" label="납품 주소" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="contact" label="수령 담당자" rules={[{ required: true }]}><Input /></Form.Item>
          </>
        ) : (
          <Form.Item name="licenseType" label="발급 유형"><Select options={['신규', '재발급', '임시'].map((p) => ({ value: p }))} /></Form.Item>
        )}
        <Form.Item name="note" label="비고"><Input /></Form.Item>
      </Form>
    </Modal>
  );
}
