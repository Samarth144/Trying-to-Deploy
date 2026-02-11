import React, { useState, useRef, useContext, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import * as faceapi from 'face-api.js';

const FaceRegisterPage = () => {
    const webcamRef = useRef(null);
    const [message, setMessage] = useState('Position your face in the center of the frame.');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models'; // Models in public/models directory
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                console.log('Frontend face-api models loaded for registration.');
            } catch (e) {
                setError('Could not load face recognition models.');
                console.error('Model loading error:', e);
            }
        };
        loadModels();
    }, []);

    const handleCapture = async () => {
        if (!webcamRef.current || !modelsLoaded) {
            setError('Webcam not ready or models are still loading.');
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
            setError('No face detected or could not process face. Please try again.');
            setLoading(false);
            return;
        }

        setMessage('Face detected. Registering...');
        const descriptor = detection.descriptor;

        try {
            // The AuthContext sets the authorization header globally
            const res = await axios.post('/api/face-auth/register', { descriptor });
            setMessage(res.data.message || 'Face registered successfully!');
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred during face registration.');
            setMessage('');
        } finally {
            setLoading(false);
        }
    };

    if (!user || user.role !== 'oncologist') {
        return (
            <div style={styles.container}>
                <h2>Face Registration Denied</h2>
                <p>This feature is available only for registered doctors.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2>Doctor Face Registration</h2>
            <p>This will register your face for quick and secure login.</p>
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
            <button onClick={handleCapture} disabled={loading || !modelsLoaded} style={styles.button}>
                {loading ? message : 'Capture and Register Face'}
            </button>
            {message && !loading && <p style={styles.message}>{message}</p>}
            {error && <p style={styles.error}>{error}</p>}
            {!modelsLoaded && <p>Loading face models, please wait...</p>}
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

export default FaceRegisterPage;