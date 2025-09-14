from flask import Flask, request, jsonify
from flask_cors import CORS

# Initialize the Flask application
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) to allow the frontend to communicate with this backend
CORS(app)

# --- DATA MAPPING ---
# Define the structure of the sensory profile based on the provided requirements

# Questions that do not receive a score
EXCLUDED_QUESTIONS = [10, 11, 17, 29, 42, 43]

# Mapping of questions to each of the 9 Sensory Sections
SENSORY_SECTIONS = {
    "auditory": list(range(1, 9)),
    "visual": list(range(9, 16)),
    "touch": list(range(16, 27)),
    "movement": list(range(27, 35)),
    "body_position": list(range(35, 43)),
    "oral": list(range(43, 53)),
    "conduct": list(range(53, 62)),
    "social_emotional": list(range(62, 76)),
    "attentional": list(range(76, 87))
}

# Mapping of questions to each of the 4 Quadrants
QUADRANTS = {
    "seeking": [14, 21, 22, 25, 27, 28, 30, 31, 32, 41, 48, 49, 50, 51, 55, 56, 60, 82, 83],
    "avoiding": [1, 2, 5, 15, 18, 58, 59, 61, 63, 64, 65, 66, 67, 68, 70, 71, 72, 74, 75, 81],
    "sensitivity": [3, 4, 6, 7, 9, 13, 16, 19, 20, 44, 45, 46, 47, 52, 69, 73, 77, 78, 84],
    "registration": [8, 12, 23, 24, 26, 33, 34, 35, 36, 37, 38, 39, 40, 53, 54, 57, 62, 76, 79, 80, 85, 86]
}

# --- CALCULATION LOGIC ---

@app.route('/calculate', methods=['POST'])
def calculate_scores():
    """
    API endpoint to calculate sensory profile scores.
    Receives a JSON object with all question scores and returns the calculated totals.
    """
    try:
        # Get the scores from the incoming request
        all_scores = request.json.get('scores', {})
        if not all_scores:
            return jsonify({"error": "No scores provided"}), 400

        # --- Calculate Raw Scores for the 9 Sensory Sections ---
        section_totals = {}
        for section_name, question_numbers in SENSORY_SECTIONS.items():
            total = 0
            for q_num in question_numbers:
                # Add score only if the question is not in the excluded list
                if q_num not in EXCLUDED_QUESTIONS:
                    # Safely get the score, defaulting to 0 if not found
                    total += int(all_scores.get(str(q_num), 0))
            section_totals[section_name] = total

        # --- Calculate Total Scores for the 4 Quadrants ---
        quadrant_totals = {}
        for quadrant_name, question_numbers in QUADRANTS.items():
            total = 0
            for q_num in question_numbers:
                 # Add score (all quadrant questions are included)
                total += int(all_scores.get(str(q_num), 0))
            quadrant_totals[quadrant_name] = total
            
        # Prepare the response
        response_data = {
            "section_scores": section_totals,
            "quadrant_scores": quadrant_totals
        }

        return jsonify(response_data), 200

    except Exception as e:
        # Handle potential errors during calculation
        return jsonify({"error": "An error occurred during calculation.", "details": str(e)}), 500

# Health check endpoint
@app.route('/')
def index():
    return "Sensory Profile Calculator Backend is running."

# This allows running the app directly for local testing
if __name__ == '__main__':
    app.run(debug=True)