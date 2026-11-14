# 여행기록 — 프로젝트 규칙

여행 다니면서 들른 식당·카페·장소를 기록하고, 느낀 점·했던 일·쓴 돈·영업시간·다음에 쓸 꿀팁을 남겨두는 **나만 보는 여행 일지**. 카카오맵으로 장소를 검색해서 추가하고, 지도에서 다녀온 곳을 한눈에 본다.
UI 문구는 전부 한국어 존댓말. 모바일 우선(390px), 한 손 조작.

## 절대 원칙
1. **운영 비용 0원.** 서버 코드·유료 API 없음. 정적 호스팅(Vercel/Cloudflare Pages) + Firebase 무료 요금제(Spark) + 카카오맵 무료 티어만.
2. **암호화하지 않는다.** 관계노트와 달리 여행 기록(장소·메모·금액)은 신원 정보보다 민감도가 낮다고 보고, 평문으로 IndexedDB·Firestore에 저장한다 — 사용자가 명시적으로 선택한 트레이드오프. 유일한 방어선은 `firestore.rules`의 접근 제어(로그인한 본인만). 다시 암호화하자고 하지 않는 한 이 구조를 유지한다.
3. **앱 잠금 없음.** 비밀번호 화면 없이 바로 들어간다. 동기화(구글 로그인)는 선택 사항이고, 켜지 않아도 이 기기 안에서는 그대로 쓸 수 있다.
4. **공유 기능 없음.** 남에게 보내기·공개 링크·SNS 연동은 만들지 않는다.
5. **동기화는 계정별로 완전히 분리.** Firestore 규칙에서 `request.auth.uid`가 자기 문서(`vaults/{uid}`)일 때만 읽기/쓰기를 허용. Firebase 설정값은 `.env.local`(VITE_FIREBASE_*)로, 커밋하지 않는다.
6. **지도는 카카오맵.** `VITE_KAKAO_APP_KEY`(JavaScript 키) 하나로 지도 표시 + 장소 검색(`kakao.maps.services.Places`, REST API 아님 — CORS 문제 없고 별도 키 불필요) 둘 다 해결한다. 키가 없으면 지도/검색 없이 주소 직접 입력으로 대체 동작해야 한다.
7. 새 의존성은 꼭 필요할 때만, 추가 전에 이유를 말한다.

## 스택
Vite + React 19 + TypeScript(strict) · CSS 변수(라이트/다크) · idb(IndexedDB 래퍼) · Firebase(Auth, Firestore, 동기화 켰을 때만) · 카카오맵 JS SDK · vite-plugin-pwa · Vitest + Playwright

## 폴더
```
src/
  types.ts              데이터 타입(Trip, PlaceVisit, Vault)
  lib/storage.ts         IndexedDB 저장/불러오기 (평문)
  lib/trips.ts            Trip/PlaceVisit CRUD, 검색, 합계
  lib/merge.ts            항목별 updatedAt 최신 우선 병합 + 삭제 기록(deleted) 반영 (동기화용)
  lib/backup.ts           백업 파일(JSON) 내보내기·불러오기
  lib/kakao.ts            카카오맵 SDK 로더 + 장소 검색
  lib/sync.ts             Firebase 동기화 — 실시간 구독 + 자동 올리기
  lib/format.ts           날짜·금액 표시
  lib/layout.ts           공용 스타일(헤더 고정, 뒤로가기 버튼)
  screens/                Trips, TripDetail, PlaceEdit, PlaceCard, MapView, Settings
  components/             TabBar
```

## 품질
- 로직(lib/)은 화면과 분리하고 Vitest 테스트를 붙인다.
- 화면을 바꾸면 Playwright로 390×844에서 띄워 확인한 뒤 "완료"라고 말한다.
- 단계마다 git 커밋(한국어 짧은 메시지).
