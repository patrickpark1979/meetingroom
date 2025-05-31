const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/meeting-room-reservation', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const reservationSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  userName: String,
  contact: String,
  meetingName: String,
  startTime: Date,
  endTime: Date,
  createdAt: { type: Date, default: Date.now }
});

const Reservation = mongoose.model('Reservation', reservationSchema);

(async () => {
  try {
    const result = await Reservation.deleteMany({});
    console.log(`삭제된 예약 개수: ${result.deletedCount}`);
  } catch (error) {
    console.error('삭제 중 오류:', error);
  } finally {
    mongoose.connection.close();
  }
})(); 