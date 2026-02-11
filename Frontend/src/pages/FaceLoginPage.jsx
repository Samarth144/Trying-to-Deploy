import React, { useState, useRef, useContext, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import * as faceapi from 'face-api.js';
import { useNavigate } from 'react-router-dom';

const FaceLoginPage = () => {
    const webcamRef = useRef(null);
    const [message, setMessage] = useState('Please wait, loading models and user data...');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [faceMatcher, setFaceMatcher] = useState(null);
    const { setAuthData } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const setupFaceMatcher = async () => {
            const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
            try {
                // Load face-api models
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                // Fetch doctor descriptors from the backend
                const { data } = await axios.get('/face-auth/descriptors');
                if (!data.success || data.data.length === 0) {
                    setError('No doctors have registered for face login.');
                    setLoading(false);
                    return;
                }

                const labeledFaceDescriptors = data.data.map(doc => {
                    const descriptors = doc.descriptors.map(d => new Float32Array(d));
                    // The label for each descriptor set is the doctor's user ID
                    return new faceapi.LabeledFaceDescriptors(doc.userId, descriptors);
                });

                const matcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.4); // 0.4 is the distance threshold
                setFaceMatcher(matcher);
                setMessage('Ready to scan your face.');

            } catch (e) {
                setError('Error setting up face login. Please try again later.');
                console.error('Setup error:', e);
            } finally {
                setLoading(false);
            }
        };
        setupFaceMatcher();
    }, []);

    const handleLogin = async () => {
        if (!webcamRef.current || !faceMatcher) {
            setError('Webcam not ready or face matcher not loaded.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('Detecting face...');

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setError('Could not capture image.');
            setLoading(false);
            return;
        }

        const img = await faceapi.fetchImage(imageSrc);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
            setError('No face detected. Please try again.');
            setLoading(false);
            return;
        }

        setMessage('Face detected, verifying...');
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

        if (bestMatch.label === 'unknown') {
            setError('Face not recognized. Please ensure you have registered your face.');
            setLoading(false);
            return;
        }

        // The label is the userId
        const userId = bestMatch.label;
        setMessage('Face recognized! Logging in...');

        try {
            const { data } = await axios.post('/face-auth/generate-token', { userId });
            setAuthData(data.data);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred during login.');
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2>Doctor Face Login</h2>
            <div style={styles.webcamContainer}>
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width={500}
                    height={500}
                    videoConstraints={{ facingMode: 'user' }}
                />
            </div>
            <button onClick={handleLogin} disabled={loading || !faceMatcher} style={styles.button}>
                {loading ? message : 'Login with Face'}
            </button>
            {message && !loading && <p style={styles.message}>{message}</p>}
            {error && <p style={styles.error}>{error}</p>}
        </div>
    );
};

const styles = {
    container: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', fontFamily: 'sans-serif' },
    webcamContainer: { margin: '1rem 0', border: '2px solid #ccc', borderRadius: '8px', overflow: 'hidden' },
    button: { padding: '10px 20px', fontSize: '1rem', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', minWidth: '220px' },
    message: { color: 'green', marginTop: '1rem' },
    error: { color: 'red', marginTop: '1rem' }
};

export default FaceLoginPage;