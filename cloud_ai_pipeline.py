import os
import sys
from google.cloud import firestore
from google import genai
from google.genai import types

# Optional: Load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 1. Google Cloud Firestore nundi latest data fetch cheyyadam
def get_latest_cloud_data(collection_name='project_updates'):
    """
    Firestore client authenticates automatically if:
    - GOOGLE_APPLICATION_CREDENTIALS points to your service account json, OR
    - You ran `gcloud auth application-default login`
    """
    try:
        db = firestore.Client()
        docs = (
            db.collection(collection_name)
            .order_by('timestamp', direction=firestore.Query.DESCENDING)
            .limit(1)
            .stream()
        )
        
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None
    except Exception as e:
        print(f"❌ Error fetching from Firestore: {e}", file=sys.stderr)
        return None


# 2. Gemini API call petti Video Script generate cheyyadam
def generate_script_with_gemini(summary_text):
    """
    Calls Google Gemini (gemini-2.5-flash) to generate a high-engagement viral video/clip script.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable set cheyyaledu. Please set GEMINI_API_KEY.")

    client = genai.Client(api_key=api_key)

    prompt = f"""
    You are an expert short-form video scriptwriter (YouTube Shorts / Reels / TikTok).
    Based on the following data from Google Cloud database, generate a viral 30-60 second video clip script.

    TOPIC/DATA:
    {summary_text}

    Format the output strictly as:
    1. Hook (First 3 seconds): Catchy opening line to stop scrolling
    2. Core Value/Story (3-4 concise bullet points)
    3. Call To Action (CTA): Engagement prompt
    4. Recommended Visual / Caption Ideas
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=800
        )
    )

    return response.text


# 3. Main Pipeline Trigger
def trigger_ai_pipeline(data):
    if not data:
        print("⚠️ No new data found in Google Cloud Firestore.")
        return None
    
    summary = data.get('summary') or data.get('title') or str(data)
    print(f"\n✅ Fetched from Firestore (Doc ID: {data.get('id')}):")
    print(f"   Summary: {summary}\n")

    print("🤖 Generating script using Gemini AI...")
    try:
        script = generate_script_with_gemini(summary)
        print("\n" + "=" * 50)
        print("🎬 GENERATED VIDEO SCRIPT:")
        print("=" * 50)
        print(script)
        print("=" * 50)
        return script
    except Exception as e:
        print(f"❌ Script generation failed: {e}", file=sys.stderr)
        return None


if __name__ == "__main__":
    latest_data = get_latest_cloud_data()
    trigger_ai_pipeline(latest_data)

