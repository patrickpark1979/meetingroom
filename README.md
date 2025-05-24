# 회의실 예약 시스템

회의실을 예약할 수 있는 웹 애플리케이션입니다.

## 기능

- 회의실 목록 조회
- 회의실 예약 (이름, 연락처, 모임명, 날짜/시간)
- 관리자 페이지에서 회의실 추가
- 예약 목록 조회

## 기술 스택

- Frontend: React, TypeScript
- Backend: Node.js, Express
- Database: MongoDB

## 설치 방법

1. MongoDB 설치 및 실행
```bash
# MongoDB 설치 후 실행
mongod
```

2. 백엔드 설치 및 실행
```bash
# 의존성 설치
npm install

# 서버 실행
npm run dev
```

3. 프론트엔드 설치 및 실행
```bash
cd client
npm install
npm start
```

## 환경 변수 설정

`.env` 파일을 프로젝트 루트 디렉토리에 생성하고 다음 내용을 추가합니다:

```
MONGODB_URI=mongodb://localhost:27017/meeting-room
PORT=5000
```

## 사용 방법

1. 관리자 페이지에서 회의실 추가
   - 회의실 이름, 위치, 수용 인원 입력

2. 메인 페이지에서 회의실 예약
   - 회의실 선택
   - 예약자 정보 입력 (이름, 연락처, 모임명)
   - 예약 시간 선택 (시작 시간, 종료 시간)

3. 예약 목록 확인
   - 메인 페이지에서 현재 예약된 목록 확인 가능 