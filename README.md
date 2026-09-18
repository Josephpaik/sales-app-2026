# sales-app-2026 — 소만사 신규 영업관리시스템 프로토타입

> 영업관리시스템 1차 개발 수행계획서 v1.1(2026-09-17)과 Sales_UIUX_v9 시뮬레이션을 근거로 만든 **프론트엔드 프로토타입**입니다.
> PC(사내 영업관리)는 **Ant Design**, 모바일/태블릿(현장 영업)은 **Ant Design Mobile**을 적용하고, 하나의 반응형 웹으로 통합했습니다.
> 화면 데이터는 전부 가상 시연 데이터이며 실데이터·개인정보를 포함하지 않습니다.

## 1. 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기 (http://localhost:4173/sales-app-2026/)
```

- Node 20 이상 권장. 맥북 로컬(수행계획서 4-1 #8 개발 환경)에서 그대로 동작합니다.
- 브라우저 폭을 줄이면 자동으로 모바일/태블릿 레이아웃으로 전환됩니다. 시연 시 강제 전환: `#/sales?device=phone|tablet|desktop`
- 화면 우측 상단(모바일은 사람 아이콘)에서 **역할 6종 전환**과 **시연 데이터 초기화**가 가능합니다. 데이터는 브라우저 localStorage에 저장됩니다.

## 2. 기술 스택

| 구분 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | React 19 + TypeScript + Vite | Django 템플릿 대신 SPA. 실제 구현 시 Django REST(DRF)와 분리 배포 또는 Django 정적 서빙 |
| PC UI | antd 6 | Layout.Sider(고정 메뉴), **Splitter**(다단 분할·폭 조절), Table(집계 행·정렬), Modal Form |
| 모바일/태블릿 UI | antd-mobile 5 | NavBar, **Popup(Drawer·Bottom Sheet)**, TabBar, List, Selector, ActionSheet, Steps |
| 라우팅 | react-router 7 (HashRouter) | GitHub Pages 정적 호스팅 호환 |
| 상태·데이터 | 인메모리 스토어 + localStorage (`src/api/store.ts`) | `src/api/index.ts`의 함수 시그니처를 유지한 채 fetch로 교체하면 백엔드 연동 |

## 3. 화면 분할 전략 (기기별)

| 구분 | 현장 영업 (모바일/태블릿) | 사내 영업관리 (PC 웹) |
|---|---|---|
| 분할 | 폰 1단(목록 ↔ 상세 전환) · 태블릿 **최대 2단**(왼쪽 목록 / 오른쪽 상세) | **3단 이상** (Sider 네비 / 목록·대시보드 / 필터·상세) |
| 핵심 컴포넌트 | Drawer(서랍식 메뉴), Bottom Sheet(필터·빠른 등록·활동 기록), ActionSheet(상태 전이) | Sider(고정 메뉴), Splitter(폭 조절 분할), Table(집계·정렬·내보내기) |
| 설계 목표 | 빠른 정보 입력과 기동성 — 필수 항목만, 큰 터치 영역, 전화 걸기 링크 | 대량 데이터 모니터링·검토 — 집계 행, 다중 필터, 상세 미리보기 |
| 브레이크포인트 | `< 768px` phone · `768~1199px` tablet | `≥ 1200px` desktop (`src/hooks/useDevice.ts`) |

같은 라우트(`/sales`, `/sales/:id` …)를 기기별로 다른 레이아웃·컴포넌트로 렌더링합니다. 업무 로직(필터, 집계, 상태 전이, 권한 검사)은 `src/api`, `src/pages/sales/useSalesFilter.ts`에 공유되어 두 화면이 같은 규칙을 따릅니다.

## 4. 화면 목록 (1차 범위)

`docs/screens.md` 참고. 요약:

| 메뉴 | PC | 모바일/태블릿 | 수행계획서 근거 |
|---|---|---|---|
| 대시보드 | KPI 5종, 단계별 파이프라인, 팀/담당자별 수주, 파트너 현황, 월별 포케스팅, 경고·최근 변경 | KPI 4종, 월별 바, 담당자별, 최근 변경 | §2-2 C 대시보드·현황 |
| 영업 건 | 3단(필터 \| 목록+집계 \| 상세). 등록·수정, 제품 라인, 상태 전이(15종·허용 전이 검사), 활동·이력, 첨부, CSV 내보내기 | 검색·필터 시트, 빠른 등록 시트, 상세(Steps·탭), 활동 기록 시트, 상태 전이 ActionSheet | §2-2 B 영업 건 관리 |
| 고객사 | 3단(필터 \| 마스터 \| 360° 뷰). 담당자 마스킹·열람 로그, 사이트·건물관리번호 중복 탐지, 변경 이력, 등록/수정 | 목록/상세 2단, 빠른 등록 | §2-2 A 고객사 마스터, §3-2 ⑤ |
| 파트너·제품 | 마스터 목록 + Drawer 상세, 경유 매출·수수료 | 목록/상세, 제품군별 접기 | §2-2 A |
| 계약 | 목록 + 상세, 등록/수정, MA 요율, 원문 열람 권한(B-2) | 목록/상세 2단 | §2-2 B 계약 기본 |
| 고객정보 공유 | TQS 대사 예외 판정, 골드마인 별칭 매핑·표본 매핑률, 조회 API·뷰 시뮬레이션 | 조회·간이 판정 | §3-2 ②③④ |
| 관리자 | 사용자·역할·팀, 권한 매트릭스, 공통코드, 감사 로그 | 조회 전용 | §2-2 C 관리자 기능 |
| 후속 범위 | 1차/검토/후속/제외 표와 일정 Steps | 목록 | §2-2, §4 |

## 5. 권한 롤 6종 (시연)

영업(본인 팀 범위) / 영업지원 / 재무 / MA / 경영진 / 관리자. 메뉴 노출과 데이터 범위(`visibleSales`), 편집·열람 권한(`can.*`)을 `src/api/index.ts`에서 흉내 냅니다. **실제 구현에서는 서버(Django 권한 + 객체 수준 검사)가 건별 인가를 수행해야 합니다.**

## 6. 백엔드 연동 시 교체 지점

1. `src/api/index.ts` — 각 함수를 `/api/v1/...` 호출로 교체 (시그니처 유지).
2. `src/api/store.ts` — 서버 응답 캐시로 대체(예: TanStack Query).
3. `src/types/index.ts` — Django 모델·DRF 시리얼라이저와 1:1 대응 (후속 컬럼은 이미 옵션 필드로 예약).
4. 인증 — 사내 계정 연동 여부 확인 후 세션/토큰 방식 결정 (수행계획서 4-1 #7 확인필요).

## 7. 문서

- `docs/screens.md` — 화면 목록·항목·버튼·상태 전이
- `docs/responsive-strategy.md` — 반응형 분할 전략과 컴포넌트 매핑
- `docs/decisions/` — ADR (수행계획서 §4-3 "결정은 ADR 형식으로")

## 8. 배포

`main` 브랜치 push 시 GitHub Actions가 빌드하여 GitHub Pages에 배포합니다 (`.github/workflows/deploy.yml`). 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정하세요.
배포 주소: `https://josephpaik.github.io/sales-app-2026/`
