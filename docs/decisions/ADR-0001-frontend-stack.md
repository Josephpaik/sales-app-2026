# ADR 0001: 프로토타입 프론트엔드 스택 — React + AntD / antd-mobile 반응형 단일 웹

## 1. 상태 (Status)
- 현재 상태: 수락됨(Accepted) — 프로토타입 범위
- 결정 날짜: 2026-09-18
- 승인자: CISO 백원광

## 2. 배경 (Context)
- 수행계획서 v1.1은 Django + PostgreSQL 자체 개발을 전제로 한다. 설계 단계(§4-2 #3)에서 핵심 5개 화면의 현업 리뷰가 게이트이므로, 그 전에 화면 흐름을 검증할 프로토타입이 필요하다.
- 현장 영업(모바일/태블릿)과 사내 영업관리(PC)는 분할 전략이 달라야 하나, 두 벌의 앱을 1인이 유지할 수 없다.

## 3. 결정 (Decision)
- React 19 + TypeScript + Vite 단일 SPA. PC는 antd 6, 모바일/태블릿은 antd-mobile 5를 같은 번들에서 사용하고 `useDevice()`로 렌더링을 분기한다.
- 라우트는 기기와 무관하게 동일하다(`/sales/:id` 등). 업무 규칙(상태 전이·권한·집계)은 `src/api`에 두어 두 화면이 공유한다.
- 데이터는 인메모리 스토어 + localStorage. `src/api/index.ts`의 함수 시그니처를 유지한 채 DRF 호출로 교체한다.
- HashRouter + GitHub Pages로 정적 배포하여 현업 리뷰 시 URL만 공유한다.

## 4. 결과 (Consequences)
- 긍정적 효과: 화면 25~30개 설계 초안을 실제 동작으로 검증. 모바일/PC 로직 중복 없음. 백엔드 없이 리뷰 가능.
- 부정적 영향/비용: 번들 크기(antd + antd-mobile 동시 포함, gzip 약 560KB) — 운영 시 라우트 단위 코드 분할 필요. Django 템플릿 기반으로 갈 경우 SPA 분리 운영·CSRF/세션 설계가 추가된다(보안 설계 §4-2 #7에서 결정).
