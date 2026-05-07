![Bayan AI](public/black-on-white.jpg)

Bayan AI is a web application that uses artificial intelligence to recognize Quranic recitations. Simply record your voice or upload an audio/video file, and Bayan will identify the Surah (chapter) and Ayah (verse) being recited. This tool is designed to help users identify recitations and analyze their Tarteel.

The application is built with Next.js and uses a custom AI model hosted on Hugging Face Spaces for the recognition backend.

## Key Features

*   **Live Recitation Recognition:** Analyze Quranic recitation in real-time directly from your microphone.
*   **Audio/Video File Upload:** Upload existing audio or video files to identify the recitation within them.
*   **AI-Powered Analysis:** Matches the audio against the Quran, providing the Surah, Ayah, and verse text.
*   **Detailed Results:** Displays the most likely match along with a similarity score, and provides links to view the verse on Quran.com.
*   **Recitation History:** Anonymously saves your recognized verses for future reference, accessible via a dedicated history page.
*   **Progressive Web App (PWA):** Installable on mobile and desktop devices for a native-app-like experience.
*   **Privacy-Focused:** Audio recordings are processed for analysis and are not stored on the server.
*   **Light/Dark Mode:** A sleek interface with support for both light and dark themes.

## Tech Stack

*   **Frontend:** Next.js, React, TypeScript
*   **UI & Styling:** Tailwind CSS, shadcn/ui, Framer Motion
*   **Audio Processing:** Web Audio API, FFmpeg.wasm (for client-side file trimming)
*   **Backend AI Model:** Hugging Face Spaces
*   **Database:** Firebase/Firestore (for anonymous user sessions and statistics)
*   **Deployment:** Vercel

## How It Works

1.  The user provides audio input either through live recording or by uploading a file.
2.  The frontend applies client-side processing, including noise reduction via the Web Audio API and file trimming for large uploads using FFmpeg.
3.  The processed audio is sent to a backend API hosted on Hugging Face Spaces.
4.  The backend model performs speech-to-text and uses fuzzy string matching to find the closest Ayah in its Quranic dataset.
5.  The result—containing the Surah, Ayah number, verse text, and similarity score—is returned to the frontend.
6.  The recognition data is anonymously saved to the user's session history in Firebase Firestore.

## Getting Started

To run this project locally, follow the steps below.

### Prerequisites

*   Node.js (v20.x or later)
*   npm, yarn, or pnpm

### 1. Clone the Repository

```bash
git clone https://github.com/saeedm0hamed/bayan-ai.git
cd bayan-ai
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up Environment Variables

The project uses Firebase for anonymous authentication and to store user recognition history. Create a `.env.local` file in the root of the project and add your Firebase project configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID"
```

> **Note:** The core recognition functionality depends on the backend service hosted at `https://sae8d-bayan-ai.hf.space/recognize`. This service must be operational for the application to function correctly.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application in action.
