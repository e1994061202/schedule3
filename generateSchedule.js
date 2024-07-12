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

    const totalShiftCount = dayShiftCount + eveningShiftCount + nightShiftCount;
    const eligibleStaffCount = staffList.filter(staff => staff.preVacationDates.length <= 10).length;
    const expectedShiftDays = Math.floor((daysInMonth * totalShiftCount) / eligibleStaffCount);

    // 計算每個人的預期班數
    staffList.forEach(staff => {
        if (staff.preVacationDates.length <= 10) {
            staff.expectedShiftDays = expectedShiftDays;
        } else {
            staff.expectedShiftDays = 0;
        }
        staff.actualShiftDays = 0; // 初始化實際班數
    });

    // 先處理預排班
    staffList.forEach(staff => {
        staff.prescheduledDates.forEach(prescheduled => {
            const day = prescheduled.date;
            const shift = prescheduled.shift;
            if (schedule[day][shift].length < getShiftCount(shift)) {
                schedule[day][shift].push(staff.name);
                staff.actualShiftDays++; // 增加實際班數
            }
        });
    });

    // 再處理其他排班,同時檢查班次接續規則、連續上班天數、班數、單日排班和個人班次偏好
    for (let day = 1; day <= daysInMonth; day++) {
        const availableStaff = staffList.filter(staff => 
            !isStaffScheduledOnDay(schedule, staff.name, day) &&
            !isStaffOnVacation(staff, day) &&
            staff.actualShiftDays < staff.expectedShiftDays &&
            !isSingleDaySchedule(schedule, staff.name, day) &&
            staff.preVacationDates.length <= 10
        );

        availableStaff.sort((a, b) => a.actualShiftDays - b.actualShiftDays);

        availableStaff.forEach(staff => {
            const availableShifts = getAvailableShifts(staff, schedule[day]).filter(shift => 
                shift === staff.shift1 || shift === staff.shift2
            );
            
            if (availableShifts.length > 0) {
                let randomShift;
                let isShiftValid = false;
                while (!isShiftValid && availableShifts.length > 0) {
                    randomShift = availableShifts[Math.floor(Math.random() * availableShifts.length)];
                    isShiftValid = checkShiftValidity(staff, schedule, day, randomShift) && 
                                   checkConsecutiveWorkDays(staff, schedule, day) &&
                                   checkConsecutiveShifts(staff, schedule, day, randomShift);
                    if (!isShiftValid) {
                        availableShifts.splice(availableShifts.indexOf(randomShift), 1);
                    }
                }
                if (isShiftValid) {
                    schedule[day][randomShift].push(staff.name);
                    staff.actualShiftDays++; // 增加實際班數
                    staff.consecutiveWorkDays++;
                } else {
                    staff.consecutiveWorkDays = 0;
                }
            }
        });

        // 如果班表沒有排滿,從已排班數最少的人中隨機選擇來補班
        Object.values(SHIFTS).forEach(shift => {
            while (schedule[day][shift].length < getShiftCount(shift)) {
                const availableStaffForFilling = staffList.filter(staff => 
                    !isStaffScheduledOnDay(schedule, staff.name, day) &&
                    !isStaffOnVacation(staff, day) && 
                    checkShiftValidity(staff, schedule, day, shift) &&
                    checkConsecutiveWorkDays(staff, schedule, day) &&
                    (shift === staff.shift1 || shift === staff.shift2) &&
                    staff.preVacationDates.length <= 10
                );
                
                if (availableStaffForFilling.length > 0) {
                    availableStaffForFilling.sort((a, b) => a.actualShiftDays - b.actualShiftDays);
                    const selectedStaff = availableStaffForFilling[0];
                    schedule[day][shift].push(selectedStaff.name);
                    selectedStaff.actualShiftDays++;
                    selectedStaff.consecutiveWorkDays++;
                } else {
                    break;
                }
            }
        });
    }

    // 檢查每個人員的總班數是否大於等於預期班數,如果不足則補班
    staffList.forEach(staff => {
        if (staff.preVacationDates.length <= 10) {
            while (staff.actualShiftDays < staff.expectedShiftDays) {
                let scheduledDay = false;
                for (let day = 1; day <= daysInMonth; day++) {
                    const availableShifts = Object.values(SHIFTS).filter(shift =>
                        !isStaffOnVacation(staff, day) &&
                        checkShiftValidity(staff, schedule, day, shift) &&
                        checkConsecutiveWorkDays(staff, schedule, day) &&
                        (shift === staff.shift1 || shift === staff.shift2) &&
                        schedule[day][shift].length < getShiftCount(shift)
                    );
                    if (availableShifts.length > 0) {
                        const randomShift = availableShifts[Math.floor(Math.random() * availableShifts.length)];
                        schedule[day][randomShift].push(staff.name);
                        staff.actualShiftDays++;
                        staff.consecutiveWorkDays++;
                        scheduledDay = true;
                        break;
                    }
                }
                if (!scheduledDay) {
                    break;
                }
            }
        }
    });

    displaySchedule(schedule);
    displayDailySchedule(schedule);
    displayStatistics(schedule);
}
// 檢查連續上班天數是否超過6天
function checkConsecutiveWorkDays(staff, schedule, day) {
    const previousMonth = parseInt(document.getElementById("month").value) - 1;
    const year = parseInt(document.getElementById("year").value);
    const previousMonthDays = previousMonth > 0 ? new Date(year, previousMonth, 0).getDate() : 31;

    let consecutiveDays = staff.consecutiveWorkDays || 0;

    // 檢查上月連續上班天數
    for (let i = previousMonthDays; i > previousMonthDays - 6; i--) {
        if (staff.previousMonthSchedules.includes(i)) {
            consecutiveDays++;
        } else {
            break;
        }
    }

    // 檢查本月連續上班天數
    for (let i = 1; i < day; i++) {
        if (isStaffScheduledOnDay(schedule, staff.name, i)) {
            consecutiveDays++;
        } else {
            consecutiveDays = 0;
        }
    }

    return consecutiveDays < 6;
}
// 檢查連續兩天班的班次是否相同
function checkConsecutiveShifts(staff, schedule, day, shift) {
    const previousDay = day - 1;
    const nextDay = day + 1;

    if (previousDay >= 1 && isStaffScheduledOnDay(schedule, staff.name, previousDay)) {
        const previousShift = getStaffShiftOnDay(schedule, staff.name, previousDay);
        if (previousShift !== shift) {
            return false;
        }
    }

    if (nextDay <= Object.keys(schedule).length && isStaffScheduledOnDay(schedule, staff.name, nextDay)) {
        const nextShift = getStaffShiftOnDay(schedule, staff.name, nextDay);
        if (nextShift !== shift) {
            return false;
        }
    }

    return true;
}

// 獲取某個人員在指定日期的班次
function getStaffShiftOnDay(schedule, staffName, day) {
    for (const shift of Object.values(SHIFTS)) {
        if (schedule[day][shift].includes(staffName)) {
            return shift;
        }
    }
    return null;
}
// 檢查班次接續是否合理
function checkShiftValidity(staff, schedule, day, shift) {
    const previousDay = day - 1;
    if (previousDay < 1) {
        // 檢查上月最後一天的班次
        if (staff.lastMonthLastDayShift === SHIFTS.EVENING && shift === SHIFTS.DAY) {
            return false;
        }
        if (staff.lastMonthLastDayShift === SHIFTS.NIGHT && shift === SHIFTS.DAY) {
            return false;
        }
    } else {
        // 檢查前一天的班次   
        if (schedule[previousDay][SHIFTS.EVENING].includes(staff.name) && shift === SHIFTS.DAY) {
            return false;
        }
        if (schedule[previousDay][SHIFTS.NIGHT].includes(staff.name) && shift === SHIFTS.DAY) {
            return false;  
        }
    }
    return true;
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
// 檢查是否為單日排班
function isSingleDaySchedule(schedule, staffName, day) {
    const previousDay = day - 1;
    const nextDay = day + 1;

    if (previousDay < 1 || nextDay > Object.keys(schedule).length) {
        return false;
    }

    const isScheduledOnPreviousDay = Object.values(schedule[previousDay]).some(shift => shift.includes(staffName));
    const isScheduledOnNextDay = Object.values(schedule[nextDay]).some(shift => shift.includes(staffName));

    return !isScheduledOnPreviousDay && !isScheduledOnNextDay;
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
            actualShiftDays: staff.actualShiftDays,
            expectedShiftDays: staff.expectedShiftDays,
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
                staffStats[staff.name].consecutiveDays = 0;
            }
        });
    }

    let statsHTML = '<table><tr><th>人員</th><th>白班</th><th>小夜</th><th>大夜</th><th>總班數</th><th>最多連續上班天數</th><th>實際班數</th><th>預期班數</th></tr>';
    Object.entries(staffStats).forEach(([staffName, stats]) => {
        statsHTML += `<tr>
            <td>${staffName}</td>
            <td>${stats[SHIFTS.DAY]}</td>
            <td>${stats[SHIFTS.EVENING]}</td>
            <td>${stats[SHIFTS.NIGHT]}</td>
            <td>${stats.totalShifts}</td>
            <td>${stats.maxConsecutiveDays}</td>
            <td>${stats.actualShiftDays}</td>
            <td>${stats.expectedShiftDays}</td>
        </tr>`;
    });
    statsHTML += '</table>';

    statisticsResult.innerHTML = statsHTML;
}

// 當文檔加載完成後，為排班按鈕添加事件監聽器
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generateScheduleBtn').addEventListener('click', generateSchedule);
});