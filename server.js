const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// MongoDB 연결
const MONGODB_URI = 'mongodb://127.0.0.1:27017/meeting-room';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('MongoDB에 연결되었습니다.');
  console.log('연결 상태:', mongoose.connection.readyState);
  
  // 기본 회의실 데이터 추가
  try {
    const count = await Room.countDocuments();
    if (count === 0) {
      const defaultRooms = [
        { name: '세미나실', location: '1층', capacity: 20 },
        { name: '본당', location: '2층', capacity: 100 },
        { name: '3040방', location: '3층', capacity: 10 },
        { name: '지하기도실', location: '지하', capacity: 20 },
        { name: '유치부실', location: '1층', capacity: 15 }
      ];
      await Room.insertMany(defaultRooms);
      console.log('기본 장소가 추가되었습니다.');
    }
  } catch (error) {
    console.error('기본 회의실 추가 중 오류 발생:', error);
  }
}).catch((error) => {
  console.error('MongoDB 연결 오류:', error);
});

// MongoDB 연결 상태 모니터링
mongoose.connection.on('connected', () => {
  console.log('MongoDB 연결됨');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB 연결 오류:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB 연결 끊김');
});

// 회의실 스키마
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true }
});

// 예약 스키마
const reservationSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  userName: { type: String, required: true },
  contact: { type: String, required: true },
  meetingName: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true }
});

const Room = mongoose.model('Room', roomSchema);
const Reservation = mongoose.model('Reservation', reservationSchema);

// API 라우트
// 회의실 목록 조회
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 회의실 삭제 (관리자용)
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id;
    console.log('삭제 요청 받음:', roomId);
    
    // ObjectId 형식 검증
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      console.log('잘못된 ID 형식');
      return res.status(400).json({ message: '잘못된 장소 ID입니다.' });
    }

    // 해당 장소의 예약이 있는지 확인
    const hasReservations = await Reservation.exists({ roomId: roomId });
    if (hasReservations) {
      console.log('예약이 있어 삭제 불가');
      return res.status(400).json({ message: '해당 장소에 예약이 있어 삭제할 수 없습니다.' });
    }

    const deletedRoom = await Room.findByIdAndDelete(roomId);
    if (!deletedRoom) {
      console.log('장소를 찾을 수 없음');
      return res.status(404).json({ message: '장소를 찾을 수 없습니다.' });
    }

    console.log('장소 삭제 성공:', deletedRoom);
    res.status(200).json({ message: '장소가 삭제되었습니다.' });
  } catch (error) {
    console.error('회의실 삭제 중 오류 발생:', error);
    res.status(500).json({ message: error.message });
  }
});

// 회의실 수정 (관리자용)
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const roomId = req.params.id;
    console.log('수정 요청 받음 - ID:', roomId);
    
    // ObjectId 형식 검증
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      console.log('잘못된 ID 형식');
      return res.status(400).json({ message: '잘못된 장소 ID입니다.' });
    }

    const { name, location, capacity } = req.body;
    console.log('수정 데이터:', { name, location, capacity });

    // 입력값 유효성 검사
    if (!name || !location || !capacity) {
      console.log('필수 필드 누락');
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    // 다른 장소와 이름 중복 체크
    const existingRoom = await Room.findOne({ 
      name: name,
      _id: { $ne: roomId }
    });
    if (existingRoom) {
      console.log('중복된 장소 이름');
      return res.status(400).json({ message: '이미 존재하는 장소 이름입니다.' });
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      { name, location, capacity: parseInt(capacity) },
      { new: true, runValidators: true }
    );

    if (!updatedRoom) {
      console.log('장소를 찾을 수 없음');
      return res.status(404).json({ message: '장소를 찾을 수 없습니다.' });
    }

    console.log('장소 수정 성공:', updatedRoom);
    res.status(200).json(updatedRoom);
  } catch (error) {
    console.error('회의실 수정 중 오류 발생:', error);
    res.status(500).json({ message: error.message });
  }
});

// 회의실 추가 (관리자용)
app.post('/api/rooms', async (req, res) => {
  try {
    console.log('회의실 추가 요청:', req.body);
    
    // 입력값 유효성 검사
    if (!req.body.name || !req.body.location || !req.body.capacity) {
      console.log('필수 필드 누락:', { 
        name: req.body.name, 
        location: req.body.location, 
        capacity: req.body.capacity 
      });
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    // 장소 이름 중복 체크
    const existingRoom = await Room.findOne({ name: req.body.name });
    if (existingRoom) {
      console.log('중복된 장소 이름:', req.body.name);
      return res.status(400).json({ message: '이미 존재하는 장소 이름입니다.' });
    }

    const room = new Room({
      name: req.body.name,
      location: req.body.location,
      capacity: req.body.capacity
    });

    const newRoom = await room.save();
    console.log('새로운 회의실 추가 성공:', newRoom);
    res.status(201).json(newRoom);
  } catch (error) {
    console.error('회의실 추가 중 오류 발생:', error);
    res.status(400).json({ message: error.message });
  }
});

// 예약 생성
app.post('/api/reservations', async (req, res) => {
  try {
    const { roomId, userName, contact, meetingName, startTime, endTime, repeatType, repeatCount } = req.body;
    
    // 기본 예약 생성 함수
    const createReservation = async (start, end) => {
      const reservation = new Reservation({
        roomId,
        userName,
        contact,
        meetingName,
        startTime: start,
        endTime: end
      });
      return await reservation.save();
    };

    // 반복 예약 처리
    if (repeatType && repeatType !== 'none' && repeatCount) {
      console.log('반복 예약 요청:', { repeatType, repeatCount });
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const reservations = [];
      const repeatCountNum = parseInt(repeatCount);

      console.log('시작 날짜:', startDate.toISOString());
      console.log('종료 날짜:', endDate.toISOString());
      console.log('반복 횟수:', repeatCountNum);

      // 시간 차이 계산 (밀리초)
      const timeDiff = endDate.getTime() - startDate.getTime();

      // 시작 날짜와 종료 날짜의 시간 정보 저장
      const startHours = startDate.getHours();
      const startMinutes = startDate.getMinutes();
      const startSeconds = startDate.getSeconds();

      console.log('시간 정보:', { startHours, startMinutes, startSeconds, timeDiff });

      // 첫 번째 예약 생성 (시작일)
      const firstReservation = await createReservation(startDate, endDate);
      reservations.push(firstReservation);
      console.log('첫 번째 예약 생성 완료:', {
        start: firstReservation.startTime,
        end: firstReservation.endTime
      });

      // 나머지 반복 예약 생성
      let currentDate = new Date(startDate);
      for (let i = 1; i < repeatCountNum; i++) {
        // 다음 날짜 계산
        if (repeatType === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (repeatType === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // 새로운 시작 시간과 종료 시간 설정
        const newStartDate = new Date(currentDate);
        newStartDate.setHours(startHours, startMinutes, startSeconds);
        
        const newEndDate = new Date(newStartDate.getTime() + timeDiff);

        console.log(`반복 예약 ${i + 1}/${repeatCountNum} 생성 시도:`, {
          start: newStartDate.toISOString(),
          end: newEndDate.toISOString()
        });

        // 예약 가능 여부 확인
        const existingReservation = await Reservation.findOne({
          roomId,
          $or: [
            {
              startTime: { $lt: newEndDate },
              endTime: { $gt: newStartDate }
            }
          ]
        });

        if (!existingReservation) {
          const newReservation = await createReservation(newStartDate, newEndDate);
          reservations.push(newReservation);
          console.log(`반복 예약 ${i + 1}/${repeatCountNum} 생성 성공:`, {
            start: newReservation.startTime,
            end: newReservation.endTime
          });
        } else {
          console.log(`반복 예약 ${i + 1}/${repeatCountNum} 생성 실패: 이미 예약이 있음`);
        }
      }

      console.log('생성된 전체 예약 목록:', reservations.map(r => ({
        start: r.startTime,
        end: r.endTime
      })));
      res.status(201).json(reservations);
    } else {
      // 단일 예약 생성
      const reservation = await createReservation(new Date(startTime), new Date(endTime));
      res.status(201).json(reservation);
    }
  } catch (error) {
    console.error('예약 생성 중 오류 발생:', error);
    res.status(500).json({ message: error.message });
  }
});

// 예약 목록 조회
app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find().populate('roomId');
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 예약 삭제
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const reservationId = req.params.id;
    console.log('예약 삭제 요청 받음:', reservationId);

    // ObjectId 형식 검증
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      console.log('잘못된 예약 ID 형식');
      return res.status(400).json({ message: '잘못된 예약 ID입니다.' });
    }

    const deletedReservation = await Reservation.findByIdAndDelete(reservationId);
    console.log('삭제된 예약:', deletedReservation);

    if (!deletedReservation) {
      console.log('예약을 찾을 수 없음');
      return res.status(404).json({ message: '예약을 찾을 수 없습니다.' });
    }

    console.log('예약 삭제 성공');
    res.status(200).json({ message: '예약이 삭제되었습니다.' });
  } catch (error) {
    console.error('예약 삭제 중 오류 발생:', error);
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});