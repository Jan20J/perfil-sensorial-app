document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    // IMPORTANT: Replace this with your actual Render backend URL after deployment
    const BACKEND_URL = 'http://127.0.0.1:5000/calculate';

    const form = document.getElementById('sensory-form');
    const calculateBtn = document.getElementById('calculate-btn');
    const loader = document.getElementById('loader');
    const resultsSection = document.getElementById('results-section');

    // --- DATA MAPPING (matches the backend) ---
    const SECTIONS_CONFIG = {
        "Procesamiento Auditivo": { range: [1, 8], id: "auditory" },
        "Procesamiento Visual": { range: [9, 15], id: "visual" },
        "Procesamiento Táctil": { range: [16, 26], id: "touch" },
        "Procesamiento de Movimiento": { range: [27, 34], id: "movement" },
        "Procesamiento de Posición del Cuerpo": { range: [35, 42], id: "body_position" },
        "Procesamiento Sensorial Oral": { range: [43, 52], id: "oral" },
        "Conducta asociada con el procesamiento sensorial": { range: [53, 61], id: "conduct" },
        "Respuestas emocionales/sociales": { range: [62, 75], id: "social_emotional" },
        "Respuestas de atención": { range: [76, 86], id: "attentional" }
    };

    const QUADRANTS_CONFIG = {
        "Seeking/Seeker (Búsqueda)": { questions: [14, 21, 22, 25, 27, 28, 30, 31, 32, 41, 48, 49, 50, 51, 55, 56, 60, 82, 83], id: "seeking" },
        "Avoiding/Avoider (Evitación)": { questions: [1, 2, 5, 15, 18, 58, 59, 61, 63, 64, 65, 66, 67, 68, 70, 71, 72, 74, 75, 81], id: "avoiding" },
        "Sensitivity/Sensor (Sensibilidad)": { questions: [3, 4, 6, 7, 9, 13, 16, 19, 20, 44, 45, 46, 47, 52, 69, 73, 77, 78, 84], id: "sensitivity" },
        "Registration/Bystander": { questions: [8, 12, 23, 24, 26, 33, 34, 35, 36, 37, 38, 39, 40, 53, 54, 57, 62, 76, 79, 80, 85, 86], id: "registration" }
    };
    
    const EXCLUDED_QUESTIONS = [10, 11, 17, 29, 42, 43];
    
    const FINAL_SCORES_MAX = {
        seeking: 95, avoiding: 100, sensitivity: 95, registration: 110,
        auditory: 40, visual: 30, touch: 55, movement: 40,
        body_position: 40, oral: 50, conduct: 45, social_emotional: 70, attentional: 50
    };

    // --- FORM GENERATION ---
    function createForm() {
        for (const [title, config] of Object.entries(SECTIONS_CONFIG)) {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'form-section';
            
            const sectionTitle = document.createElement('h2');
            sectionTitle.textContent = title;
            sectionDiv.appendChild(sectionTitle);

            const table = document.createElement('table');
            table.className = 'question-table';
            table.innerHTML = `<thead><tr><th>Ítem</th><th>Calificación</th></tr></thead>`;
            
            const tbody = document.createElement('tbody');
            for (let i = config.range[0]; i <= config.range[1]; i++) {
                const isExcluded = EXCLUDED_QUESTIONS.includes(i);
                
                // Genera los botones de radio
                let ratingHTML = '';
                for (let j = 5; j >= 0; j--) {
                    ratingHTML += `
                        <label>
                            <input type="radio" name="rating-${i}" value="${j}">
                            <span>${j}</span>
                        </label>
                    `;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="question-item ${isExcluded ? 'excluded-item' : ''}">${i}${isExcluded ? '*' : ''}</td>
                    <td>
                        <div class="rating-group ${isExcluded ? 'disabled' : ''}" data-item-group="${i}">
                           ${ratingHTML}
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            }
            table.appendChild(tbody);
            sectionDiv.appendChild(table);
            form.appendChild(sectionDiv);
        }
    }

    // --- EVENT LISTENERS ---
    calculateBtn.addEventListener('click', async () => {
        const scores = gatherScores();
        if (!scores) return; // Validation failed

        loader.style.display = 'block';
        calculateBtn.style.display = 'none';
        resultsSection.classList.add('hidden');

        try {
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scores })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `El servidor devolvió un error: ${response.statusText}`);
            }

            const results = await response.json();
            displayResults(results, scores);

        } catch (error) {
            console.error('Error al calcular las puntuaciones:', error);
            alert(`Hubo un problema al contactar al servidor: ${error.message}. Por favor, intente de nuevo.`);
        } finally {
            loader.style.display = 'none';
            calculateBtn.style.display = 'block';
        }
    });

    // --- DATA HANDLING AND DISPLAY ---
    function gatherScores() {
        const scores = {};
        const ratingGroups = document.querySelectorAll('.rating-group:not(.disabled)');
        let allValid = true;

        ratingGroups.forEach(group => {
            const item = group.dataset.itemGroup;
            const selected = group.querySelector('input[type="radio"]:checked');

            if (selected) {
                scores[item] = parseInt(selected.value, 10);
                group.classList.remove('error'); // Quita el borde rojo si ya se seleccionó
            } else {
                allValid = false;
                group.classList.add('error'); // Añade un borde rojo para indicar que falta
            }
        });

        if (!allValid) {
            alert('Por favor, complete todas las preguntas. Las preguntas sin respuesta están marcadas en rojo.');
            return null;
        }
        return scores;
    }

    function displayResults(results, allScores) {
        // 1. Populate Quadrant Summary
        const quadrantGrid = document.querySelector('#section-resumen-cuadrantes .cuadrantes-grid');
        quadrantGrid.innerHTML = ''; // Clear previous
        for (const [name, config] of Object.entries(QUADRANTS_CONFIG)) {
            const card = document.createElement('div');
            card.className = 'cuadrante-card';
            const total = results.quadrant_scores[config.id];
            
            let tableHTML = `<h3>${name}</h3><table><tbody>`;
            config.questions.forEach(qNum => {
                tableHTML += `<tr><td>Pregunta #${qNum}</td><td>${allScores[qNum]}</td></tr>`;
            });
            tableHTML += `</tbody><tfoot><tr><td><strong>Total</strong></td><td>${total}</td></tr></tfoot></table>`;
            
            card.innerHTML = tableHTML;
            quadrantGrid.appendChild(card);
        }

        // 2. Populate Final Summary Table
        const summaryTable = document.getElementById('final-summary-table');
        summaryTable.innerHTML = `
            <thead>
                <tr><th>Categoría</th><th>Ítem</th><th>Puntaje Final</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td rowspan="4"><strong>Quadrants</strong></td>
                    <td>Seeking/Seeker</td>
                    <td class="final-score"><span class="score-value">${results.quadrant_scores.seeking}</span> / ${FINAL_SCORES_MAX.seeking}</td>
                </tr>
                <tr>
                    <td>Avoiding/Avoider</td>
                    <td class="final-score"><span class="score-value">${results.quadrant_scores.avoiding}</span> / ${FINAL_SCORES_MAX.avoiding}</td>
                </tr>
                <tr>
                    <td>Sensitivity/Sensor</td>
                    <td class="final-score"><span class="score-value">${results.quadrant_scores.sensitivity}</span> / ${FINAL_SCORES_MAX.sensitivity}</td>
                </tr>
                <tr>
                    <td>Registration/Bystander</td>
                    <td class="final-score"><span class="score-value">${results.quadrant_scores.registration}</span> / ${FINAL_SCORES_MAX.registration}</td>
                </tr>
                <tr>
                    <td rowspan="6"><strong>Sensory Sections</strong></td>
                    <td>Auditory</td>
                    <td class="final-score"><span class="score-value">${results.section_scores.auditory}</span> / ${FINAL_SCORES_MAX.auditory}</td>
                </tr>
                <tr>
                    <td>Visual</td>
                    <td class="final-score"><span class="score-value">${results.section_scores.visual}</span> / ${FINAL_SCORES_MAX.visual}</td>
                </tr>
                <tr>
                    <td>Touch</td>
                    <td class="final-score"><span class="score-value">${results.section_scores.touch}</span> / ${FINAL_SCORES_MAX.touch}</td>
                </tr>
                 <tr>
                    <td>Movement</td>
                    <td class="final-score"><span class="score-value">${results.section_scores.movement}</span> / ${FINAL_SCORES_MAX.movement}</td>
                </tr>
                 <tr>
                    <td>Body Position</td>
                    <td class="final-score"><span class="score-value">${results.section_scores.body_position}</span> / ${FINAL_SCORES_MAX.body_position}</td>
                </tr>
                <tr>
                    <td>Oral</td>
                    <td class="final-score"><span class="score-value">${results.section_scores.oral}</span> / ${FINAL_SCORES_MAX.oral}</td>
                </tr>
                <tr>
                    <td rowspan="3"><strong>Behavioral Sections</strong></td>
                    <td>Conduct</td>
                    <td class="final-score"><span class="score-value">${results.section_scores.conduct}</span> / ${FINAL_SCORES_MAX.conduct}</td>
                </tr>
                <tr>
                    <td>Social Emotional</td>
                    <td class="final-score"><span class="score-value">${results.section_scores.social_emotional}</span> / ${FINAL_SCORES_MAX.social_emotional}</td>
                </tr>
                <tr>
                    <td>Attentional</td>
                    <td class="final-score"><span class="score-value">${results.section_scores.attentional}</span> / ${FINAL_SCORES_MAX.attentional}</td>
                </tr>
            </tbody>
        `;

        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // --- INITIALIZATION ---
    createForm();
});