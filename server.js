const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Translate } = require('@google-cloud/translate').v2;
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Initialize Google Translate
const translate = new Translate({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Store user preferences
const userPreferences = new Map();

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('setLanguage', ({ userId, language }) => {
    userPreferences.set(userId, language);
    console.log(`User ${userId} set language to ${language}`);
  });

  socket.on('message', async ({ text, sender, targetLang, sourceLang }) => {
    try {
      console.log('Received message:', { text, sender, targetLang, sourceLang });
      
      let finalSourceLang = sourceLang; // Use provided sourceLang if available

      // If sourceLang is not provided (e.g., for text input), detect the language
      if (!finalSourceLang) {
        const [detections] = await translate.detect(text);
        const detectedLanguageWithScript = Array.isArray(detections) ? detections[0].language : detections.language;
        finalSourceLang = detectedLanguageWithScript.split('-')[0]; // Extract base language code
        console.log('Detected language:', finalSourceLang);
      }

      let translatedText = text;
      // Only translate if the detected/provided source language is different from the target language
      if (finalSourceLang !== targetLang) {
        console.log(`Translating from ${finalSourceLang} to ${targetLang}`);
        const [translation] = await translate.translate(text, {
          from: finalSourceLang,
          to: targetLang
        });
        translatedText = translation;
      } else {
        console.log('Source and target language are the same, no translation needed.');
      }

      // Send the message back to all clients
      io.emit('message', {
        text: translatedText,
        sender: sender,
        originalText: text
      });

    } catch (error) {
      console.error('Translation error:', error);
      socket.emit('error', { message: 'Translation failed' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 