import { Table, Tag, Typography, Alert, Steps } from 'antd';
import { List, Tag as MTag } from 'antd-mobile';
import { useDevice } from '@/hooks/useDevice';

const SCOPE = [
  ['A', '고객사 마스터', '1차', '법인·사업자 정보, 대분류·소분류·계열, 담당자, 사이트(주소 API·건물관리번호 중복 탐지)'],
  ['A', '파트너(채널) 마스터', '1차', '영업관리 63 + TQS 73 정제 후 단일 마스터, 지급 조건'],
  ['A', '제품 마스터', '1차', 'TQS 제품 마스터(제품군 × 버전) 기준 채택'],
  ['B', '영업 건(수주) 관리', '1차', '등록·조회·상태 전이, 수주확도·포케스팅, 제품 라인, 세금계산서 상태, 첨부'],
  ['B', '계약 정보 기본', '1차', '유형·기간·금액, 계약서 첨부, MA팀 원문 열람 권한'],
  ['B', '문서번호·필수 첨부·매입 대금지급', '검토', 'V2.4: 통합문서함 문서번호(SMS-유형-YYMM-NNN) 체계 프로토타입 반영. 매입 대금지급은 후속'],
  ['B', '교차검토(C-1) 차단/경고', '검토', '1차는 전 항목 경고 + 로그 축적. 차단 규칙은 후속'],
  ['B', '원가명세서·견적 계산', '후속', 'BPI 완료 전 착수 불가. 1차는 파일 첨부·문서번호 연결만'],
  ['B', 'HB 장비 재고·시리얼', '검토', 'V2.4: 제품라인 HyBoost 수량 기준 출고 요청·출고이력 반영. 시리얼·재고 수량은 후속'],
  ['B', '매출채권·라이선스 발급·내부보고', '검토', 'V2.4 수정안으로 추가된 영역. 1차 포함 여부는 분석 단계 범위 판정(§2-2 절단 규칙) 대상'],
  ['C', '고객정보 공유 구조', '1차', '조회 API·읽기 전용 뷰, TQS 대사 배치, 골드마인 매핑'],
  ['C', '권한 롤 6종', '1차', '서버 측 건별 데이터 범위 검사'],
  ['C', '대시보드·현황', '1차', '팀·담당자·파트너 현황, 포케스팅'],
  ['C', '관리자 기능', '1차', '사용자·역할·팀·공통코드, 감사 로그'],
  ['D', '전자결재·재무시스템 연동', '후속', '채번 주체·결재 행위·연계 수준 확정 후'],
  ['D', '게시판 5종·직출/직퇴·차량예약', '제외', '그룹웨어로 이관 권고'],
  ['D', '기술지원 요청·SE 일정·이슈·패키지', '후속', '2차(기술지원 시스템). 1차는 TQS 프로젝트코드 필드만'],
];
const COLOR: Record<string, string> = { '1차': 'green', 검토: 'gold', 후속: 'orange', 제외: 'default' };

export default function RoadmapPage() {
  const device = useDevice();
  if (device !== 'desktop') {
    return <div className="m-body"><List header="1차 범위와 후속 항목 (수행계획서 v1.1 §2-2)">{SCOPE.map(([g, n, s, d]) => <List.Item key={n} description={d} extra={<MTag color={s === '1차' ? 'success' : s === '검토' ? 'warning' : 'default'} fill="outline">{s}</MTag>}>{g} · {n}</List.Item>)}</List></div>;
  }
  return (
    <div className="pane" style={{ minHeight: 'calc(100vh - 96px)' }}>
      <Typography.Title level={5}>1차 범위 · 검토 · 후속 · 제외 — 수행계획서 v1.1 §2-2</Typography.Title>
      <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="범위 절단 규칙 — 일정이 밀리면 기능을 줄이지 날짜를 늘리지 않는다. 절단 순서: 대시보드 → 관리자 일부 → 계약 상세 → 검토 항목. 고객 마스터·영업 건·공유 구조·데이터 이행은 절단하지 않는다." />
      <Steps size="small" current={0} style={{ marginBottom: 16 }} items={[{ title: '분석 2주', description: '09-28~10-09' }, { title: '설계 3주', description: '10-12~10-30' }, { title: '구축 5주', description: 'S1~S5 · 11-02~12-04' }, { title: '테스트 2주', description: '12-07~12-18' }, { title: '완료 1주', description: '12-21~12-25' }]} />
      <Table size="small" pagination={false} rowKey={(r) => r[1]} dataSource={SCOPE} columns={[
        { title: '구분', dataIndex: 0, width: 60 }, { title: '기능 영역', dataIndex: 1, width: 240, render: (v) => <b>{v}</b> },
        { title: '범위', dataIndex: 2, width: 80, render: (v) => <Tag color={COLOR[v]}>{v}</Tag> }, { title: '1차 내용 / 판단 근거', dataIndex: 3 },
      ]} />
      <div className="muted" style={{ marginTop: 10 }}>본 프로토타입은 「1차」 항목의 화면 흐름을 검증하기 위한 것이며, 「검토」 항목은 데이터 모델에 자리만 확보(옵션 필드)했습니다.</div>
    </div>
  );
}
