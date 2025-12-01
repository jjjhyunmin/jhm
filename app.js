// 전역 변수
let equipments = JSON.parse(localStorage.getItem('equipments')) || [];
let rentals = JSON.parse(localStorage.getItem('rentals')) || [];

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
function getCurrentDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 데이터 저장 함수들
function saveEquipments() {
    localStorage.setItem('equipments', JSON.stringify(equipments));
}

function saveRentals() {
    localStorage.setItem('rentals', JSON.stringify(rentals));
}

// 장비 추가 함수
function addEquipment(event) {
    event.preventDefault();
    
    const idField = document.getElementById('equipmentId');
    const editingId = idField ? idField.value : '';

    const name = document.getElementById('equipmentName').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseInt(document.getElementById('price').value);
    const note = document.getElementById('note').value;

    if (editingId) {
        // 기존 장비 수정
        const index = equipments.findIndex(e => e.id === editingId);
        if (index !== -1) {
            equipments[index].name = name;
            equipments[index].quantity = quantity;
            equipments[index].price = price;
            equipments[index].note = note;
        }
    } else {
        // 신규 장비 등록
        const equipment = {
            id: Date.now().toString(),
            name: name,
            quantity: quantity,
            price: price,
            registeredDate: getCurrentDate(),
            note: note
        };
        equipments.push(equipment);
    }
    saveEquipments();
    
    if (typeof renderEquipmentList === 'function') {
        renderEquipmentList();
    }
    
    if (typeof renderRentalList === 'function') {
        renderRentalList();
    }
    
    // 관리자 페이지에서 사용되는 경우, 등록 후 모달을 자동으로 닫고 폼을 초기화
    const equipmentModal = document.getElementById('equipmentModal');
    if (equipmentModal) {
        equipmentModal.style.display = 'none';
    }
    event.target.reset();
    alert('장비가 성공적으로 등록되었습니다.');
    location.reload();
}

// 장비 수리 완료 처리 (관리자용)
function markEquipmentRepaired(event) {
    const equipmentId = event.target.getAttribute('data-id');

    // 해당 장비의 "수리요청된 파손 대여 건"만 수리 완료 처리
    rentals.forEach(rental => {
        if (
            rental.equipmentId === equipmentId &&
            rental.damaged &&
            rental.repairRequested &&
            !rental.repaired
        ) {
            rental.repaired = true;
        }
    });

    saveRentals();

    if (typeof renderEquipmentList === 'function') {
        renderEquipmentList();
    }

    if (typeof renderRentalList === 'function') {
        renderRentalList();
    }

    alert('해당 장비의 파손 건을 수리 완료 처리했습니다.');
}

// 장비 목록 렌더링 (공통 함수)
function renderEquipmentList() {
    const equipmentList = document.getElementById('equipmentList');
    if (!equipmentList) return;
    
    equipmentList.innerHTML = '';
    
    const isAdminPage = document.querySelector('h1').textContent.includes('관리자');

    if (equipments.length === 0) {
        const row = document.createElement('tr');
        const colspan = isAdminPage ? 6 : 5; // 관리자: 장비명/보유/대여가능/금액/비고/관리, 사용자: 장비명/보유/대여가능/비고/대여
        row.innerHTML = `<td colspan="${colspan}" style="text-align: center;">등록된 장비가 없습니다.</td>`;
        equipmentList.appendChild(row);
        return;
    }
    
    equipments.forEach(equipment => {
        const row = document.createElement('tr');
        
        // 대여 중인 수량 계산
        const rentedCount = rentals.reduce((total, rental) => {
            return rental.equipmentId === equipment.id && !rental.returned && rental.status === 'approved'
                ? total + rental.quantity 
                : total;
        }, 0);
        
        // 파손되어 아직 수리되지 않은 수량
        const damagedNotRepairedCount = rentals.reduce((total, rental) => {
            return rental.equipmentId === equipment.id && rental.damaged && !rental.repaired
                ? total + rental.quantity
                : total;
        }, 0);

        const availableCount = equipment.quantity - rentedCount - damagedNotRepairedCount;

        // 이 장비에 대해 "수리요청된 파손 건" 이 하나라도 있는지 여부
        const hasPendingRepair = rentals.some(rental => (
            rental.equipmentId === equipment.id &&
            rental.damaged &&
            rental.repairRequested &&
            !rental.repaired
        ));
        
        if (isAdminPage) {
            // 관리자용 장비 목록 (등록일시는 표시하지 않음)
            row.innerHTML = `
                <td>${equipment.name}</td>
                <td>${equipment.quantity}</td>
                <td>${availableCount}</td>
                <td>${equipment.price.toLocaleString()}원</td>
                <td>${equipment.note || '-'}</td>
                <td>
                    <button class="edit-btn" data-id="${equipment.id}">수정</button>
                    ${hasPendingRepair ? `<button class="repair-complete-btn" data-id="${equipment.id}">수리완료</button>` : ''}
                    <button class="delete-btn" data-id="${equipment.id}">삭제</button>
                </td>
            `;
        } else {
            // 사용자용 장비 목록
            row.innerHTML = `
                <td>${equipment.name}</td>
                <td>${equipment.quantity}</td>
                <td>${availableCount}</td>
                <td>${equipment.note || '-'}</td>
                <td>
                    ${availableCount > 0 ? 
                        `<button class="rent-btn" data-id="${equipment.id}" data-name="${equipment.name}" data-available="${availableCount}">대여 신청</button>` : 
                        '대여 불가'}
                </td>
            `;
        }
        
        equipmentList.appendChild(row);
    });
    
    // 삭제 버튼 이벤트 리스너 (관리자용)
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', deleteEquipment);
    });

    // 수정 버튼 이벤트 리스너 (관리자용)
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', openEditEquipmentModal);
    });

    // 수리완료 버튼 이벤트 리스너 (관리자용)
    document.querySelectorAll('.repair-complete-btn').forEach(button => {
        button.addEventListener('click', markEquipmentRepaired);
    });
    
    // 대여 버튼 이벤트 리스너 (사용자용)
    document.querySelectorAll('.rent-btn').forEach(button => {
        button.addEventListener('click', openRentalModal);
    });
}

// 장비 삭제 함수 (관리자용)
function deleteEquipment(event) {
    if (!confirm('정말로 이 장비를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    const equipmentId = event.target.getAttribute('data-id');
    equipments = equipments.filter(e => e.id !== equipmentId);
    saveEquipments();
    
    // 관련된 대여 내역도 삭제
    rentals = rentals.filter(r => r.equipmentId !== equipmentId);
    saveRentals();
    
    if (typeof renderEquipmentList === 'function') {
        renderEquipmentList();
    }
    
    if (typeof renderRentalList === 'function') {
        renderRentalList();
    }

    location.reload();
}

// 장비 수정 모달 열기 (관리자용)
function openEditEquipmentModal(event) {
    const equipmentId = event.target.getAttribute('data-id');
    const equipment = equipments.find(e => e.id === equipmentId);
    if (!equipment) return;

    const modal = document.getElementById('equipmentModal');
    const idField = document.getElementById('equipmentId');

    if (idField) {
        idField.value = equipment.id;
    }
    document.getElementById('equipmentName').value = equipment.name;
    document.getElementById('quantity').value = equipment.quantity;
    document.getElementById('price').value = equipment.price;
    document.getElementById('note').value = equipment.note || '';

    if (modal) {
        modal.style.display = 'block';
    }
}

// 대여 모달 열기 (사용자용)
function openRentalModal(event) {
    const button = event.target;
    const equipmentId = button.getAttribute('data-id');
    const equipmentName = button.getAttribute('data-name');
    const availableCount = parseInt(button.getAttribute('data-available'));
    
    document.getElementById('selectedEquipmentId').value = equipmentId;
    document.getElementById('rentalQuantity').max = availableCount;
    document.getElementById('rentalQuantity').value = 1;
    
    // 오늘 날짜로 기본값 설정
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('startDate').valueAsDate = today;
    document.getElementById('endDate').valueAsDate = tomorrow;
    document.getElementById('endDate').min = new Date(tomorrow).toISOString().split('T')[0];
    
    // 시작일 변경 시 종료일 최소값 설정
    const startDateInput = document.getElementById('startDate');
    startDateInput.addEventListener('change', function() {
        const startDate = new Date(this.value);
        const nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        document.getElementById('endDate').min = nextDay.toISOString().split('T')[0];
    });
    
    document.getElementById('rentalModal').style.display = 'block';
}

// 대여 신청 처리 (사용자용)
function handleRental(event) {
    event.preventDefault();
    
    const password = document.getElementById('rentalPassword')
        ? document.getElementById('rentalPassword').value.trim()
        : '';

    // 4자리 숫자 비밀번호 검증
    const passwordRegex = /^\d{4}$/;
    if (!passwordRegex.test(password)) {
        alert('대여 비밀번호는 4자리 숫자로 입력해주세요.');
        return;
    }

    const rental = {
        id: Date.now().toString(),
        equipmentId: document.getElementById('selectedEquipmentId').value,
        quantity: parseInt(document.getElementById('rentalQuantity').value),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        userName: document.getElementById('userName').value,
        userDepartment: document.getElementById('userDepartment').value,
        userPosition: document.getElementById('userPosition').value,
        password: password,
        status: 'pending', // 대기중, 승인됨, 반려됨
        returned: false, // 반납 여부
        returnedDate: null,
        damaged: false,
        damageNote: '',
        requestDate: getCurrentDate()
    };
    
    rentals.push(rental);
    saveRentals();
    
    if (typeof renderEquipmentList === 'function') {
        renderEquipmentList();
    }
    
    if (typeof renderRentalList === 'function') {
        renderRentalList();
    }
    
    if (typeof renderMyRentals === 'function') {
        renderMyRentals();
    }
    
    document.getElementById('rentalModal').style.display = 'none';
    event.target.reset();
    
    alert('대여 신청이 완료되었습니다. 관리자 승인 후 대여가 완료됩니다.');
    location.reload();
}

// Modal handling
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('equipmentModal');
    const btn = document.getElementById('addEquipmentBtn');
    const span = document.getElementById('closeEquipmentModal');
    const form = document.getElementById('equipmentForm');
    
    // Open modal when button is clicked
    if (btn) {
        btn.onclick = function() {
            modal.style.display = 'block';
        }
    }
    
    // Close modal when X is clicked
    if (span) {
        span.onclick = function() {
            modal.style.display = 'none';
        }
    }
    
    // Close modal when clicking outside the modal
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
    
    // 장비 등록 폼의 실제 데이터 저장은 관리자 페이지(admin.html)의 initAdminPage 에서
    // addEquipment 함수와 함께 처리하므로, 여기서는 별도의 onsubmit 처리 없이
    // 모달 열기/닫기 관련 동작만 담당합니다.
});
