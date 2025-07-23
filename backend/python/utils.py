from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
from g4f.client import Client
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from youtube_transcript_api.formatters import TextFormatter
from quiz_prompt import get_quiz_prompt
from dotenv import load_dotenv
import re
import os
import requests

load_dotenv()
youtube_api_key = os.getenv('YOUTUBE_API_KEY')

def chunk_text(text, max_length=4000):
    """Split long text into smaller parts for stable translation."""
    words = text.split()
    chunks = []
    chunk = ""

    for word in words:
        if len(chunk) + len(word) + 1 <= max_length:
            chunk += " " + word
        else:
            chunks.append(chunk.strip())
            chunk = word
    if chunk:
        chunks.append(chunk.strip())
    return chunks

def translate_text_simple(text, source_lang, target_lang='en'):
    """Simple translation using a free API alternative."""
    try:
        url = "https://libretranslate.de/translate"
        payload = {
            "q": text,
            "source": source_lang,
            "target": target_lang,
            "format": "text"
        }
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code == 200:
            return response.json()["translatedText"]
        else:
            return text
    except Exception as e:
        print(f"Translation error: {e}")
        return text

def parse_quiz_content(quiz_text):
    """Parse quiz text into structured JSON format."""
    try:
        questions = []
        question_blocks = re.split(r'\n(?=\d+\.\s)', quiz_text.strip())
        
        for block in question_blocks:
            lines = block.strip().split('\n')
            if len(lines) < 6:
                continue
                
            question_text = lines[0].split('.', 1)[1].strip() if lines[0].startswith(tuple(f"{i}." for i in range(1, 100))) else lines[0].strip()
            options = []
            correct = None
            
            for line in lines[1:5]:
                if line.strip():
                    option_text = line.split(')', 1)[1].strip() if ')' in line else line.strip()
                    options.append(option_text)
            
            correct_line = lines[-1].lower()
            if 'correct:' in correct_line:
                correct_text = correct_line.split('correct:')[1].strip()
                option_index = ord(correct_text.upper()) - ord('A') if correct_text.upper() in ['A', 'B', 'C', 'D'] else -1
                if 0 <= option_index < len(options):
                    correct = options[option_index]
            
            if question_text and len(options) == 4 and correct:
                questions.append({
                    "text": question_text,
                    "options": options,
                    "correct": correct
                })
        
        return questions
    except Exception as e:
        return []

def fetch_youtube_metadata(video_id):
    """Fetch video metadata using YouTube Data API."""
    try:
        youtube = build('youtube', 'v3', developerKey=youtube_api_key)
        request = youtube.videos().list(
            part='snippet',
            id=video_id
        )
        response = request.execute()

        if not response['items']:
            return None, "No metadata available for this video."

        snippet = response['items'][0]['snippet']
        metadata = {
            'title': snippet.get('title', ''),
            'description': snippet.get('description', ''),
            'tags': snippet.get('tags', []),
            'categoryId': snippet.get('categoryId', '')
        }

        metadata_text = f"Title: {metadata['title']}\nDescription: {metadata['description']}\nTags: {', '.join(metadata['tags'])}"
        return metadata_text, None
    except HttpError as e:
        error_msg = f"YouTube API error: {str(e)}"
        return None, error_msg
    except Exception as e:
        error_msg = f"Error fetching metadata: {str(e)}"
        return None, error_msg

def generate_quiz(video_id, num_questions=10, difficulty="medium"):
    """Generate quiz questions based on YouTube video content."""
    try:
        if not video_id or not isinstance(video_id, str) or len(video_id) != 11:
            return {
                "quizzes": [],
                "error": "Invalid video ID. Must be an 11-character string.",
                "transcript": None,
                "transcript_source": None
            }
        
        full_caption = None
        transcript_source = None
        
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            available_langs = [t.language_code for t in transcript_list]

            transcript_obj = transcript_list.find_transcript(available_langs)
            original_lang = transcript_obj.language_code
            transcript = transcript_obj.fetch()

            formatter = TextFormatter()
            original_text = formatter.format_transcript(transcript)
            transcript_source = f"{original_lang} transcript"

            if original_lang != "en":
                chunks = chunk_text(original_text)
                translated_text = ""

                for chunk in chunks:
                    translated_chunk = translate_text_simple(chunk, original_lang, 'en')
                    translated_text += translated_chunk + "\n"

                full_caption = translated_text
                transcript_source = f"Translated {original_lang} transcript"
            else:
                full_caption = original_text
                transcript_source = "English transcript"

        except (TranscriptsDisabled, NoTranscriptFound):
            metadata_text, error_msg = fetch_youtube_metadata(video_id)
            if error_msg:
                return {
                    "quizzes": [],
                    "error": error_msg,
                    "transcript": None,
                    "transcript_source": None
                }
            full_caption = metadata_text
            transcript_source = "YouTube metadata (title, description, tags)"
        except Exception as e:
            error_msg = f"Failed to fetch transcript: {str(e)}. Attempting to fetch metadata."
            metadata_text, metadata_error = fetch_youtube_metadata(video_id)
            if metadata_error:
                return {
                    "quizzes": [],
                    "error": f"Transcript error: {str(e)}. Metadata error: {metadata_error}",
                    "transcript": None,
                    "transcript_source": None
                }
            full_caption = metadata_text
            transcript_source = "YouTube metadata (title, description, tags)"

        client = Client()
        models = ["gpt-4o", "gpt-4", "llama-3", "mistral"]
        for model in models:
            try:
                prompt = get_quiz_prompt(num_questions, full_caption, source=transcript_source, difficulty=difficulty)
                response = client.chat.completions.create(
                    model=model,
                    messages=prompt,
                    temperature=0.3
                )
                quiz_content = response.choices[0].message.content
                parsed_questions = parse_quiz_content(quiz_content)
                if not parsed_questions:
                    continue
                return {
                    "quizzes": parsed_questions,
                    "error": None,
                    "transcript": full_caption,
                    "transcript_source": transcript_source
                }
            except Exception as e:
                continue

        error_msg = "All AI models failed to generate valid quizzes"
        return {
            "quizzes": [],
            "error": error_msg,
            "transcript": full_caption,
            "transcript_source": transcript_source
        }
    except Exception as e:
        error_msg = f"Unexpected error generating quiz: {str(e)}"
        return {
            "quizzes": [],
            "error": error_msg,
            "transcript": None,
            "transcript_source": None
        }

               