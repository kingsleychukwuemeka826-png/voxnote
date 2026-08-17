Mobile transcription hardening test target:
- Live speech recognition emits final results only; interim results are no longer appended.
- If browser speech recognition is unavailable or produces no final transcript, the saved audio is sent to /api/transcribe-meeting-audio for server-side transcription.
- A failed transcription is surfaced in the recorder UI instead of silently saving an untranscribed note.
