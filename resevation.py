
    # 어드민 기능 추가: 어드민 로그인 및 회의실 관리
    def admin_login(self, admin_id, admin_pw):
        """
        어드민 로그인 기능 (간단한 하드코딩 방식)
        """
        # 실제 서비스에서는 DB나 환경변수로 관리해야 함
        self._admin_id = "admin"
        self._admin_pw = "1234"
        if admin_id == self._admin_id and admin_pw == self._admin_pw:
            print("어드민 로그인 성공!")
            self._is_admin = True
            return True
        else:
            print("어드민 로그인 실패.")
            self._is_admin = False
            return False

    def admin_add_room(self, room_name):
        """
        어드민만 회의실을 추가할 수 있도록 제한
        """
        if not hasattr(self, "_is_admin") or not self._is_admin:
            print("어드민만 회의실을 추가할 수 있습니다.")
            return False
        return self.add_room(room_name)

    def admin_remove_room(self, room_name):
        """
        어드민만 회의실 삭제 가능
        """
        if not hasattr(self, "_is_admin") or not self._is_admin:
            print("어드민만 회의실을 삭제할 수 있습니다.")
            return False
        if room_name not in self.rooms:
            print(f"{room_name}은(는) 존재하지 않는 회의실입니다.")
            return False
        self.rooms.remove(room_name)
        print(f"회의실 '{room_name}'이(가) 삭제되었습니다.")
        # 해당 회의실의 예약도 모두 삭제
        self.reservations = [r for r in self.reservations if r['place'] != room_name]
        return True

    def show_reservation_by_day(self, date):
        """
        특정 날짜(date)에 대한 모든 회의실 예약 현황을 보여줍니다.
        """
        found = False
        print(f"{date}의 예약 현황:")
        for room in self.rooms:
            # 해당 날짜에 이 회의실의 예약 내역 추출
            room_reservations = [r for r in self.reservations if r['date'] == date and r['place'] == room]
            if not room_reservations:
                print(f"- {room}: 예약 없음")
            else:
                for r in room_reservations:
                    print(f"- {room}: {r['time']} (예약자: {r['name']})")
                found = True
        if not self.rooms:
            print("등록된 회의실이 없습니다.")
        elif not found:
            print("해당 날짜에 예약된 내역이 없습니다.")

    # 사용자용 회의 예약 기능 (이미 있음: reserve)
