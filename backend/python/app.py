from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from utils import  generate_quiz
from dotenv import load_dotenv

load_dotenv()
secret_key = os.getenv('SERVER_URL')
youtube_api_key = os.getenv('YOUTUBE_API_KEY')  
port = os.getenv('PYTHON_PORT')

app = Flask(__name__)
CORS(app, resources={r"/generate-quiz": {"origins": secret_key}})

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz_endpoint():
    try:
        data = request.get_json()
        video_id = data.get('videoId')
        num_questions = data.get('numQuestions', 10)
        difficulty = data.get('difficulty', 'medium') 
        
        if not video_id:
            return jsonify({
                "quizzes": [],
                "error": "Video ID is required",
                "transcripts": {},
                "transcript_source": None
            }), 400
        
        if not isinstance(num_questions, int) or num_questions <= 0:
            return jsonify({
                "quizzes": [],
                "error": "Number of questions must be a positive integer",
                "transcripts": {},
                "transcript_source": None
            }), 400

        valid_difficulties = ['easy', 'medium', 'hard']
        if difficulty.lower() not in valid_difficulties:
            return jsonify({
                "quizzes": [],
                "error": f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}",
                "transcripts": {},
                "transcript_source": None
            }), 400

        result = generate_quiz(video_id, num_questions, difficulty.lower())
        if result["error"]:
            return jsonify({
                "quizzes": [],
                "error": result["error"],
                "transcripts": {video_id: result["transcript"]},
                "transcript_source": result.get("transcript_source")
            }), 400

        return jsonify({
            "quizzes": result["quizzes"],
            "transcripts": {video_id: result["transcript"]},
            "transcript_source": result.get("transcript_source")
        }), 200
    except Exception as e:
        error_msg = f"Server error: {str(e)}"
        return jsonify({
            "quizzes": [],
            "error": error_msg,
            "transcripts": {},
            "transcript_source": None
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=port)
    
    
       