// Popup script - Manual checklist management
document.addEventListener('DOMContentLoaded', async () => {
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
    const emptyState = document.getElementById('empty-state');
    const message = document.getElementById('message');
    const refreshBtn = document.getElementById('refresh-btn');
    const addManualBtn = document.getElementById('add-manual-btn');
    const courseList = document.getElementById('course-list');
    const manualNameInput = document.getElementById('manual-course-name');
    const manualCodeInput = document.getElementById('manual-course-code');

    // Load saved data
    loadData();

    // Manual add course button
    addManualBtn.addEventListener('click', () => {
        const name = manualNameInput.value.trim();
        const code = manualCodeInput.value.trim();

        if (!name || !code) {
            showMessage('Nama dan kode mata kuliah harus diisi!', 'error');
            return;
        }

        // Generate unique ID
        const id = 'manual_' + Date.now();

        const newCourse = {
            id: id,
            name: name,
            code: code,
            url: '#'
        };

        // Add to existing courses
        chrome.storage.local.get(['courses'], (result) => {
            const courses = result.courses || [];
            courses.push(newCourse);

            chrome.storage.local.set({ courses }, () => {
                loadData();
                showMessage(`✅ ${name} berhasil ditambahkan!`, 'success');
                manualNameInput.value = '';
                manualCodeInput.value = '';
            });
        });
    });

    // Refresh button - scrape courses from page
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳ Loading...';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab.url || !tab.url.includes('elearning.ut.ac.id')) {
                showMessage('Silakan buka halaman elearning.ut.ac.id terlebih dahulu', 'error');
                return;
            }

            chrome.tabs.sendMessage(tab.id, { action: 'scrapeData' }, (response) => {
                if (chrome.runtime.lastError) {
                    showMessage('Gagal mengambil data. Refresh halaman dan coba lagi.', 'error');
                    return;
                }

                if (response && response.success && response.data.courses) {
                    // Merge with existing checklist data
                    chrome.storage.local.get(['checklistData'], (result) => {
                        const existingData = result.checklistData || {};

                        // Keep existing checklist states for courses that still exist
                        const newCourses = response.data.courses;

                        chrome.storage.local.set({
                            courses: newCourses,
                            checklistData: existingData
                        }, () => {
                            loadData();
                            showMessage(`✅ Berhasil! Ditemukan ${newCourses.length} mata kuliah`, 'success');
                        });
                    });
                } else {
                    showMessage('Tidak ada mata kuliah ditemukan', 'error');
                }
            });
        } catch (err) {
            showMessage('Terjadi kesalahan: ' + err.message, 'error');
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = '🔄 Refresh Mata Kuliah';
        }
    });

    function loadData() {
        chrome.storage.local.get(['courses', 'checklistData'], (result) => {
            loading.style.display = 'none';

            const courses = result.courses || [];
            const checklistData = result.checklistData || {};

            if (courses.length === 0) {
                content.style.display = 'none';
                emptyState.style.display = 'block';
            } else {
                content.style.display = 'block';
                emptyState.style.display = 'none';
                displayCourses(courses, checklistData);
                updateSummary(checklistData);
            }
        });
    }

    function displayCourses(courses, checklistData) {
        courseList.innerHTML = '';

        courses.forEach(course => {
            const courseCard = createCourseCard(course, checklistData);
            courseList.appendChild(courseCard);
        });
    }

    function createCourseCard(course, checklistData) {
        const card = document.createElement('div');
        card.className = 'course-card';

        const courseId = course.id;
        const checklist = checklistData[courseId] || {
            attendance: false,
            task: false,
            discussion: false
        };

        // Display name or placeholder if empty
        const displayName = course.name && course.name.trim()
            ? course.name
            : '(Klik untuk isi nama)';
        const nameClass = course.name && course.name.trim()
            ? 'course-name'
            : 'course-name empty-name';

        card.innerHTML = `
            <div class="course-header">
                <div class="course-info">
                    <div class="${nameClass}" data-course-id="${courseId}" title="Klik untuk edit nama">${displayName}</div>
                    <div class="course-code">${course.code}</div>
                </div>
                <a href="${course.url}" target="_blank" class="course-link" title="Buka mata kuliah">🔗</a>
            </div>
            <div class="checklist">
                <div class="checklist-item ${checklist.attendance ? 'checked' : ''}" data-course="${courseId}" data-type="attendance">
                    <input type="checkbox" ${checklist.attendance ? 'checked' : ''}>
                    <label class="checklist-label">✅ Absensi</label>
                </div>
                <div class="checklist-item ${checklist.task ? 'checked' : ''}" data-course="${courseId}" data-type="task">
                    <input type="checkbox" ${checklist.task ? 'checked' : ''}>
                    <label class="checklist-label">📝 Tugas</label>
                </div>
                <div class="checklist-item ${checklist.discussion ? 'checked' : ''}" data-course="${courseId}" data-type="discussion">
                    <input type="checkbox" ${checklist.discussion ? 'checked' : ''}>
                    <label class="checklist-label">💬 Diskusi</label>
                </div>
            </div>
        `;

        // Add click handler for editable course name
        const nameEl = card.querySelector('.course-name');
        nameEl.addEventListener('click', () => {
            const currentName = course.name || '';
            const newName = prompt('Masukkan nama mata kuliah:', currentName);
            if (newName !== null && newName.trim()) {
                // Update course name in storage
                chrome.storage.local.get(['courses'], (result) => {
                    const courses = result.courses || [];
                    const courseIndex = courses.findIndex(c => c.id === courseId);
                    if (courseIndex !== -1) {
                        courses[courseIndex].name = newName.trim();
                        chrome.storage.local.set({ courses }, () => {
                            loadData(); // Refresh display
                            showMessage(`✅ Nama diubah ke: ${newName.trim()}`, 'success');
                        });
                    }
                });
            }
        });

        // Add click handlers for checkboxes
        const checkboxItems = card.querySelectorAll('.checklist-item');
        checkboxItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');

            // Click on item or checkbox toggles
            item.addEventListener('click', (e) => {
                if (e.target.tagName !== 'A') {
                    checkbox.checked = !checkbox.checked;
                    updateChecklistState(item, checkbox);
                }
            });

            // Prevent double toggle when clicking checkbox directly
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                updateChecklistState(item, checkbox);
            });
        });

        return card;
    }

    function updateChecklistState(item, checkbox) {
        const courseId = item.dataset.course;
        const type = item.dataset.type;
        const isChecked = checkbox.checked;

        // Update UI
        if (isChecked) {
            item.classList.add('checked');
        } else {
            item.classList.remove('checked');
        }

        // Update storage
        chrome.storage.local.get(['checklistData'], (result) => {
            const checklistData = result.checklistData || {};

            if (!checklistData[courseId]) {
                checklistData[courseId] = {
                    attendance: false,
                    task: false,
                    discussion: false
                };
            }

            checklistData[courseId][type] = isChecked;

            chrome.storage.local.set({ checklistData }, () => {
                updateSummary(checklistData);
            });
        });
    }

    function updateSummary(checklistData) {
        let totalAttendance = 0;
        let totalTasks = 0;
        let totalDiscussions = 0;

        Object.values(checklistData).forEach(data => {
            if (data.attendance) totalAttendance++;
            if (data.task) totalTasks++;
            if (data.discussion) totalDiscussions++;
        });

        document.getElementById('total-attendance').textContent = totalAttendance;
        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('total-discussions').textContent = totalDiscussions;
    }

    function showMessage(text, type) {
        message.textContent = text;
        message.className = type === 'success' ? 'error success' : 'error';
        message.style.display = 'block';

        setTimeout(() => {
            message.style.display = 'none';
        }, 4000);
    }
});