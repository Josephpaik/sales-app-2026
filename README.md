# sales-app-2026 — 소만사 신규 영업관리시스템 프로토타입

> 영업관리시스템 1차 개발 수행계획서 v1.1(2026-09-17)과 Sales_UIUX 시뮬레이션(v9 → **V2.4 수정안, 2026-09-29**)을 근거로 만든 **프론트엔드 프로토타입**입니다.
> v1.1(2026-10-12): 대시보드 위젯화, 영업현황·제품라인 입력체계(제품분류 216 품목·서티 승인), 사업관리 허브 통합, 매출채권, 내부보고·집계통계, 라이선스 발급·HyBoost 출고이력 반영 — 변경 상세는 `docs/changes-v1.1-V2.4.md`.
> PC(사내 영업관리)는 **Ant Design**, 모바일/태블릿(현장 영업)은 **Ant Design Mobile**을 적용하고, 하나의 반응형 웹으로 통합했습니다.
> 화면 데이터는 전부 가상 시연 데이터이며 실데이터·개인정보를 포함하지 않습니다.

## 1. 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기 (http://localhost:4173/sales-app-2026/)
npm run build:ds   # 디자인 시스템 번들 (design-system/components/bundle.js·bundle.css)
```

- 디자인 시스템(토큰·가이드·컴포넌트 미리보기)은 `design-system/` — 시작점은 `design-system/README.md`, 토큰은 `design-system/tokens.json`.
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
| 상태·데이터 | 인메모리 스토어 + localStorage (`src/api/store.ts`, 키 `sales-app-2026:db:v2`) | `src/api/index.ts`의 함수 시그니처를 유지한 채 fetch로 교체하면 백엔드 연동. 업무 규칙(서티·검수·발급 수량·매출채권 상태·문서번호)도 이 계층에 있음 |

## 3. 화면 분할 전략 (기기별)

| 구분 | 현장 영업 (모바일/태블릿) | 사내 영업관리 (PC 웹) |
|---|---|---|
| 분할 | 폰 1단(목록 ↔ 상세 전환) · 태블릿 **최대 2단**(왼쪽 목록 / 오른쪽 상세) | **3단 이상** (Sider 네비 / 목록·대시보드 / 필터·상세) |
| 핵심 컴포넌트 | Drawer(서랍식 메뉴), Bottom Sheet(필터·빠른 등록·활동 기록), ActionSheet(상태 전이) | Sider(고정 메뉴), Splitter(폭 조절 분할), Table(집계·정렬·내보내기) |
| 설계 목표 | 빠른 정보 입력과 기동성 — 필수 항목만, 큰 터치 영역, 전화 걸기 링크 | 대량 데이터 모니터링·검토 — 집계 행, 다중 필터, 상세 미리보기 |
| 브레이크포인트 | `< 768px` phone · `768~1199px` tablet | `≥ 1200px` desktop (`src/hooks/useDevice.ts`) |

같은 라우트(`/sales`, `/sales/:id` …)를 기기별로 다른 레이아웃·컴포넌트로 렌더링합니다. 업무 로직(필터, 집계, 상태 전이, 권한 검사)은 `src/api`, `src/pages/sales/useSalesFilter.ts`에 공유되어 두 화면이 같은 규칙을 따릅니다.

## 4. 화면 목록 (v1.1)

`docs/screens.md` 참고. 메뉴 구조(V2.4):

| 구역 | 메뉴 | 내용 |
|---|---|---|
| WORKSPACE | 대시보드 | 위젯형: 내가 처리할 업무 · 즐겨찾기 · 실적 KPI · 공지/자료실 · 나의 영업 일정 · 직출 · 진행 중 Forecasting · 업무 진행 현황 (위젯 설정 저장) |
| WORKSPACE | 영업 현황 | 3단(조회 조건 \| 목록+집계 \| 세부내용) + 세부내용 전체화면(단계 스트립). 등록 시 프로젝트코드 자동 채번·서티 자동 상신, 제품라인은 제품분류 216 품목 연동 |
| WORKSPACE | 사업관리 | 동일 탭 체계: 업무 홈 · 계약·원가 · 직출관리 · 라이선스 발급이력 · HyBoost 출고이력 · 매출채권 · 보고·통계(가마감/마감·집계통계) · 통합문서함 |
| 기준정보 | 고객사·계약처 / 파트너 / 제품 / 고객정보 공유 | 고객사 등록 승인함, 계약처 마스터(신용등급), 제품분류 216 + HyBoost 14, TQS 대사·골드마인 매핑·조회 API |
| 관리자 | 사용자·권한 / 공통코드 / 감사 로그 / 후속 범위 | 역할 7종 권한 매트릭스 |

## 5. 권한 롤 7종 (시연)

영업담당자(본인 팀) / 팀장(본인 팀·서티 승인) / 영업지원관리자 / 재무 / MA / 본부장·사업부장 / 시스템관리자. 메뉴 노출과 데이터 범위(`visibleSales`), 편집·열람 권한(`can.*`)을 `src/api/index.ts`에서 흉내 냅니다. **실제 구현에서는 서버(Django 권한 + 객체 수준 검사)가 건별 인가를 수행해야 합니다.**

## 6. 백엔드 연동 시 교체 지점

1. `src/api/index.ts` — 각 함수를 `/api/v1/...` 호출로 교체 (시그니처 유지).
2. `src/api/store.ts` — 서버 응답 캐시로 대체(예: TanStack Query).
3. `src/types/index.ts` — Django 모델·DRF 시리얼라이저와 1:1 대응 (후속 컬럼은 이미 옵션 필드로 예약).
4. 인증 — 사내 계정 연동 여부 확인 후 세션/토큰 방식 결정 (수행계획서 4-1 #7 확인필요).

## 7. 문서

- `docs/changes-v1.1-V2.4.md` — **V2.4 수정안 반영 변경내역서**
- `docs/screens.md` — 화면 목록·항목·버튼·상태 전이
- `docs/responsive-strategy.md` — 반응형 분할 전략과 컴포넌트 매핑
- `docs/decisions/` — ADR (수행계획서 §4-3 "결정은 ADR 형식으로")

## 8. 배포

`main` 브랜치 push 시 GitHub Actions가 빌드하여 GitHub Pages에 배포합니다 (`.github/workflows/deploy.yml`). 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정하세요.
배포 주소: `https://josephpaik.github.io/sales-app-2026/`
