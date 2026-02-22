import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, IconButton, Paper, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import PsychologyIcon from '@mui/icons-material/Psychology';
import apiClient from '../utils/apiClient';
import ReactMarkdown from 'react-markdown';

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
                    bottom: 40,
                    right: 40,
                    background: 'linear-gradient(135deg, #5B6FF6 0%, #7C5CFF 100%)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    '&:hover': { 
                        background: 'linear-gradient(135deg, #7C5CFF 0%, #5B6FF6 100%)',
                        transform: 'scale(1.1)',
                        boxShadow: '0 0 30px rgba(91, 111, 246, 0.5)'
                    },
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                    width: 64,
                    height: 64,
                    zIndex: 10000,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <ChatIcon />
            </IconButton>
        );
    }

    return (
        <Paper
            elevation={24}
            sx={{
                position: 'fixed',
                bottom: 40,
                right: 40,
                width: 500, // Increased width
                height: 550, // Reverted height
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#0F172A',
                border: '1px solid rgba(91, 111, 246, 0.3)',
                borderRadius: '20px',
                overflow: 'hidden',
                zIndex: 10000,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
        >
            {/* Header */}
            <Box sx={{ 
                p: 2.5, 
                background: 'linear-gradient(90deg, #5B6FF6 0%, #7C5CFF 100%)', 
                color: '#fff', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PsychologyIcon sx={{ fontSize: 24 }} />
                    <Typography variant="h6" sx={{ fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: '1px' }}>CLINICAL ASSISTANT</Typography>
                </Box>
                <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: '#fff' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Messages */}
            <Box sx={{ flexGrow: 1, p: 2.5, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, backgroundColor: '#070B14' }}>
                {messages.map((msg, i) => (
                    <Box 
                        key={i} 
                        sx={{ 
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            backgroundColor: msg.role === 'user' ? '#5B6FF6' : 'rgba(255,255,255,0.03)',
                            color: '#fff',
                            p: 2,
                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                            boxShadow: msg.role === 'user' ? '0 4px 12px rgba(91, 111, 246, 0.2)' : 'none',
                            '& p': { margin: 0, mb: 1, fontFamily: 'Space Grotesk', fontSize: '0.9rem', lineHeight: 1.5 },
                            '& h3, & h4': { color: '#21D4BD', fontFamily: 'Rajdhani', fontWeight: 700, mt: 1, mb: 1, textTransform: 'uppercase', fontSize: '1rem' },
                            '& ul, & ol': { pl: 2, mb: 1 },
                            '& li': { mb: 0.5, fontFamily: 'Space Grotesk', fontSize: '0.85rem' },
                            '& strong': { color: '#00F0FF', fontWeight: 700 }
                        }}
                    >
                        {msg.role === 'assistant' ? (
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        ) : (
                            <Typography variant="body2" sx={{ fontFamily: 'Space Grotesk', lineHeight: 1.5, fontSize: '0.9rem' }}>{msg.content}</Typography>
                        )}
                    </Box>
                ))}
                {loading && (
                    <Box sx={{ alignSelf: 'flex-start', p: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CircularProgress size={16} sx={{ color: '#21D4BD' }} />
                        <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'Rajdhani', fontWeight: 600 }}>THINKING...</Typography>
                    </Box>
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2.5, backgroundColor: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Inquire about protocol deltas..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                            '&:hover fieldset': { borderColor: 'rgba(91, 111, 246, 0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#5B6FF6' }
                        },
                        '& .MuiInputBase-input': { fontFamily: 'Space Grotesk', fontSize: '0.9rem' }
                    }}
                />
                <IconButton 
                    type="submit" 
                    disabled={loading || !message.trim()} 
                    sx={{ 
                        backgroundColor: message.trim() ? '#5B6FF6' : 'transparent',
                        color: '#fff',
                        '&:hover': { backgroundColor: '#7C5CFF' },
                        '&.Mui-disabled': { color: 'rgba(255,255,255,0.1)' }
                    }}
                >
                    <SendIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Box>
        </Paper>
    );
};

export default TreatmentPlanChat;
