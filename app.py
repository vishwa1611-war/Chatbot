from flask import Flask, request, jsonify, Response, render_template, stream_with_context
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app)

MISTRAL_API_KEY = "oNXRoNnTyQlk6N1k5GSDuaaWGSBzPmze"  # Replace with your actual API key

def generate_mistral_response(messages):
    url = "https://api.mistral.ai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "mistral-small-latest",
        "messages": messages,
        "stream": True
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, stream=True)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    try:
                        json_data = json.loads(line[6:])
                        if json_data != '[DONE]':
                            content = json_data['choices'][0].get('delta', {}).get('content', '')
                            if content:
                                yield f"data: {json.dumps({'content': content})}\n\n"
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({"error": "No message provided"}), 400
        
        messages = [{"role": "user", "content": data['message']}]
        return Response(
            stream_with_context(generate_mistral_response(messages)),
            mimetype='text/event-stream'
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)