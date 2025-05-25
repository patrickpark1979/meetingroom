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
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [repeatType, setRepeatType] = useState('none');
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [userName, setUserName] = useState('');
  const [contact, setContact] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [message, setMessage] = useState('');

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
      // 날짜와 시간을 ISO 문자열로 변환
      const startDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${startTime}`);
      const endDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${endTime}`);

      console.log('예약 데이터:', {
        roomId: selectedRoom,
        userName,
        contact,
        meetingName: title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        repeatType,
        repeatEndDate: repeatType !== 'none' ? repeatEndDate : undefined
      });

      const response = await axios.post('http://localhost:5000/api/reservations', {
        roomId: selectedRoom,
        userName,
        contact,
        meetingName: title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        repeatType,
        repeatEndDate: repeatType !== 'none' ? repeatEndDate : undefined
      });

      if (response.status === 201) {
        // 예약 목록 새로 불러오기
        await fetchReservations();
        
        // 폼 초기화
        setSelectedRoom('');
        setTitle('');
        setStartTime('');
        setEndTime('');
        setUserName('');
        setContact('');
        setRepeatType('none');
        setRepeatEndDate('');
        
        setMessage('예약이 완료되었습니다.');
      }
    } catch (error: any) {
      console.error('예약 생성 중 오류:', error);
      setMessage(error.response?.data?.message || '예약 생성에 실패했습니다.');
    }
  };

  const handleDeleteReservation = async (id: string) => {
    try {
      await fetch(`http://localhost:5000/api/reservations/${id}`, {
        method: 'DELETE',
      });
      fetchReservations();
    } catch (error) {
      console.error('예약 삭제 중 오류 발생:', error);
    }
  };

  const renderTimeSlots = (room: Room) => {
    const roomReservations = reservations.filter(reservation => {
      return reservation.roomId._id === room._id;
    });

    // 30분 단위 시간 생성
    const timeSlots = Array.from({ length: 48 }, (_, i) => {
      const hour = Math.floor(i / 2);
      const minute = i % 2 === 0 ? '00' : '30';
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    });

    // 24개씩 2행으로 나누기
    const firstRow = timeSlots.slice(0, 24);
    const secondRow = timeSlots.slice(24);

    const renderRow = (slots: string[]) => (
      <div className="time-slots-row">
        {slots.map((timeString, i) => {
          const isReserved = roomReservations.some(reservation => {
            const startTime = new Date(reservation.startTime);
            const endTime = new Date(reservation.endTime);
            const currentTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${timeString}`);
            
            // 날짜 비교 (시간은 무시하고 날짜만 비교)
            const startDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
            const endDate = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
            const currentDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
            
            // 시간 비교
            const startHour = startTime.getHours();
            const startMinute = startTime.getMinutes();
            const endHour = endTime.getHours();
            const endMinute = endTime.getMinutes();
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();
            
            const startTimeInMinutes = startHour * 60 + startMinute;
            const endTimeInMinutes = endHour * 60 + endMinute;
            const currentTimeInMinutes = currentHour * 60 + currentMinute;
            
            return startDate <= currentDate && endDate >= currentDate && 
                   startTimeInMinutes <= currentTimeInMinutes && endTimeInMinutes > currentTimeInMinutes;
          });
          
          const reservation = isReserved ? roomReservations.find(reservation => {
            const startTime = new Date(reservation.startTime);
            const endTime = new Date(reservation.endTime);
            const currentTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${timeString}`);
            
            // 날짜 비교 (시간은 무시하고 날짜만 비교)
            const startDate = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
            const endDate = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
            const currentDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
            
            // 시간 비교
            const startHour = startTime.getHours();
            const startMinute = startTime.getMinutes();
            const endHour = endTime.getHours();
            const endMinute = endTime.getMinutes();
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();
            
            const startTimeInMinutes = startHour * 60 + startMinute;
            const endTimeInMinutes = endHour * 60 + endMinute;
            const currentTimeInMinutes = currentHour * 60 + currentMinute;
            
            return startDate <= currentDate && endDate >= currentDate && 
                   startTimeInMinutes <= currentTimeInMinutes && endTimeInMinutes > currentTimeInMinutes;
          }) : null;

          return (
            <div 
              key={i} 
              className={`time-slot ${isReserved ? 'reserved' : ''}`}
              title={reservation ? `${reservation.meetingName} (${reservation.userName})` : ''}
              onClick={() => {
                if (reservation) {
                  alert(`모임명: ${reservation.meetingName}\n예약자: ${reservation.userName}\n연락처: ${reservation.contact}`);
                  if (window.confirm(`${reservation.meetingName} 예약을 삭제하시겠습니까?`)) {
                    handleDeleteReservation(reservation._id);
                  }
                }
              }}
              style={{ 
                cursor: isReserved ? 'pointer' : 'default',
                position: 'relative',
                backgroundColor: isReserved ? '#ffcdd2' : '#fff',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {timeString}
            </div>
          );
        })}
      </div>
    );

    return (
      <div className="time-slots-container">
        {renderRow(firstRow)}
        {renderRow(secondRow)}
      </div>
    );
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDateStr = e.target.value;
    const [year, month, day] = selectedDateStr.split('-').map(Number);
    const newDate = new Date(year, month - 1, day, 9, 0, 0); // 한국 시간으로 9시로 설정
    setSelectedDate(newDate);
    setMessage(''); // 날짜 변경 시 메시지 초기화
  };

  return (
    <Router>
      <div className="App">
        <nav>
          <ul>
            <li><Link to="/" onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              setSelectedDate(today);
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
                        {renderTimeSlots(room)}
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
                      min={new Date().toISOString().split('T')[0]}
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
                    <label htmlFor="title">모임명: <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
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
                      onChange={(e) => setRepeatType(e.target.value)}
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
                      <label>반복 종료일: <span style={{ color: 'red' }}>*</span></label>
                      <input
                        type="date"
                        value={repeatEndDate}
                        onChange={(e) => setRepeatEndDate(e.target.value)}
                        min={selectedDate.toISOString().split('T')[0]}
                        required
                      />
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