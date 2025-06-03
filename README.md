# Multilingual Chat Application

A real-time chat application that supports multiple languages with automatic translation. Users can type in their preferred language, and messages are automatically translated to the receiver's preferred language.

## Features

- Real-time chat between two users
- Support for multiple languages
- Automatic message translation
- Modern Material-UI interface
- Real-time updates using Socket.IO

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Cloud account with Translation API enabled

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd multilingual-chat
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
```

4. Create a `.env` file in the root directory with your Google Cloud credentials:
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json
PORT=5000
```

5. Start the backend server:
```bash
npm run dev
```

6. In a new terminal, start the frontend development server:
```bash
cd client
npm start
```

The application will be available at `http://localhost:3000`

## Usage

1. Open the application in two different browser windows to simulate two users
2. Each user can select their preferred language from the dropdown menu
3. Type messages in your preferred language
4. Messages will be automatically translated to the receiver's preferred language

## Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Russian (ru)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)

## Technologies Used

- React
- TypeScript
- Material-UI
- Socket.IO
- Express.js
- Google Cloud Translation API 