import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, IconButton, Paper, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import apiClient from '../utils/apiClient';

const TreatmentPlanChat = ({ treatmentId, patientData, planData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am your clinical assistant. Do you have any questions about this generated treatment plan?' }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!message.trim() || loading) return;

        const userMessage = { role: 'user', content: message };
        setMessages(prev => [...prev, userMessage]);
        setMessage('');
        setLoading(true);

        try {
            const response = await apiClient.post(`/treatments/${treatmentId}/query`, {
                query: message,
                history: messages.slice(1) // Exclude initial greeting
            });

            if (response.data.success) {
                const aiMessage = { 
                    role: 'assistant', 
                    content: response.data.data.response 
                };
                setMessages(prev => [...prev, aiMessage]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <IconButton 
                onClick={() => setIsOpen(true)}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    backgroundColor: '#059789',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#00F0FF' },
                    boxShadow: '0 0 20px rgba(5, 151, 137, 0.4)',
                    width: 64,
                    height: 64,
                    zIndex: 1000
                }}
            >
                <ChatIcon />
            </IconButton>
        );
    }

    return (
        <Paper
            elevation={12}
            sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                width: 400,
                height: 500,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#162032',
                border: '1px solid #059789',
                borderRadius: '16px',
                overflow: 'hidden',
                zIndex: 1000
            }}
        >
            {/* Header */}
            <Box sx={{ 
                p: 2, 
                backgroundColor: '#059789', 
                color: '#fff', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
            }}>
                <Typography variant="h6" sx={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>CLINICAL ASSISTANT</Typography>
                <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: '#fff' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Messages */}
            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messages.map((msg, i) => (
                    <Box 
                        key={i} 
                        sx={{ 
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            backgroundColor: msg.role === 'user' ? '#059789' : 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            p: 1.5,
                            borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                            border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.1)' : 'none'
                        }}
                    >
                        <Typography variant="body2" sx={{ fontFamily: 'Space Grotesk' }}>{msg.content}</Typography>
                    </Box>
                ))}
                {loading && (
                    <Box sx={{ alignSelf: 'flex-start', p: 1 }}>
                        <CircularProgress size={20} sx={{ color: '#00F0FF' }} />
                    </Box>
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 1 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Ask about the treatment..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                            '&:hover fieldset': { borderColor: '#059789' },
                            '&.Mui-focused fieldset': { borderColor: '#00F0FF' }
                        },
                        '& .MuiInputBase-input': { fontFamily: 'Space Grotesk' }
                    }}
                />
                <IconButton type="submit" disabled={loading} sx={{ color: '#00F0FF' }}>
                    <SendIcon />
                </IconButton>
            </Box>
        </Paper>
    );
};

export default TreatmentPlanChat;
