// generateSchedule.js

function generateSchedule() {
    const year = parseInt(document.getElementById("year").value);
    const month = parseInt(document.getElementById("month").value);
    const daysInMonth = new Date(year, month, 0).getDate();

    const dayShiftCount = parseInt(document.getElementById("dayShiftCount").value);
    const eveningShiftCount = parseInt(document.getElementById("eveningShiftCount").value);
    const nightShiftCount = parseInt(document.getElementById("nightShiftCount").value);

    let schedule = {};
    for (let day = 1; day <= daysInMonth; day++) {
        schedule[day] = {
            [SHIFTS.DAY]: [],
            [SHIFTS.EVENING]: [],
            [SHIFTS.NIGHT]: []
        };
    }

    // 先處理預班
    staffList.forEach(staff => {
        staff.prescheduledDates.forEach(prescheduled => {
            const day = prescheduled.date;
            const shift = prescheduled.shift;
            if (schedule[day][shift].length < getShiftCount(shift)) {
                schedule[day][shift].push(staff.name);
            }
        });
    });

    // 再處理其他排班
    for (let day = 1; day <= daysInMonth; day++) {
        staffList.forEach(staff => {
            if (!isStaffScheduledOnDay(schedule, staff.name, day) && !isStaffOnVacation(staff, day)) {
                const availableShifts = getAvailableShifts(staff, schedule[day]);
                if (availableShifts.length > 0) {
                    const randomShift = availableShifts[Math.floor(Math.random() * availableShifts.length)];
                    schedule[day][randomShift].push(staff.name);
                }
            }
        });
    }

    displaySchedule(schedule);
    displayDailySchedule(schedule);
    displayStatistics(schedule);
}

function getShiftCount(shift) {
    switch (shift) {
        case SHIFTS.DAY:
            return parseInt(document.getElementById("dayShiftCount").value);
        case SHIFTS.EVENING:
            return parseInt(document.getElementById("eveningShiftCount").value);
        case SHIFTS.NIGHT:
            return parseInt(document.getElementById("nightShiftCount").value);
    }
}

function isStaffScheduledOnDay(schedule, staffName, day) {
    return Object.values(schedule[day]).some(shiftStaff => shiftStaff.includes(staffName));
}

function isStaffOnVacation(staff, day) {
    return staff.preVacationDates.includes(day);
}

function getAvailableShifts(staff, daySchedule) {
    return Object.entries(daySchedule)
        .filter(([shift, scheduledStaff]) => 
            (staff.shift1 === shift || staff.shift2 === shift) && 
            scheduledStaff.length < getShiftCount(shift)
        )
        .map(([shift]) => shift);
}

function displaySchedule(schedule) {
    const scheduleResult = document.getElementById("scheduleResult");
    const year = parseInt(document.getElementById("year").value);
    const month = parseInt(document.getElementById("month").value);
    const daysInMonth = new Date(year, month, 0).getDate();

    // 創建表頭，左上角顯示年月
    let scheduleHTML = `<table border="1"><tr><th rowspan="2">${year}年${month}月班表</th>`;
    
    // 添加日期
    for (let day = 1; day <= daysInMonth; day++) {
        scheduleHTML += `<th>${day}</th>`;
    }
    scheduleHTML += '</tr><tr>';
    
    // 添加星期
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
        scheduleHTML += `<th>${weekday}</th>`;
    }
    scheduleHTML += '</tr>';

    // 添加每個人員的排班情況
    staffList.forEach(staff => {
        scheduleHTML += `<tr><td>${staff.name}</td>`;
        for (let day = 1; day <= daysInMonth; day++) {
            let shift = '';
            if (schedule[day][SHIFTS.DAY].includes(staff.name)) {
                shift = '白';
            } else if (schedule[day][SHIFTS.EVENING].includes(staff.name)) {
                shift = '小';
            } else if (schedule[day][SHIFTS.NIGHT].includes(staff.name)) {
                shift = '大';
            }
            scheduleHTML += `<td>${shift}</td>`;
        }
        scheduleHTML += '</tr>';
    });

    scheduleHTML += '</table>';
    scheduleResult.innerHTML = scheduleHTML;
}
// 顯示每日排班表
function displayDailySchedule(schedule) {
    const dailyScheduleResult = document.createElement('div');
    dailyScheduleResult.id = 'dailyScheduleResult';
    document.getElementById("scheduleResult").appendChild(dailyScheduleResult);

    const year = parseInt(document.getElementById("year").value);
    const month = parseInt(document.getElementById("month").value);
    const daysInMonth = new Date(year, month, 0).getDate();

    let scheduleHTML = `<h3>${year}年${month}月每日排班表</h3>`;
    scheduleHTML += '<table border="1">';
    scheduleHTML += '<tr><th>日期(星期)</th><th>白班</th><th>小夜</th><th>大夜</th></tr>';

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
        
        scheduleHTML += `<tr>`;
        scheduleHTML += `<td>${day}(${weekday})</td>`; // 移除了"日"字
        
        [SHIFTS.DAY, SHIFTS.EVENING, SHIFTS.NIGHT].forEach(shift => {
            const staffOnShift = schedule[day][shift].join(', ');
            scheduleHTML += `<td>${staffOnShift}</td>`;
        });
        
        scheduleHTML += `</tr>`;
    }

    scheduleHTML += '</table>';
    dailyScheduleResult.innerHTML = scheduleHTML;
}
function displayStatistics(schedule) {
    const statisticsResult = document.getElementById("statisticsResult");
    let staffStats = {};
    
    staffList.forEach(staff => {
        staffStats[staff.name] = {
            [SHIFTS.DAY]: 0,
            [SHIFTS.EVENING]: 0,
            [SHIFTS.NIGHT]: 0,
            totalShifts: 0,
            maxConsecutiveDays: 0,
            vacationDays: 0,
            consecutiveDays: 0
        };
    });

    const daysInMonth = Object.keys(schedule).length;

    for (let day = 1; day <= daysInMonth; day++) {
        Object.entries(schedule[day]).forEach(([shift, staffOnShift]) => {
            staffOnShift.forEach(staffName => {
                staffStats[staffName][shift]++;
                staffStats[staffName].totalShifts++;
                staffStats[staffName].consecutiveDays++;
                
                if (staffStats[staffName].consecutiveDays > staffStats[staffName].maxConsecutiveDays) {
                    staffStats[staffName].maxConsecutiveDays = staffStats[staffName].consecutiveDays;
                }
            });
        });

        // 計算休假天數
        staffList.forEach(staff => {
            if (!Object.values(schedule[day]).some(shiftStaff => shiftStaff.includes(staff.name))) {
                staffStats[staff.name].vacationDays++;
                staffStats[staff.name].consecutiveDays = 0;
            }
        });
    }

    let statsHTML = '<table><tr><th>人員</th><th>白班</th><th>小夜</th><th>大夜</th><th>總班數</th><th>最多連續上班天數</th><th>休假天數</th></tr>';
    Object.entries(staffStats).forEach(([staffName, stats]) => {
        statsHTML += `<tr>
            <td>${staffName}</td>
            <td>${stats[SHIFTS.DAY]}</td>
            <td>${stats[SHIFTS.EVENING]}</td>
            <td>${stats[SHIFTS.NIGHT]}</td>
            <td>${stats.totalShifts}</td>
            <td>${stats.maxConsecutiveDays}</td>
            <td>${stats.vacationDays}</td>
        </tr>`;
    });
    statsHTML += '</table>';

    statisticsResult.innerHTML = statsHTML;
}

// 當文檔加載完成後，為排班按鈕添加事件監聽器
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generateScheduleBtn').addEventListener('click', generateSchedule);
});