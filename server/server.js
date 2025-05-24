const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// MongoDB 연결
mongoose.connect('mongodb://localhost:27017/meeting-room-reservation', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB 연결됨');
  console.log('MongoDB에 연결되었습니다.');
  console.log('연결 상태:', mongoose.connection.readyState);
})
.catch((err) => {
  console.error('MongoDB 연결 실패:', err);
});

// 스키마 정의
const roomSchema = new mongoose.Schema({
  name: String,
  location: String,
  capacity: Number,
  facilities: [String]
});

const reservationSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  userName: String,
  contact: String,
  meetingName: String,
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// 모델 생성
const Room = mongoose.model('Room', roomSchema);
const Reservation = mongoose.model('Reservation', reservationSchema);

// API 라우트
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 회의실 추가 API 추가
app.post('/api/rooms', async (req, res) => {
  try {
    const room = new Room({
      name: req.body.name,
      location: req.body.location,
      capacity: req.body.capacity,
      facilities: req.body.facilities || []
    });
    
    const savedRoom = await room.save();
    res.status(201).json(savedRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 회의실 수정 API 추가
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedRoom) {
      return res.status(404).json({ message: '회의실을 찾을 수 없습니다.' });
    }
    res.json(updatedRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 회의실 삭제 API 추가
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: '회의실을 찾을 수 없습니다.' });
    }

    // 해당 회의실의 모든 예약 삭제
    await Reservation.deleteMany({ roomId: req.params.id });
    // 회의실 삭제
    await Room.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: '회의실과 관련 예약이 모두 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find().populate('roomId');
    console.log('조회된 예약 목록:', reservations);
    res.json(reservations);
  } catch (error) {
    console.error('예약 목록 조회 중 오류:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    console.log('예약 생성 요청 데이터:', req.body);
    
    const { roomId, userName, contact, meetingName, startTime, endTime, repeatType, repeatEndDate } = req.body;
    
    // 날짜 형식 검증
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
    const repeatEndDateTime = repeatEndDate ? new Date(repeatEndDate) : null;
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({ message: '유효하지 않은 날짜 형식입니다.' });
    }

    // 반복 예약 생성
    const reservations = [];
    let currentDate = new Date(startDateTime);
    const endDate = repeatEndDateTime || startDateTime;

    while (currentDate <= endDate) {
      // 예약 시간 중복 체크
      const existingReservation = await Reservation.findOne({
        roomId: roomId,
        $or: [
          {
            startTime: { $lt: new Date(currentDate.getTime() + (endDateTime - startDateTime)) },
            endTime: { $gt: currentDate }
          }
        ]
      });

      if (!existingReservation) {
        const reservation = new Reservation({
          roomId,
          userName,
          contact,
          meetingName,
          startTime: new Date(currentDate),
          endTime: new Date(currentDate.getTime() + (endDateTime - startDateTime))
        });
        reservations.push(reservation);
      }

      // 다음 날짜 계산
      if (repeatType === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (repeatType === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        break;
      }
    }

    if (reservations.length === 0) {
      return res.status(400).json({ message: '해당 기간에 이미 예약이 있습니다.' });
    }

    // 모든 예약 저장
    const savedReservations = await Reservation.insertMany(reservations);
    console.log('저장된 예약 데이터:', savedReservations);
    
    // 저장된 예약 데이터를 Room 정보와 함께 반환
    const populatedReservations = await Reservation.find({
      _id: { $in: savedReservations.map(r => r._id) }
    }).populate('roomId');
    
    res.status(201).json(populatedReservations);
  } catch (error) {
    console.error('예약 생성 중 오류:', error);
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/reservations/:id', async (req, res) => {
  try {
    await Reservation.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: '예약이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 초기 데이터 삽입
async function initializeData() {
  try {
    // 기존 데이터가 있는지 확인
    const existingRooms = await Room.find();
    if (existingRooms.length > 0) {
      console.log('기존 데이터가 존재합니다. 초기화를 건너뜁니다.');
      return;
    }

    // 세미나실 데이터 생성
    const rooms = [
      {
        name: '세미나실 A',
        location: '1층',
        capacity: 20,
        facilities: ['프로젝터', '화이트보드', '음향시스템']
      },
      {
        name: '세미나실 B',
        location: '2층',
        capacity: 15,
        facilities: ['프로젝터', '화이트보드']
      },
      {
        name: '세미나실 C',
        location: '3층',
        capacity: 10,
        facilities: ['화이트보드']
      }
    ];

    // 세미나실 데이터 저장
    const savedRooms = await Room.insertMany(rooms);
    console.log('초기 세미나실 데이터가 생성되었습니다.');

    // 예약 데이터 생성
    const reservations = [
      {
        roomId: savedRooms[0]._id,
        userName: '홍길동',
        contact: '010-1234-5678',
        meetingName: '팀 미팅',
        startTime: new Date('2024-03-20T09:00:00'),
        endTime: new Date('2024-03-20T10:00:00')
      },
      {
        roomId: savedRooms[1]._id,
        userName: '김철수',
        contact: '010-9876-5432',
        meetingName: '프로젝트 회의',
        startTime: new Date('2024-03-20T14:00:00'),
        endTime: new Date('2024-03-20T15:30:00')
      }
    ];

    // 예약 데이터 저장
    await Reservation.insertMany(reservations);
    console.log('초기 예약 데이터가 생성되었습니다.');
  } catch (error) {
    console.error('초기 데이터 생성 중 오류 발생:', error);
  }
}

// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  // 초기 데이터 생성 (데이터가 없을 때만)
  initializeData();
}); 