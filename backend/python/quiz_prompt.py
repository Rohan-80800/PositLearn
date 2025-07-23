def get_quiz_prompt(num_questions, content, source="transcript", difficulty="medium"):
    difficulty = difficulty.lower()
    difficulty_map = {
        "easy": "simple and straightforward, testing basic understanding and recall",
        "medium": "moderately challenging, testing comprehension and application",
        "hard": "challenging, testing deep understanding, analysis, and synthesis"
    }
    difficulty_desc = difficulty_map.get(difficulty, difficulty_map["medium"])

    if "metadata" in source.lower():
        content_type = "video metadata (title, description, tags)"
        instruction = (
            f"Identify the main learning topic from this {content_type}:\n\n{content}\n\n"
            f"Generate exactly {num_questions} high-quality, accurate MCQs closely related to the topic, using general knowledge, technical multiple-choice quiz questions, no more, no less "
            f"Each question must: have 4 options with 1 correct answer; focus on key concepts or applications; "
            f"be {difficulty_desc}; include clear, precise text and plausible distractors. "
            f"Format:\n1. Question\nA) Opt1\nB) Opt2\nC) Opt3\nD) Opt4\nCorrect: C"
        )
    else:
        content_type = "video transcript about language learning and directions"
        instruction = (
            f"Generate exactly {num_questions} technical multiple-choice quiz questions, no more, no less, "
            f"from this transcript about language learning and directions:\n\n{content}\n\n"
            f"Each question must have 4 options, 1 correct answer, focusing on vocabulary, phrases, or concepts. "
            f"Questions should be technical, high-quality, efficient, and {difficulty_desc}, with clear wording and plausible distractors. "
            f"Format each question as: \n1. Question text\nA) Option1\nB) Option2\nC) Option3\nD) Option4\nCorrect: C"
        )

    return [
        {"role": "system", "content": "You are an expert quiz generator."},
        {"role": "user", "content": instruction}
    ]

