// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Check which page we are on
    const complaintsContainer = document.getElementById('complaints-container');
    const complaintForm = document.getElementById('complaint-form');

    if (complaintsContainer) {
        // We are on the homepage
        displayComplaints();
    }

    if (complaintForm) {
        // We are on the add complaint page
        complaintForm.addEventListener('submit', handleFormSubmit);

        const btnGenerate = document.getElementById('btn-generate');
        if (btnGenerate) {
            btnGenerate.addEventListener('click', generateQuestion);
        }
    }
});

// Hardcoded Gemini API Key as requested by the user
const GEMINI_API_KEY = 'AIzaSyANd_nnhVmRdyALXN7yqeNkpwCaWEVRA7s';

let currentAiQuestion = '';

// Fetch complaints from local storage
function getComplaints() {
    const complaints = localStorage.getItem('complaints');
    return complaints ? JSON.parse(complaints) : [];
}

// Display complaints on the homepage
function displayComplaints() {
    const container = document.getElementById('complaints-container');
    const complaints = getComplaints();

    // Clear loading state
    container.innerHTML = '';

    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="no-complaints">
                <h3>No complaints found</h3>
                <p>Be the first to register a complaint.</p>
            </div>
        `;
        return;
    }

    // Sort by newest first
    complaints.sort((a, b) => new Date(b.date) - new Date(a.date));

    complaints.forEach(complaint => {
        const card = document.createElement('div');
        card.className = 'complaint-card';

        // Format date
        const dateObj = new Date(complaint.date);
        const formattedDate = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(dateObj);

        // Prevent XSS basic escaping
        const escapeHTML = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${escapeHTML(complaint.name)}</div>
            </div>
            <div class="card-meta">
                <span>📍 ${escapeHTML(complaint.city)}</span>
                <span>•</span>
                <span>📞 ${escapeHTML(complaint.mobile)}</span>
                <span>•</span>
                <span>📅 ${formattedDate}</span>
            </div>
            <div class="card-body">
                ${escapeHTML(complaint.text)}
            </div>
            ${complaint.aiQuestion ? `
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <div style="color: var(--accent-color); font-weight: 600; font-size: 0.9rem; margin-bottom: 0.25rem;">AI Follow-up:</div>
                <div style="font-size: 0.95rem; margin-bottom: 0.75rem;">${escapeHTML(complaint.aiQuestion)}</div>
                <div style="color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; margin-bottom: 0.25rem;">User Answer:</div>
                <div style="font-size: 0.95rem; color: #cbd5e1;">${escapeHTML(complaint.aiAnswer)}</div>
            </div>
            ` : ''}
        `;

        container.appendChild(card);
    });
}

async function generateQuestion() {
    const apiKey = typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : '';
    const text = document.getElementById('complaint').value.trim();

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        alert('API Key is missing or invalid in the code. Please set GEMINI_API_KEY.');
        return;
    }

    if (!text) {
        alert('Please enter the complaint details first.');
        return;
    }

    const btnGenerate = document.getElementById('btn-generate');
    const questionSection = document.getElementById('ai-question-section');
    const questionLabel = document.getElementById('ai-question-label');
    const answerInput = document.getElementById('ai-answer');

    btnGenerate.disabled = true;
    btnGenerate.textContent = 'Generating...';
    questionSection.style.display = 'block';

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Based on the following user complaint, generate ONE relevant follow-up question to ask the user to clarify or gather more important details. Keep it concise.\nComplaint: "${text}"`
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error('API Error: ' + response.statusText);
        }

        const data = await response.json();
        const question = data.candidates[0].content.parts[0].text.trim();

        currentAiQuestion = question;
        questionLabel.textContent = question;
        answerInput.disabled = false;

        // Hide generate button, show submit button
        btnGenerate.style.display = 'none';
        document.getElementById('btn-submit').style.display = 'block';
    } catch (error) {
        console.error(error);
        alert('Failed to generate question. Please check your API key.');
        questionSection.style.display = 'none';
        btnGenerate.disabled = false;
        btnGenerate.textContent = 'Generate Question';
    }
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const city = document.getElementById('city').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const text = document.getElementById('complaint').value.trim();
    const answerInput = document.getElementById('ai-answer');
    const aiAnswer = answerInput ? answerInput.value.trim() : '';

    if (!name || !city || !mobile || !text) {
        alert('Please fill in all primary fields.');
        return;
    }

    if (currentAiQuestion && !aiAnswer) {
        alert('Please answer the AI generated question.');
        return;
    }

    const newComplaint = {
        id: Date.now().toString(),
        name,
        city,
        mobile,
        text,
        aiQuestion: currentAiQuestion,
        aiAnswer: aiAnswer,
        date: new Date().toISOString()
    };

    const complaints = getComplaints();
    complaints.push(newComplaint);

    localStorage.setItem('complaints', JSON.stringify(complaints));

    // Show success toast
    showToast('Complaint registered successfully!');

    // Reset form
    e.target.reset();

    // Redirect to home after short delay
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

function showToast(message) {
    // Check if toast already exists
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;

    // Trigger reflow
    void toast.offsetWidth;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
