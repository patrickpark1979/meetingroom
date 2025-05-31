import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import axios from 'axios';
import "react-datepicker/dist/react-datepicker.css";
import './App.css';

interface Room {
  _id: string;
  name: string;
  location: string;
  capacity: number;
  facilities: string[];
}

interface Reservation {
  _id: string;
  roomId: Room;
  userName: string;
  contact: string;
  meetingName: string;
  startTime: string;
  endTime: string;
}

function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    // 한국 시간으로 변환
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    koreaTime.setHours(0, 0, 0, 0);
    return koreaTime;
  });
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [userName, setUserName] = useState('');
  const [contact, setContact] = useState('');
  const [meetingName, setMeetingName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [repeatType, setRepeatType] = useState('none');
  const [repeatCount, setRepeatCount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [clickedSlotId, setClickedSlotId] = useState<string | null>(null);

  // 30분 단위 시간 옵션 생성
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  useEffect(() => {
    console.log('컴포넌트 마운트 - 초기 데이터 로딩');
    fetchRooms();
    fetchReservations();
    // 현재 날짜로 초기화
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setSelectedDate(now);
    // 폼 초기화
    setSelectedRoom('');
    setMeetingName('');
    setStartTime('');
    setEndTime('');
    setUserName('');
    setContact('');
    setRepeatType('none');
    setRepeatCount('');
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/rooms');
      setRooms(response.data);
    } catch (error) {
      console.error('회의실 목록을 불러오는데 실패했습니다:', error);
    }
  };

  const fetchReservations = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/reservations');
      console.log('서버에서 받은 전체 예약 목록:', response.data);
      setReservations(response.data);
    } catch (error) {
      console.error('예약 목록을 불러오는데 실패했습니다:', error);
      setMessage('예약 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 날짜와 시간을 ISO 문자열로 변환 (한국 시간대 적용)
      const startDateTime = new Date(selectedDate);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date(selectedDate);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      const reservationData = {
        roomId: selectedRoom,
        userName,
        contact,
        meetingName,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        repeatType,
        repeatCount: repeatType !== 'none' ? parseInt(repeatCount) : undefined
      };

      console.log('예약 데이터:', reservationData);

      const response = await axios.post('http://localhost:5000/api/reservations', reservationData);

      if (response.status === 201) {
        // 예약 목록 새로 불러오기
        await fetchReservations();
        
        // 폼 초기화
        setSelectedRoom('');
        setMeetingName('');
        setStartTime('');
        setEndTime('');
        setUserName('');
        setContact('');
        setRepeatType('none');
        setRepeatCount('');
        
        setMessage('예약이 완료되었습니다.');
      }
    } catch (error: any) {
      console.error('예약 생성 중 오류:', error);
      setMessage(error.response?.data?.message || '예약 생성에 실패했습니다.');
    }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    try {
      await axios.delete(`/api/reservations/${reservationId}`);
      setReservations(reservations.filter(r => r._id !== reservationId));
    } catch (error) {
      console.error('예약 삭제 중 오류 발생:', error);
    }
  };

  const handleTimeSlotClick = (slotId: string) => {
    setClickedSlotId(clickedSlotId === slotId ? null : slotId);
  };

  const renderTimeSlots = () => {
    const startHour = 0;
    const endHour = 24;

    // 첫 번째 줄 (00:00 ~ 11:30)
    const firstRow = [];
    // 두 번째 줄 (12:00 ~ 23:30)
    const secondRow = [];

    for (let hour = startHour; hour < endHour; hour++) {
      const time1 = `${hour.toString().padStart(2, '0')}:00`;
      const time2 = `${hour.toString().padStart(2, '0')}:30`;
      
      const isReserved1 = reservations.some(reservation => {
        const reservationStart = new Date(reservation.startTime);
        const reservationEnd = new Date(reservation.endTime);
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, 0, 0, 0);
        
        // 시간대를 고려한 날짜 비교
        const reservationStartDate = new Date(reservationStart.getTime() + (9 * 60 * 60 * 1000));
        const selectedDateOnly = new Date(selectedDate.getTime() + (9 * 60 * 60 * 1000));
        
        const slotTimeInMinutes = hour * 60;
        const reservationStartInMinutes = reservationStart.getHours() * 60 + reservationStart.getMinutes();
        const reservationEndInMinutes = reservationEnd.getHours() * 60 + reservationEnd.getMinutes();
        
        const roomIdMatch = typeof reservation.roomId === 'string' 
          ? reservation.roomId === selectedRoom
          : reservation.roomId._id === selectedRoom;
        
        return (
          roomIdMatch &&
          selectedDateOnly.getTime() === reservationStartDate.getTime() &&
          slotTimeInMinutes >= reservationStartInMinutes &&
          slotTimeInMinutes < reservationEndInMinutes
        );
      });

      const isReserved2 = reservations.some(reservation => {
        const reservationStart = new Date(reservation.startTime);
        const reservationEnd = new Date(reservation.endTime);
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, 30, 0, 0);
        
        // 시간대를 고려한 날짜 비교
        const reservationStartDate = new Date(reservationStart.getTime() + (9 * 60 * 60 * 1000));
        const selectedDateOnly = new Date(selectedDate.getTime() + (9 * 60 * 60 * 1000));
        
        const slotTimeInMinutes = hour * 60 + 30;
        const reservationStartInMinutes = reservationStart.getHours() * 60 + reservationStart.getMinutes();
        const reservationEndInMinutes = reservationEnd.getHours() * 60 + reservationEnd.getMinutes();
        
        const roomIdMatch = typeof reservation.roomId === 'string' 
          ? reservation.roomId === selectedRoom
          : reservation.roomId._id === selectedRoom;
        
        return (
          roomIdMatch &&
          selectedDateOnly.getTime() === reservationStartDate.getTime() &&
          slotTimeInMinutes >= reservationStartInMinutes &&
          slotTimeInMinutes < reservationEndInMinutes
        );
      });

      const reservation1 = reservations.find(reservation => {
        const reservationStart = new Date(reservation.startTime);
        const reservationEnd = new Date(reservation.endTime);
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, 0, 0, 0);
        
        // 시간대를 고려한 날짜 비교
        const reservationStartDate = new Date(reservationStart.getTime() + (9 * 60 * 60 * 1000));
        const selectedDateOnly = new Date(selectedDate.getTime() + (9 * 60 * 60 * 1000));
        
        const slotTimeInMinutes = hour * 60;
        const reservationStartInMinutes = reservationStart.getHours() * 60 + reservationStart.getMinutes();
        const reservationEndInMinutes = reservationEnd.getHours() * 60 + reservationEnd.getMinutes();
        
        const roomIdMatch = typeof reservation.roomId === 'string' 
          ? reservation.roomId === selectedRoom
          : reservation.roomId._id === selectedRoom;
        
        return (
          roomIdMatch &&
          selectedDateOnly.getTime() === reservationStartDate.getTime() &&
          slotTimeInMinutes >= reservationStartInMinutes &&
          slotTimeInMinutes < reservationEndInMinutes
        );
      });

      const reservation2 = reservations.find(reservation => {
        const reservationStart = new Date(reservation.startTime);
        const reservationEnd = new Date(reservation.endTime);
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, 30, 0, 0);
        
        // 시간대를 고려한 날짜 비교
        const reservationStartDate = new Date(reservationStart.getTime() + (9 * 60 * 60 * 1000));
        const selectedDateOnly = new Date(selectedDate.getTime() + (9 * 60 * 60 * 1000));
        
        const slotTimeInMinutes = hour * 60 + 30;
        const reservationStartInMinutes = reservationStart.getHours() * 60 + reservationStart.getMinutes();
        const reservationEndInMinutes = reservationEnd.getHours() * 60 + reservationEnd.getMinutes();
        
        const roomIdMatch = typeof reservation.roomId === 'string' 
          ? reservation.roomId === selectedRoom
          : reservation.roomId._id === selectedRoom;
        
        return (
          roomIdMatch &&
          selectedDateOnly.getTime() === reservationStartDate.getTime() &&
          slotTimeInMinutes >= reservationStartInMinutes &&
          slotTimeInMinutes < reservationEndInMinutes
        );
      });

      const slotId1 = `${selectedRoom}-${time1}`;
      const slotId2 = `${selectedRoom}-${time2}`;

      const timeSlot1 = (
        <div 
          key={time1} 
          className={`time-slot ${isReserved1 ? 'reserved' : ''} ${clickedSlotId === slotId1 ? 'clicked' : ''}`}
          onClick={() => isReserved1 && handleTimeSlotClick(slotId1)}
        >
          {time1}
          {isReserved1 && reservation1 && (
            <>
              <div className="reservation-preview">
                {reservation1.meetingName} - {reservation1.userName}
              </div>
              <div className="reservation-details">
                <h4>{reservation1.meetingName}</h4>
                <p>예약자: {reservation1.userName}</p>
                <p>연락처: {reservation1.contact}</p>
                <p>시간: {new Date(reservation1.startTime).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - {new Date(reservation1.endTime).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                <button 
                  className="delete-reservation-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReservation(reservation1._id);
                  }}
                >
                  예약 삭제
                </button>
              </div>
            </>
          )}
        </div>
      );

      const timeSlot2 = (
        <div 
          key={time2} 
          className={`time-slot ${isReserved2 ? 'reserved' : ''} ${clickedSlotId === slotId2 ? 'clicked' : ''}`}
          onClick={() => isReserved2 && handleTimeSlotClick(slotId2)}
        >
          {time2}
          {isReserved2 && reservation2 && (
            <>
              <div className="reservation-preview">
                {reservation2.meetingName} - {reservation2.userName}
              </div>
              <div className="reservation-details">
                <h4>{reservation2.meetingName}</h4>
                <p>예약자: {reservation2.userName}</p>
                <p>연락처: {reservation2.contact}</p>
                <p>시간: {new Date(reservation2.startTime).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })} - {new Date(reservation2.endTime).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                <button 
                  className="delete-reservation-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReservation(reservation2._id);
                  }}
                >
                  예약 삭제
                </button>
              </div>
            </>
          )}
        </div>
      );

      if (hour < 12) {
        firstRow.push(timeSlot1, timeSlot2);
      } else {
        secondRow.push(timeSlot1, timeSlot2);
      }
    }

    return (
      <div className="time-slots-container">
        <div className="time-slots-row">{firstRow}</div>
        <div className="time-slots-row">{secondRow}</div>
      </div>
    );
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    // 한국 시간으로 변환 (시간대 오프셋 제거)
    const koreaTime = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000));
    koreaTime.setHours(0, 0, 0, 0);
    setSelectedDate(koreaTime);
    setMessage('');
  };

  return (
    <Router>
      <div className="App">
        <nav>
          <ul>
            <li><Link to="/" onClick={() => {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              setSelectedDate(now);
            }}>홈</Link></li>
            <li style={{flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: 'white', letterSpacing: '2px'}}>비전교회</li>
            <li><Link to="/admin">관리자</Link></li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={
            <div className="reservation-container">
              <div className="reservation-status">
                <h3>장소별 예약 현황</h3>
                <div className="reservation-info">
                  <p>1. 시간대가 빨강색으로 채워진 곳은 예약하려는 날과 동일한 날에 예약이 된 곳입니다. 삭제하려면 빨강색으로 채워진 곳을 눌러서 삭제할 수도 있습니다.</p>
                  <p>2. 장소 예약은 하단의 모임장소 예약을 통해 가능합니다.</p>
                  <p>3. 장소 추가는 관리자에게 요청하시면 추가 가능합니다.</p>
                </div>
                <div className="rooms-list">
                  {rooms.map(room => {
                    return (
                      <div key={room._id} className="room-item">
                        <div className="room-info">
                          <h3>{room.name}</h3>
                          <p>위치: {room.location}</p>
                          <p>수용 인원: {room.capacity}명</p>
                        </div>
                        <div className="time-slots-container">
                          {renderTimeSlots()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="reservation-form">
                <h2>비전교회 모임장소 예약</h2>
                <p>예약하려는 회의실을 선택하고 정보를 입력해주세요.</p>
                {message && <p style={{ color: message.includes('실패') ? 'red' : 'green' }}>{message}</p>}
                
                <div className="form-row">
                  <div className="form-column">
                    <label htmlFor="room">장소: <span style={{ color: 'red' }}>*</span></label>
                    <select id="room" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} required>
                      <option value="">회의실 선택</option>
                      {rooms.map(room => <option key={room._id} value={room._id}>{room.name} ({room.location})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-column">
                    <label htmlFor="date">날짜: <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="date"
                      id="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={handleDateChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-column">
                    <label htmlFor="startTime">시작 시간: <span style={{ color: 'red' }}>*</span></label>
                    <select
                      id="startTime"
                      value={startTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        setStartTime(newStartTime);
                        // 종료 시간이 시작 시간보다 이전이면 종료 시간 초기화
                        if (endTime && endTime <= newStartTime) {
                          setEndTime('');
                        }
                      }}
                      required
                    >
                      <option value="">시작 시간 선택</option>
                      {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-column">
                    <label htmlFor="endTime">종료 시간: <span style={{ color: 'red' }}>*</span></label>
                    <select
                      id="endTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    >
                      <option value="">종료 시간 선택</option>
                      {timeOptions.map(time => {
                        // 시작 시간이 선택되지 않았거나, 현재 시간이 시작 시간보다 이후인 경우에만 표시
                        if (!startTime || time > startTime) {
                          return <option key={time} value={time}>{time}</option>;
                        }
                        return null;
                      })}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-column">
                    <label htmlFor="userName">이름: <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      placeholder="이름을 입력하세요"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-column">
                    <label htmlFor="contact">연락처: <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      id="contact"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      required
                      placeholder="연락처를 입력하세요"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-column">
                    <label htmlFor="meetingName">모임명: <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      id="meetingName"
                      value={meetingName}
                      onChange={(e) => setMeetingName(e.target.value)}
                      required
                      placeholder="모임명을 입력하세요"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-column">
                    <label>반복 예약: <span style={{ color: 'red' }}>*</span></label>
                    <select
                      value={repeatType}
                      onChange={(e) => {
                        setRepeatType(e.target.value);
                        setRepeatCount('');
                      }}
                      required
                    >
                      <option value="none">반복 안함</option>
                      <option value="weekly">주 단위</option>
                      <option value="monthly">월 단위</option>
                    </select>
                  </div>
                </div>
                {repeatType !== 'none' && (
                  <div className="form-row">
                    <div className="form-column">
                      <label>반복 횟수: <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="number"
                        min="1"
                        max={repeatType === 'weekly' ? "52" : "12"}
                        value={repeatCount}
                        onChange={(e) => {
                          const value = e.target.value;
                          const max = repeatType === 'weekly' ? 52 : 12;
                          if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= max)) {
                            setRepeatCount(value);
                          }
                        }}
                        required
                        placeholder={`반복할 횟수를 입력하세요 (최대 ${repeatType === 'weekly' ? '52' : '12'}회)`}
                      />
                      <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                        {repeatType === 'weekly' ? '주 단위로 반복됩니다. (최대 52주)' : '월 단위로 반복됩니다. (최대 12개월)'}
                      </small>
                    </div>
                  </div>
                )}

                <button type="submit" onClick={handleSubmit}>예약하기</button>
              </div>
            </div>
          } />
          <Route path="/admin" element={
            isAdmin ? <AdminPage /> : <AdminLogin setIsAdmin={setIsAdmin} />
          } />
        </Routes>
      </div>
    </Router>
  );
}

function AdminLogin({ setIsAdmin }: { setIsAdmin: (value: boolean) => void }) {
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.username === 'vision' && loginData.password === 'vision') {
      setIsAdmin(true);
      setError('');
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="admin-login">
      <h2>관리자 로그인</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>아이디:</label>
          <input
            type="text"
            name="username"
            value={loginData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>비밀번호:</label>
          <input
            type="password"
            name="password"
            value={loginData.password}
            onChange={handleChange}
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit">로그인</button>
      </form>
    </div>
  );
}

function AdminPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: ''
  });
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    capacity: ''
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/rooms');
      setRooms(response.data);
    } catch (error) {
      console.error('회의실 목록을 불러오는데 실패했습니다:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/rooms', {
        ...formData,
        capacity: parseInt(formData.capacity)
      });
      alert('회의실이 추가되었습니다!');
      setFormData({
        name: '',
        location: '',
        capacity: ''
      });
      fetchRooms();
    } catch (error) {
      console.error('회의실 추가에 실패했습니다:', error);
      alert('회의실 추가에 실패했습니다.');
    }
  };

  const handleDelete = async (roomId: string) => {
    if (window.confirm('정말로 이 회의실을 삭제하시겠습니까?')) {
      try {
        console.log('삭제 시도:', roomId);
        const response = await axios.delete(`http://localhost:5000/api/rooms/${roomId}`);
        console.log('삭제 응답:', response);
        
        if (response.status === 200) {
          alert('회의실이 삭제되었습니다!');
          await fetchRooms(); // 회의실 목록 새로고침
        }
      } catch (error: any) {
        console.error('삭제 오류:', error);
        if (error.response) {
          console.error('서버 응답:', error.response.data);
          alert(error.response.data.message || '회의실 삭제에 실패했습니다.');
        } else {
          alert('회의실 삭제 중 오류가 발생했습니다.');
        }
      }
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setEditForm({
      name: room.name,
      location: room.location,
      capacity: room.capacity.toString()
    });
  };

  const handleUpdate = async (roomId: string) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/rooms/${roomId}`, {
        name: editForm.name,
        location: editForm.location,
        capacity: parseInt(editForm.capacity)
      });
      
      if (response.status === 200) {
        alert('회의실이 수정되었습니다!');
        setEditingRoom(null);
        fetchRooms();
      }
    } catch (error: any) {
      console.error('수정 오류:', error);
      alert(error.response?.data?.message || '회의실 수정에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setEditingRoom(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="admin-page">
      <h2>장소 관리</h2>
      
      <div className="add-room-form">
        <h3>장소 추가</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>장소 이름:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>위치:</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>수용 인원:</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit">장소 추가</button>
        </form>
      </div>

      <div className="rooms-list">
        <h3>장소 목록</h3>
        {rooms.map(room => (
          <div key={room._id} className="room-item">
            {editingRoom?._id === room._id ? (
              <div className="room-edit-form">
                <div className="edit-input-group">
                  <label>장소 이름:</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="edit-input-group">
                  <label>위치:</label>
                  <input
                    type="text"
                    name="location"
                    value={editForm.location}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="edit-input-group">
                  <label>수용 인원:</label>
                  <input
                    type="number"
                    name="capacity"
                    value={editForm.capacity}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="edit-buttons">
                  <button 
                    className="save-button"
                    onClick={() => handleUpdate(room._id)}
                  >
                    저장
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={handleCancel}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="room-info">
                  <p className="room-name">{room.name}</p>
                  <p>위치: {room.location}</p>
                  <p>수용 인원: {room.capacity}명</p>
                </div>
                <div className="room-buttons">
                  <button 
                    className="edit-button"
                    onClick={() => handleEdit(room)}
                  >
                    수정
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => handleDelete(room._id)}
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// CSS 스타일 추가
const styles = `
  .time-slots-container {
    width: 100%;
    overflow-x: auto;
    margin-top: 10px;
    -webkit-overflow-scrolling: touch;
  }

  .reservation-info {
    background-color: #f8f9fa;
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 5px;
    border-left: 4px solid #007bff;
  }

  .reservation-info p {
    margin: 8px 0;
    color: #333;
    line-height: 1.5;
  }

  .time-slots-header {
    display: flex;
    border-bottom: 1px solid #ddd;
  }

  .time-slot-header {
    width: 30px;
    text-align: center;
    font-size: 0.7rem;
    padding: 2px;
    color: #666;
  }

  .time-slots {
    display: flex;
    height: 30px;
  }

  .time-slot {
    width: 30px;
    height: 100%;
    border-right: 1px solid #eee;
    background-color: #fff;
  }

  .time-slot.reserved {
    background-color: #ffcdd2;
  }

  .room-item {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .room-info {
    margin-bottom: 10px;
  }

  .room-info h3 {
    margin: 0 0 5px 0;
  }

  .room-info p {
    margin: 5px 0;
    color: #666;
  }

  /* 반응형 스타일 */
  @media screen and (max-width: 768px) {
    .reservation-container {
      padding: 10px;
    }

    .reservation-status {
      margin-bottom: 20px;
    }

    .reservation-info {
      padding: 10px;
      font-size: 0.9rem;
    }

    .room-item {
      padding: 10px;
    }

    .room-info h3 {
      font-size: 1.1rem;
    }

    .room-info p {
      font-size: 0.9rem;
    }

    .time-slot {
      width: 25px;
      font-size: 0.7rem;
    }

    .time-slot-header {
      width: 25px;
      font-size: 0.6rem;
    }

    .form-row {
      flex-direction: column;
    }

    .form-column {
      width: 100%;
      margin-bottom: 10px;
    }

    input, select {
      width: 100%;
      padding: 8px;
      font-size: 0.9rem;
    }

    button {
      width: 100%;
      padding: 10px;
      font-size: 1rem;
    }

    nav ul {
      padding: 0 10px;
    }

    nav ul li {
      font-size: 0.9rem;
    }
  }

  /* 모바일 가로 모드 */
  @media screen and (max-width: 768px) and (orientation: landscape) {
    .time-slot {
      width: 30px;
      font-size: 0.8rem;
    }

    .time-slot-header {
      width: 30px;
      font-size: 0.7rem;
    }
  }

  /* 작은 모바일 화면 */
  @media screen and (max-width: 360px) {
    .time-slot {
      width: 20px;
      font-size: 0.6rem;
    }

    .time-slot-header {
      width: 20px;
      font-size: 0.5rem;
    }

    .reservation-info {
      font-size: 0.8rem;
    }
  }
`;

// 스타일 태그 추가
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default App; 