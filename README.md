# RESONANCE - AI-Driven Personalized Cancer Treatment Planning System

A comprehensive full-stack application for personalized cancer treatment planning using multimodal AI analysis.

## 🚀 Features

- **Multimodal AI Analysis**: MRI segmentation, genomic biomarker interpretation, and histopathology NLP
- **Treatment Optimization**: Evidence-based protocol recommendations aligned with NCCN/EANO guidelines
- **Outcome Prediction**: Survival forecasting (OS/PFS) and side-effect risk modeling
- **3D Visualization**: Interactive tumor visualization with AR/VR support
- **Explainable AI**: SHAP-based feature importance and Grad-CAM visualizations
- **Blockchain Audit Trail**: Immutable record keeping with data provenance tracking
- **Role-Based Access Control**: Separate interfaces for oncologists, patients, and researchers

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/)
- **npm** (comes with Node.js)

## 🛠️ Installation & Setup

The project is divided into three main components: Backend, Frontend, and AI Engine.

### 1. Database Setup

1. Install PostgreSQL.
2. Create a database named `Resonance`:
   ```sql
   CREATE DATABASE Resonance;
   ```
   *Note: Default credentials assumed are user `postgres` with password `postgres` on `localhost:5432`. You can configure this in `Backend/.env`.*

### 2. AI Engine Setup (Python)

Navigate to the `ai_engine` directory to set up the Python environment.

```bash
cd ai_engine
```

**Create a Virtual Environment (Optional but recommended):**
```bash
python -m venv venv
# Windows
virtualenv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

**Install Dependencies:**
```bash
pip install -r requirements.txt
```

**Start the AI Engine:**
```bash
python app.py
```
*The AI Engine runs on **http://localhost:5000**.*

### 3. Backend Setup (Node.js)

Open a new terminal and navigate to the `Backend` directory.

```bash
cd Backend
```

**Install Dependencies:**
```bash
npm install
```

**Configure Environment Variables:**
Create a `.env` file in the `Backend` directory (or modify the existing one):
```env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/Resonance
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d
```

**Start the Backend:**
```bash
npm run dev
```
*The Backend API runs on **http://localhost:8000**.*

### 4. Frontend Setup (React)

Open a new terminal and navigate to the `Frontend` directory.

```bash
cd Frontend
```

**Install Dependencies:**
```bash
npm install
```

**Start the Development Server:**
```bash
npm run dev
```
*The Frontend runs on **http://localhost:5173** (typically).*

## 🚀 Running the Application

Once all three services are running:

1.  **AI Engine**: Handles inference and RAG (Port 5000).
2.  **Backend**: Handles API requests, auth, and database (Port 8000).
3.  **Frontend**: The user interface (Port 5173).

Access the application at: **http://localhost:5173**

## 📁 Project Structure

```
D:\Projects\AI-Driven-Personalized-Cancer-Treatment-Planning-System\
├── ai_engine/                # Python-based AI Analysis Engine (Flask)
│   ├── app.py                # Main entry point
│   ├── config/               # Configuration files
│   ├── knowledge_base/       # Medical knowledge base (JSON)
│   ├── rag/                  # Retrieval-Augmented Generation logic
│   ├── rule_engine/          # Rule-based decision logic
│   └── ...
├── Backend/                  # Node.js/Express Backend
│   ├── server.js             # Main entry point
│   ├── config/               # DB configuration (PostgreSQL)
│   ├── controllers/          # Request handlers
│   ├── models/               # Sequelize models (User, Patient, etc.)
│   ├── routes/               # API routes
│   └── ...
├── Frontend/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   └── vite.config.js
├── Segmentation Model/       # Independent segmentation model files
└── reports/                  # Generated PDF reports
```

## 🔌 API Endpoints (Backend)

The Backend API (`http://localhost:8000/api`) provides the following routes:

- **Auth**: `/api/auth` (Register, Login)
- **Patients**: `/api/patients` (CRUD)
- **Analyses**: `/api/analyses` (Trigger AI analysis)
- **Treatments**: `/api/treatments` (Get treatment plans)
- **Outcomes**: `/api/outcomes` (Prediction data)
- **Dashboard**: `/api/dashboard` (Stats)
- **Uploads**: `/api/uploads` (File handling)

## 👤 User Accounts

1.  Navigate to the Frontend URL.
2.  Register a new account.
3.  Login to access the dashboard.

## 📝 Development Notes

-   **Database**: The project uses **PostgreSQL** via **Sequelize** ORM. Ensure your Postgres service is running.
-   **AI Integration**: The Backend communicates with the AI Engine. Ensure `ai_engine/app.py` is running to process analysis requests.
-   **Files**: Uploaded files are stored in `Backend/uploads`.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch.
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

## 📄 License

MIT License