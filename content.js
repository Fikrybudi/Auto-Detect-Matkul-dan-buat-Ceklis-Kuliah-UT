// Content script - Course detection with multiple fallback methods
console.log('UT LMS Assistant v2 loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrapeData') {
        try {
            const data = scrapePageData();
            sendResponse({ success: true, data: data });
        } catch (error) {
            console.error('Error scraping data:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }
});

function scrapePageData() {
    console.log('=== Starting Course Detection ===');
    console.log('URL:', window.location.href);

    const courses = scrapeCourses();
    console.log('=== Detection Complete ===');
    console.log('Total courses found:', courses.length);

    return { courses: courses };
}

function scrapeCourses() {
    const courses = [];
    const seenIds = new Set();

    // METHOD 1: Dashboard course overview cards (usually has full name)
    console.log('Method 1: Checking dashboard course cards...');
    const dashboardCards = document.querySelectorAll('.course-info-container, .coursebox, .card[data-region="course-content"], .dashboard-card, [data-region="myoverview"] .card');
    console.log('Found dashboard cards:', dashboardCards.length);

    dashboardCards.forEach((card) => {
        try {
            // Look for course name - try multiple selectors for full name
            let titleEl = card.querySelector('.coursename, .fullname, h3 a, h4 a, .course-title, .multiline');
            if (!titleEl) titleEl = card.querySelector('[data-action="link-to-course"]');
            if (!titleEl) titleEl = card.querySelector('a[href*="/course/view.php"]');

            // Look for course link
            let linkEl = card.querySelector('a[href*="/course/view.php"]');
            if (!linkEl) linkEl = card.querySelector('a[href*="id="]');

            if (linkEl) {
                const url = linkEl.href;
                const id = extractCourseId(url);

                if (seenIds.has(id)) return;

                // Get name from title element or link
                let rawName = '';
                if (titleEl) {
                    // Try to get from title attribute first (often has full name)
                    rawName = titleEl.getAttribute('title') || titleEl.textContent.trim();
                } else {
                    rawName = linkEl.getAttribute('title') || linkEl.textContent.trim();
                }

                if (rawName.length < 3) return;

                // Skip button text and UI elements
                const lowerCardName = rawName.toLowerCase();
                if (lowerCardName.includes('enter') ||
                    lowerCardName.includes('view') ||
                    lowerCardName.includes('notification') ||
                    lowerCardName.includes('starred')) return;

                seenIds.add(id);
                const code = extractCourseCode(rawName);
                const name = cleanCourseName(rawName);

                courses.push({
                    id: id,
                    name: name,
                    code: code || name.substring(0, 10),
                    url: url
                });

                console.log(`  Found: ${name} | Code: ${code || 'no code'}`);
            }
        } catch (e) {
            console.warn('Error processing card:', e);
        }
    });

    // METHOD 2: Navigation/sidebar links - Try to get full course name
    if (courses.length === 0) {
        console.log('Method 2: Checking navigation links...');
        const navLinks = document.querySelectorAll('nav a, .navigation a, aside a, .sidebar a, [data-key="mycourses"] a, .block_navigation a');
        console.log('Found nav links:', navLinks.length);

        navLinks.forEach(link => {
            if (link.href && link.href.includes('/course/view.php')) {
                const rawName = link.textContent.trim();
                const url = link.href;
                const id = extractCourseId(url);

                if (seenIds.has(id) || rawName.length < 3) return;
                const lowerNavName = rawName.toLowerCase();
                if (lowerNavName.includes('enter') ||
                    lowerNavName.includes('view') ||
                    lowerNavName.includes('home') ||
                    lowerNavName.includes('notification') ||
                    lowerNavName.includes('starred')) return;

                seenIds.add(id);
                const code = extractCourseCode(rawName);

                // Try to get course name from various sources
                let name = '';

                // 1. Check title attribute
                if (link.title) {
                    name = cleanCourseName(link.title);
                }

                // 2. Check aria-label
                if (!name && link.getAttribute('aria-label')) {
                    name = cleanCourseName(link.getAttribute('aria-label'));
                }

                // 3. Check parent's title
                if (!name && link.parentElement && link.parentElement.title) {
                    name = cleanCourseName(link.parentElement.title);
                }

                // 4. Check for span with course fullname
                if (!name) {
                    const fullnameSpan = link.querySelector('.coursename, .fullname, [class*="name"]');
                    if (fullnameSpan) {
                        name = cleanCourseName(fullnameSpan.textContent);
                    }
                }

                // 5. Fallback to cleaned raw name
                if (!name) {
                    name = cleanCourseName(rawName);
                }

                courses.push({
                    id: id,
                    name: name,
                    code: code || rawName.substring(0, 10),
                    url: url
                });

                console.log(`  Found: ${name} | Code: ${code || 'no code'}`);
            }
        });
    }

    // METHOD 3: All course links on page
    if (courses.length === 0) {
        console.log('Method 3: Checking all course links...');
        const allLinks = document.querySelectorAll('a[href*="/course/view.php"]');
        console.log('Found course links:', allLinks.length);

        allLinks.forEach(link => {
            const rawName = link.textContent.trim();
            const url = link.href;
            const id = extractCourseId(url);

            if (seenIds.has(id) || rawName.length < 3) return;

            // Filter out common UI text
            const lowerName = rawName.toLowerCase();
            if (lowerName.includes('enter') ||
                lowerName.includes('view') ||
                lowerName.includes('lihat') ||
                lowerName.includes('home') ||
                lowerName.includes('dashboard') ||
                lowerName.includes('notification') ||
                lowerName.includes('starred')) return;

            seenIds.add(id);
            const code = extractCourseCode(rawName);
            const name = cleanCourseName(rawName);

            courses.push({
                id: id,
                name: name,
                code: code || name.substring(0, 20),
                url: url
            });

            console.log(`  Found: ${name} (${code || 'no code'})`);
        });
    }

    // METHOD 4: Scrape from visible text
    if (courses.length === 0) {
        console.log('Method 4: Searching page for course codes...');
        const bodyText = document.body.innerText;
        const codePattern = /([A-Z]{4}\d{4}(?:\.\d+)?)/g;
        const matches = bodyText.match(codePattern);

        if (matches) {
            console.log('Found course codes in text:', matches.length);
            const uniqueCodes = [...new Set(matches)];

            uniqueCodes.forEach(code => {
                courses.push({
                    id: code,
                    name: code,
                    code: code,
                    url: '#'
                });
                console.log(`  Found code: ${code}`);
            });
        }
    }

    console.log(`Total unique courses: ${courses.length}`);
    return courses;
}

function extractCourseCode(text) {
    // Match UT course codes: PDGK4101, MKDU4111, MKWN4108.1614
    // Pattern matches 4 uppercase letters followed by 4 digits, with optional dot and more digits
    const match = text.match(/\b([A-Z]{4}\d{4})(?:\.\d+)?\b/);
    if (match) {
        // Return only base code without dot notation
        // MKWN4108.1614 → MKWN4108
        return match[1];
    }
    return null;
}

function cleanCourseName(text) {
    // Remove trailing numbers from course name
    // "Akuntansi Biaya 213" → "Akuntansi Biaya"
    // "Bahasa Indonesia 1614" → "Bahasa Indonesia"
    // "MKWN4108.1614 - Nama Matkul" → "Nama Matkul"
    // "Course is starred Course name Akuntansi Biaya" → "Akuntansi Biaya"

    let cleanName = text;

    // Remove "Course is starred" and "Course name" prefixes
    cleanName = cleanName.replace(/^Course is starred\s*/i, '').trim();
    cleanName = cleanName.replace(/^Course name\s*/i, '').trim();

    // First remove the course code pattern if it appears at the start
    // Handles: "MKWN4108.1614 - Name", "MKWN4108 Name", etc
    cleanName = cleanName.replace(/^[A-Z]{4}\d{4}(?:\.\d+)?\s*[-:.]?\s*/i, '').trim();

    // Remove any remaining course code in the middle or end
    cleanName = cleanName.replace(/\b[A-Z]{4}\d{4}(?:\.\d+)?\b/g, '').trim();

    // Remove trailing numbers (like 213, 1614, 436, etc)
    cleanName = cleanName.replace(/\s+\d+$/, '').trim();

    // Remove extra whitespace and dashes
    cleanName = cleanName.replace(/\s*[-:]\s*$/, '').trim();
    cleanName = cleanName.replace(/\s+/g, ' ').trim();

    // If cleaned name is empty, return empty (let popup handle placeholder)
    return cleanName;
}

function extractCourseId(url) {
    const match = url.match(/[?&]id=(\d+)/);
    return match ? match[1] : url.substring(url.length - 10);
}

// Auto-scrape on page load
window.addEventListener('load', () => {
    console.log('Page loaded, auto-scraping in 2 seconds...');
    setTimeout(() => {
        try {
            const data = scrapePageData();
            if (data.courses.length > 0) {
                chrome.storage.local.set({ courses: data.courses }, () => {
                    console.log('✅ Courses auto-saved:', data.courses.length);
                });
            } else {
                console.warn('⚠️ No courses found on auto-scrape');
            }
        } catch (error) {
            console.error('Error in auto-scrape:', error);
        }
    }, 2000);
});

console.log('Content script ready!');