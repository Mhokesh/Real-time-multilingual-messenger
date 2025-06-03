import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, Grid, Paper, TextField, Button, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { io } from 'socket.io-client';
import { styled } from '@mui/material/styles';
import MicIcon from '@mui/icons-material/Mic';

// Add TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface Message {
  text: string;
  sender: string;
  originalText?: string;
}

const socket = io('http://localhost:5000', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const ChatBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '400px',
  overflowY: 'auto',
  marginBottom: theme.spacing(2),
}));

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [user1Input, setUser1Input] = useState('');
  const [user2Input, setUser2Input] = useState('');
  const [user1Lang, setUser1Lang] = useState('en');
  const [user2Lang, setUser2Lang] = useState('hi');
  const [isListeningUser1, setIsListeningUser1] = useState(false);
  const [isListeningUser2, setIsListeningUser2] = useState(false);
  const [recognitionUser1, setRecognitionUser1] = useState<SpeechRecognition | null>(null);
  const [recognitionUser2, setRecognitionUser2] = useState<SpeechRecognition | null>(null);

  const initializeSpeechRecognition = useCallback((userId: string, lang: string) => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;
      console.log(`Speech recognition initialized for ${userId} with language: ${lang}`);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        const isFinal = event.results[event.results.length - 1].isFinal;

        console.log(`Speech recognition result for ${userId}: Interim=${!isFinal}, Transcript=${transcript}`);

        if (userId === 'user1') {
          setUser1Input(transcript);
        } else {
          setUser2Input(transcript);
        }

        if (isFinal) {
          console.log(`Final speech recognition result for ${userId}: Sending message.`);
          handleSendMessage(transcript, userId);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (userId === 'user1') {
          setIsListeningUser1(false);
        } else {
          setIsListeningUser2(false);
        }
      };

      recognition.onend = () => {
        console.log(`Speech recognition ended for ${userId}`);
        if (userId === 'user1') {
          setIsListeningUser1(false);
        } else {
          setIsListeningUser2(false);
        }
      };
      
      recognition.onstart = () => {
        console.log(`Speech recognition started for ${userId}`);
        if (userId === 'user1') {
          setIsListeningUser1(true);
        } else {
          setIsListeningUser2(true);
        }
      };

      return recognition;
    }
    return null;
  }, [user1Lang, user2Lang]);

  useEffect(() => {
    const recognition1 = initializeSpeechRecognition('user1', user1Lang);
    const recognition2 = initializeSpeechRecognition('user2', user2Lang);
    
    setRecognitionUser1(recognition1);
    setRecognitionUser2(recognition2);

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
      if (recognitionUser1) recognitionUser1.stop();
      if (recognitionUser2) recognitionUser2.stop();
    };
  }, [user1Lang, user2Lang, initializeSpeechRecognition]);

  const handleSendMessage = (text: string, sender: string) => {
    if (text.trim()) {
      const targetLang = sender === 'user1' ? user2Lang : user1Lang;
      const sourceLang = sender === 'user1' ? user1Lang : user2Lang;
      console.log('Sending message to server:', { text, sender, targetLang, sourceLang });
      socket.emit('message', { text, sender, targetLang, sourceLang });
    }
  };

  const toggleListening = (userId: string) => {
    const recognition = userId === 'user1' ? recognitionUser1 : recognitionUser2;
    const isListening = userId === 'user1' ? isListeningUser1 : isListeningUser2;
    const setIsListening = userId === 'user1' ? setIsListeningUser1 : setIsListeningUser2;

    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      if (userId === 'user1' && isListeningUser2) {
        recognitionUser2?.stop();
      } else if (userId === 'user2' && isListeningUser1) {
        recognitionUser1?.stop();
      }
      recognition.start();
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Multilingual Chat
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>User 1 Language</InputLabel>
              <Select
                value={user1Lang}
                onChange={(e) => setUser1Lang(e.target.value)}
                label="User 1 Language"
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="hi">Hindi</MenuItem>
                <MenuItem value="ta">Tamil</MenuItem>
                <MenuItem value="te">Telugu</MenuItem>
                <MenuItem value="mr">Marathi</MenuItem>
                <MenuItem value="gu">Gujarati</MenuItem>
                <MenuItem value="bn">Bengali</MenuItem>
                <MenuItem value="kn">Kannada</MenuItem>
                <MenuItem value="ml">Malayalam</MenuItem>
                <MenuItem value="pa">Punjabi</MenuItem>
              </Select>
            </FormControl>
            <ChatBox>
              {messages.map((msg, index) => (
                msg.sender === 'user1' ? (
                  <Box key={index} sx={{ textAlign: 'right', mb: 1 }}>
                    <Typography variant="body1" sx={{ 
                      display: 'inline-block',
                      backgroundColor: '#e3f2fd',
                      padding: 1,
                      borderRadius: 1
                    }}>
                      {msg.originalText || msg.text}
                    </Typography>
                  </Box>
                ) : (
                  <Box key={index} sx={{ textAlign: 'left', mb: 1 }}>
                    <Typography variant="body1" sx={{ 
                      display: 'inline-block',
                      backgroundColor: '#f5f5f5',
                      padding: 1,
                      borderRadius: 1
                    }}>
                      {msg.text}
                    </Typography>
                  </Box>
                )
              ))}
            </ChatBox>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={user1Input}
                onChange={(e) => setUser1Input(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(user1Input, 'user1')}
              />
              <Button variant="contained" onClick={() => handleSendMessage(user1Input, 'user1')}>
                Send
              </Button>
              <Button
                variant="outlined"
                onClick={() => toggleListening('user1')}
                disabled={!recognitionUser1}
                color={isListeningUser1 ? 'secondary' : 'primary'}
              >
                <MicIcon />
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>User 2 Language</InputLabel>
              <Select
                value={user2Lang}
                onChange={(e) => setUser2Lang(e.target.value)}
                label="User 2 Language"
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="hi">Hindi</MenuItem>
                <MenuItem value="ta">Tamil</MenuItem>
                <MenuItem value="te">Telugu</MenuItem>
                <MenuItem value="mr">Marathi</MenuItem>
                <MenuItem value="gu">Gujarati</MenuItem>
                <MenuItem value="bn">Bengali</MenuItem>
                <MenuItem value="kn">Kannada</MenuItem>
                <MenuItem value="ml">Malayalam</MenuItem>
                <MenuItem value="pa">Punjabi</MenuItem>
              </Select>
            </FormControl>
            <ChatBox>
              {messages.map((msg, index) => (
                msg.sender === 'user2' ? (
                  <Box key={index} sx={{ textAlign: 'right', mb: 1 }}>
                    <Typography variant="body1" sx={{ 
                      display: 'inline-block',
                      backgroundColor: '#e3f2fd',
                      padding: 1,
                      borderRadius: 1
                    }}>
                      {msg.originalText || msg.text}
                    </Typography>
                  </Box>
                ) : (
                  <Box key={index} sx={{ textAlign: 'left', mb: 1 }}>
                    <Typography variant="body1" sx={{ 
                      display: 'inline-block',
                      backgroundColor: '#f5f5f5',
                      padding: 1,
                      borderRadius: 1
                    }}>
                      {msg.text}
                    </Typography>
                  </Box>
                )
              ))}
            </ChatBox>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={user2Input}
                onChange={(e) => setUser2Input(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(user2Input, 'user2')}
              />
              <Button variant="contained" onClick={() => handleSendMessage(user2Input, 'user2')}>
                Send
              </Button>
              <Button
                variant="outlined"
                onClick={() => toggleListening('user2')}
                disabled={!recognitionUser2}
                color={isListeningUser2 ? 'secondary' : 'primary'}
              >
                <MicIcon />
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default App; 