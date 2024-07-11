// 定義班次常量
const SHIFTS = {
    DAY: '白班',
    EVENING: '小夜',
    NIGHT: '大夜'
};

let staffList = [];
let currentFlatpickr = null;

function addStaff() {
    const name = prompt("請輸入人員姓名：");
    if (name) {
        const staff = {
            name: name,
            prescheduledDates: [],
            preVacationDates: [],
            shift1: '',
            shift2: ''
        };
        staffList.push(staff);
        updateStaffList();
        saveToLocalStorage();
    }
}

function updateStaffList() {
    const staffListUl = document.getElementById("staffList");
    staffListUl.innerHTML = "";
    staffList.forEach((staff, index) => {
        const staffLi = document.createElement("li");
        staffLi.className = "staff-item";
        staffLi.draggable = true;
        staffLi.dataset.index = index;
        staffLi.innerHTML = `
            <span class="staff-name">${staff.name}</span>
            <select class="shift-select" onchange="updateStaffShift(${index}, 1, this.value)">
                <option value="">選擇班次1</option>
                <option value="${SHIFTS.DAY}" ${staff.shift1 === SHIFTS.DAY ? 'selected' : ''}>${SHIFTS.DAY}</option>
                <option value="${SHIFTS.EVENING}" ${staff.shift1 === SHIFTS.EVENING ? 'selected' : ''}>${SHIFTS.EVENING}</option>
                <option value="${SHIFTS.NIGHT}" ${staff.shift1 === SHIFTS.NIGHT ? 'selected' : ''}>${SHIFTS.NIGHT}</option>
            </select>
            <select class="shift-select" onchange="updateStaffShift(${index}, 2, this.value)">
                <option value="">選擇班次2</option>
                <option value="${SHIFTS.DAY}" ${staff.shift2 === SHIFTS.DAY ? 'selected' : ''}>${SHIFTS.DAY}</option>
                <option value="${SHIFTS.EVENING}" ${staff.shift2 === SHIFTS.EVENING ? 'selected' : ''}>${SHIFTS.EVENING}</option>
                <option value="${SHIFTS.NIGHT}" ${staff.shift2 === SHIFTS.NIGHT ? 'selected' : ''}>${SHIFTS.NIGHT}</option>
            </select>
            <button onclick="preschedule(${index})">預班</button>
            <button onclick="deletePreschedule(${index})">刪除預班</button>
            <button onclick="preVacation(${index})">預休</button>
            <button onclick="deletePreVacation(${index})">刪除預休</button>
            <button onclick="deleteStaff(${index})">刪除</button>
            <span class="prescheduled-dates" id="prescheduled-${index}"></span>
            <span class="pre-vacation-dates" id="pre-vacation-${index}"></span>
            <div id="calendar-container-${index}" style="display: none;">
                <div id="calendar-${index}"></div>
                <div id="shift-select-container-${index}" class="shift-select-container"></div>
                <button onclick="confirmPreschedule(${index})">確認</button>
            </div>
            <div id="vacation-calendar-container-${index}" style="display: none;">
                <div id="vacation-calendar-${index}"></div>
                <button onclick="confirmPreVacation(${index})">確認預休</button>
            </div>
        `;
        staffListUl.appendChild(staffLi);
        updatePrescheduledDatesDisplay(index);
        updatePreVacationDatesDisplay(index);
    });
    console.log('人員列表已更新');
    addDragListeners();
}

function addDragListeners() {
    const staffListElement = document.getElementById('staffList');
    
    staffListElement.addEventListener('dragstart', dragStart);
    staffListElement.addEventListener('dragover', dragOver);
    staffListElement.addEventListener('drop', drop);
    staffListElement.addEventListener('dragend', dragEnd);
    
    console.log('拖曳監聽器已添加');
}

function dragStart(e) {
    if (e.target.classList.contains('staff-item')) {
        e.dataTransfer.setData('text/plain', e.target.dataset.index);
        e.target.classList.add('dragging');
        console.log('開始拖曳', e.target.dataset.index);
    }
}

function dragOver(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (draggable) {
        if (afterElement == null) {
            e.currentTarget.appendChild(draggable);
        } else {
            e.currentTarget.insertBefore(draggable, afterElement);
        }
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.staff-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function drop(e) {
    e.preventDefault();
    const draggedElement = document.querySelector('.dragging');
    if (!draggedElement) return;

    const fromIndex = parseInt(draggedElement.dataset.index);
    const toIndex = Array.from(e.currentTarget.children).indexOf(draggedElement);
    
    if (fromIndex !== toIndex) {
        const [reorderedItem] = staffList.splice(fromIndex, 1);
        staffList.splice(toIndex, 0, reorderedItem);
        updateStaffList();
        saveToLocalStorage();
        console.log('項目從', fromIndex, '移動到', toIndex);
    }
}

function dragEnd(e) {
    if (e.target.classList.contains('staff-item')) {
        e.target.classList.remove('dragging');
        console.log('拖曳結束');
    }
}

function preschedule(index) {
    const year = document.getElementById("year").value;
    const month = document.getElementById("month").value;
    const calendarContainer = document.getElementById(`calendar-container-${index}`);
    const vacationCalendarContainer = document.getElementById(`vacation-calendar-container-${index}`);
    
    // 隱藏預休日曆和確認按鈕
    vacationCalendarContainer.style.display = 'none';
    
    // 切換預班日曆的顯示狀態
    if (calendarContainer.style.display === 'none' || calendarContainer.style.display === '') {
        calendarContainer.style.display = 'block';
        
        if (currentFlatpickr) {
            currentFlatpickr.destroy();
        }
        
        currentFlatpickr = flatpickr(`#calendar-${index}`, {
            mode: "multiple",
            dateFormat: "Y-m-d",
            minDate: `${year}-${month.padStart(2, '0')}-01`,
            maxDate: new Date(year, month, 0),
            defaultDate: staffList[index].prescheduledDates.map(item => `${year}-${month.padStart(2, '0')}-${item.date.toString().padStart(2, '0')}`),
            inline: true,
            onChange: function(selectedDates, dateStr, instance) {
                updateShiftSelections(index, selectedDates);
            }
        });

        updateShiftSelections(index, currentFlatpickr.selectedDates);
    } else {
        calendarContainer.style.display = 'none';
        if (currentFlatpickr) {
            currentFlatpickr.destroy();
            currentFlatpickr = null;
        }
    }
}

function updateShiftSelections(index, selectedDates) {
    const shiftSelectContainer = document.getElementById(`shift-select-container-${index}`);
    shiftSelectContainer.innerHTML = '';

    selectedDates.forEach(date => {
        const dateStr = date.getDate().toString();
        const existingPrescheduled = staffList[index].prescheduledDates.find(item => item.date.toString() === dateStr);
        const shiftSelect = document.createElement('div');
        shiftSelect.innerHTML = `
            ${dateStr}日: 
            <select id="shift-select-${index}-${dateStr}" onchange="updatePrescheduledShift(${index}, '${dateStr}', this.value)">
                <option value="${SHIFTS.DAY}" ${existingPrescheduled && existingPrescheduled.shift === SHIFTS.DAY ? 'selected' : ''}>${SHIFTS.DAY}</option>
                <option value="${SHIFTS.EVENING}" ${existingPrescheduled && existingPrescheduled.shift === SHIFTS.EVENING ? 'selected' : ''}>${SHIFTS.EVENING}</option>
                <option value="${SHIFTS.NIGHT}" ${existingPrescheduled && existingPrescheduled.shift === SHIFTS.NIGHT ? 'selected' : ''}>${SHIFTS.NIGHT}</option>
            </select>
        `;
        shiftSelectContainer.appendChild(shiftSelect);
    });
}

function updatePrescheduledShift(index, dateStr, shift) {
    const existingIndex = staffList[index].prescheduledDates.findIndex(item => item.date.toString() === dateStr);
    if (existingIndex !== -1) {
        staffList[index].prescheduledDates[existingIndex].shift = shift;
    } else {
        staffList[index].prescheduledDates.push({ date: parseInt(dateStr), shift: shift });
    }
}

function confirmPreschedule(index) {
    staffList[index].prescheduledDates = currentFlatpickr.selectedDates.map(date => ({
        date: date.getDate(),
        shift: document.getElementById(`shift-select-${index}-${date.getDate()}`).value
    }));

    updatePrescheduledDatesDisplay(index);
    document.getElementById(`calendar-container-${index}`).style.display = 'none';
    document.getElementById(`shift-select-container-${index}`).innerHTML = '';
    if (currentFlatpickr) {
        currentFlatpickr.destroy();
        currentFlatpickr = null;
    }
    saveToLocalStorage();
}

function updatePrescheduledDatesDisplay(index) {
    const prescheduledSpan = document.getElementById(`prescheduled-${index}`);
    if (staffList[index].prescheduledDates.length > 0) {
        const sortedDates = [...staffList[index].prescheduledDates].sort((a, b) => a.date - b.date);
        const formattedDates = sortedDates.map(item => `${item.date}日(${item.shift})`).join(', ');
        prescheduledSpan.textContent = `預班日期: ${formattedDates}`;
    } else {
        prescheduledSpan.textContent = '';
    }
}

function preVacation(index) {
    const year = document.getElementById("year").value;
    const month = document.getElementById("month").value;
    const vacationCalendarContainer = document.getElementById(`vacation-calendar-container-${index}`);
    const calendarContainer = document.getElementById(`calendar-container-${index}`);
    
    // 隱藏預班日曆、選擇框和確認按鈕
    calendarContainer.style.display = 'none';
    document.getElementById(`shift-select-container-${index}`).innerHTML = '';
    
    // 切換預休日曆的顯示狀態
    if (vacationCalendarContainer.style.display === 'none' || vacationCalendarContainer.style.display === '') {
        vacationCalendarContainer.style.display = 'block';
        
        if (currentFlatpickr) {
            currentFlatpickr.destroy();
        }
        
        currentFlatpickr = flatpickr(`#vacation-calendar-${index}`, {
            mode: "multiple",
            dateFormat: "Y-m-d",
            minDate: `${year}-${month.padStart(2, '0')}-01`,
            maxDate: new Date(year, month, 0),
            defaultDate: staffList[index].preVacationDates ? staffList[index].preVacationDates.map(date => `${year}-${month.padStart(2, '0')}-${date.toString().padStart(2, '0')}`) : [],
            inline: true
        });
    } else {
        vacationCalendarContainer.style.display = 'none';
        if (currentFlatpickr) {
            currentFlatpickr.destroy();
            currentFlatpickr = null;
        }
    }
}

function confirmPreVacation(index) {
    staffList[index].preVacationDates = currentFlatpickr.selectedDates.map(date => date.getDate());
    updatePreVacationDatesDisplay(index);
    document.getElementById(`vacation-calendar-container-${index}`).style.display = 'none';
    if (currentFlatpickr) {
        currentFlatpickr.destroy();
        currentFlatpickr = null;
    }
    saveToLocalStorage();
}

function updatePreVacationDatesDisplay(index) {
    const preVacationSpan = document.getElementById(`pre-vacation-${index}`);
    if (staffList[index].preVacationDates && staffList[index].preVacationDates.length > 0) {
        const sortedDates = [...staffList[index].preVacationDates].sort((a, b) => a - b);
        const formattedDates = sortedDates.map(date => `${date}日`).join(', ');
        preVacationSpan.textContent = `預休日期: ${formattedDates}`;
    } else {
        preVacationSpan.textContent = '';
    }
}

function updateStaffShift(index, shiftNumber, value) {
    staffList[index][`shift${shiftNumber}`] = value;
    saveToLocalStorage();
}

function deleteStaff(index) {
    if (confirm(`確定要刪除 ${staffList[index].name} 嗎？`)) {
        staffList.splice(index, 1);
        updateStaffList();
        saveToLocalStorage();
    }
}

function deletePreschedule(index) {
    if (confirm(`確定要刪除 ${staffList[index].name} 的所有預班資料嗎？`)) {
        staffList[index].prescheduledDates = [];
        updateStaffList();
        saveToLocalStorage();
        alert('預班資料已刪除');
    }
}

function deletePreVacation(index) {
    if (confirm(`確定要刪除 ${staffList[index].name} 的所有預休資料嗎？`)) {
        staffList[index].preVacationDates = [];
        updatePreVacationDatesDisplay(index);
        saveToLocalStorage();
        alert('預休資料已刪除');
    }
}

function deleteAllPreschedulesAndVacations() {
    if (confirm('確定要刪除所有人員的預班和預休資料嗎？此操作無法撤銷。')) {
        staffList.forEach(staff => {
            staff.prescheduledDates = [];
            staff.preVacationDates = [];
        });
        updateStaffList();
        saveToLocalStorage();
        alert('所有預班和預休資料已刪除');
    }
}
function saveToLocalStorage() {
    // 保存人員列表
    localStorage.setItem('staffList', JSON.stringify(staffList));

    // 保存班次數量設置
    localStorage.setItem('shiftCounts', JSON.stringify({
        dayShift: document.getElementById('dayShiftCount').value,
        eveningShift: document.getElementById('eveningShiftCount').value,
        nightShift: document.getElementById('nightShiftCount').value
    }));

    // 保存當前選擇的年份和月份
    localStorage.setItem('currentYear', document.getElementById('year').value);
    localStorage.setItem('currentMonth', document.getElementById('month').value);

    console.log('數據已保存到本地存儲'); // 調試日誌
}


function loadFromLocalStorage() {
    const savedStaffList = localStorage.getItem('staffList');
    if (savedStaffList) {
        staffList = JSON.parse(savedStaffList);
        staffList.forEach(staff => {
            if (!staff.preVacationDates) {
                staff.preVacationDates = [];  // 確保舊數據兼容性
            }
        });
        updateStaffList();
    }
    const savedShiftCounts = localStorage.getItem('shiftCounts');
    if (savedShiftCounts) {
        const shiftCounts = JSON.parse(savedShiftCounts);
        document.getElementById('dayShiftCount').value = shiftCounts.dayShift;
        document.getElementById('eveningShiftCount').value = shiftCounts.eveningShift;
        document.getElementById('nightShiftCount').value = shiftCounts.nightShift;
    }
}

function saveStaffData() {
    const dataToSave = {
        staffList: staffList,
        shiftCounts: {
            dayShift: document.getElementById('dayShiftCount').value,
            eveningShift: document.getElementById('eveningShiftCount').value,
            nightShift: document.getElementById('nightShiftCount').value
        }
    };
    const dataStr = JSON.stringify(dataToSave);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'staff_data.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function loadStaffData() {
    document.getElementById('fileInput').click();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                staffList = data.staffList;
                staffList.forEach(staff => {
                    if (!staff.preVacationDates) {
                        staff.preVacationDates = [];  // 確保舊數據兼容性
                    }
                });
                updateStaffList();
                if (data.shiftCounts) {
                    document.getElementById('dayShiftCount').value = data.shiftCounts.dayShift;
                    document.getElementById('eveningShiftCount').value = data.shiftCounts.eveningShift;
                    document.getElementById('nightShiftCount').value = data.shiftCounts.nightShift;
                }
                saveToLocalStorage();
                alert('人員資料和班次人數設定已成功載入');
            } catch (error) {
                alert('載入失敗，請確保文件格式正確');
            }
        };
        reader.readAsText(file);
    }
}

function deleteAllStaff() {
    if (confirm('確定要刪除所有人員資料嗎？此操作無法撤銷。')) {
        staffList = [];
        updateStaffList();
        saveToLocalStorage();
        alert('所有人員資料已刪除');
    }
}

function clearAllPreschedules() {
    staffList.forEach(staff => {
        staff.prescheduledDates = [];
        staff.preVacationDates = [];
    });
    updateStaffList();
    saveToLocalStorage();
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('addStaffBtn').addEventListener('click', addStaff);
    document.getElementById('saveStaffDataBtn').addEventListener('click', saveStaffData);
    document.getElementById('loadStaffDataBtn').addEventListener('click', loadStaffData);
    document.getElementById('deleteAllStaffBtn').addEventListener('click', deleteAllStaff);
    document.getElementById('deleteAllPreschedulesAndVacationsBtn').addEventListener('click', deleteAllPreschedulesAndVacations);
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    document.getElementById('year').addEventListener('change', clearAllPreschedules);
    document.getElementById('month').addEventListener('change', clearAllPreschedules);

    document.getElementById('dayShiftCount').addEventListener('change', saveToLocalStorage);
    document.getElementById('eveningShiftCount').addEventListener('change', saveToLocalStorage);
    document.getElementById('nightShiftCount').addEventListener('change', saveToLocalStorage);

    loadFromLocalStorage();
    console.log('DOMContentLoaded event fired'); // 調試日誌
});