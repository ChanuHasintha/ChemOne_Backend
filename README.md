# ChemBridge Backend ⚙️

The robust server-side engine for the ChemBridge platform, providing secure APIs, AI-powered features, and data management. Built with Node.js, Express, and MongoDB.

## 🚀 Key Modules

### 🔐 Authentication & Security
- **JWT Auth**: Secure user authentication and session management.
- **Role-Based Access**: Specialized endpoints for Students and Admins.
- **Bcrypt**: Industrial-strength password hashing.

### 🤖 AI & RAG (Retrieval-Augmented Generation)
- **Gemini AI**: Integrated with Google's Generative AI for intelligent tutoring and chatbots.
- **Pinecone**: Vector database for efficient semantic search and knowledge retrieval.
- **PDF Processing**: Automated extraction and processing of chemistry content from PDF documents.

### 📊 Data & Storage
- **MongoDB**: Scalable NoSQL database for student records, tests, and platform data.
- **Google Cloud Storage**: Secure cloud storage for documents and assets.
- **Multer**: Robust handling of multipart/form-data for file uploads.

### 📧 Communications
- **Email Services**: Automated notifications for exam results and password resets via Gmail/Nodemailer.

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **Vector DB**: [Pinecone](https://www.pinecone.io/)
- **AI**: [Google Generative AI](https://ai.google.dev/)
- **Cloud**: [Google Cloud Platform](https://cloud.google.com/) (Storage, OAuth2)

## 📋 Prerequisites

- **Node.js**: v20.0.0 or higher
- **MongoDB**: A running instance (Atlas or local)

## ⚙️ Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ChemOne/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key
   GMAIL_USER=your_email
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   GCS_BUCKET_NAME=...
   GCS_PROJECT_ID=...
   GCS_KEY_FILE=./serviceAccountKey.json
   PINECONE_API_KEY=...
   GEMINI_API_KEY=...
   ```

4. **Start the Server**
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

## 📂 Project Structure

```text
src/
├── config/       # Database and Cloud configurations
├── controllers/  # Request handlers and business logic
├── middleware/   # Auth, role checks, and error handling
├── models/       # Mongoose schemas (User, Test, Result, etc.)
├── routes/       # API route definitions
├── utils/        # Helper functions and AI/Email services
├── app.js        # Express application setup
└── server.js     # Entry point
```

## 📡 API Endpoints (Brief)

- `/api/auth`: Signup, Login, Profile.
- `/api/admin`: Dashboard stats, student management.
- `/api/chat`: AI query and knowledge retrieval.
- `/api/spot`: Spot test creation and management.
- `/api/worksheet`: Daily worksheet operations.
- `/api/physical-exam`: Result processing and notifications.

---

