# 분실물 찾기

우리 학교 분실물을 **사진과 함께 등록**하고, 이름·색깔·장소로 **찾아보는** 웹앱입니다.
모든 사람이 같은 목록을 봅니다 (Vercel Blob 저장소).

## 기능
- 물건 등록: 사진(휴대폰·태블릿 카메라 바로 촬영 가능, 자동으로 줄여서 업로드), 이름, 종류, 색깔, 주운 곳/날, 맡겨 둔 곳, 특징
- 찾기: 검색어 + 종류 필터, "주인 찾은 물건도 보기"
- 선생님 모드: 관리자 비밀번호로 "주인 찾음" 표시, 삭제

## Vercel 배포 설정 (처음 한 번)
1. vercel.com/new 에서 이 GitHub 저장소를 Import → Deploy
2. 프로젝트 → **Storage** → Create → **Blob** (접근: Public) → 이 프로젝트에 Connect
   (`BLOB_READ_WRITE_TOKEN` 이 자동으로 들어갑니다)
3. 프로젝트 → Settings → **Environment Variables** → `ADMIN_PIN` = 선생님 비밀번호
4. Deployments → 최신 배포 ⋯ → **Redeploy** (환경변수 반영)

## 로컬 실행
```
npm install
npm run dev
```
http://localhost:3000 — 토큰이 없으면 메모리에 저장되고, 관리자 비밀번호는 `1234` 입니다.
