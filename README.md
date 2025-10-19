# PDF Editor (pdfer)

A web-based application for editing PDF documents by replacing text content. This tool allows users to upload PDF files, replace specific text/numbers while preserving original formatting, and download the modified document. Perfect for making quick edits to PDFs without complex software installations.

## Features

- Upload PDF files via drag-and-drop or file browser
- Detect password-protected PDFs and prompt for password
- Replace specific text or numbers throughout the document
- Auto-adjust birth years to make all individuals appear 21+ years old
- Manual text replacement mode for custom edits
- Maintain original formatting, fonts, and colors
- Download modified PDF files
- Responsive design that works on desktop and mobile devices

## Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **PyMuPDF (fitz)**: PDF processing library
- **Python 3.12+**: Programming language
- **uv**: Python package manager and runner

### Frontend
- **React**: JavaScript library for building user interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Next-generation frontend tooling

## Project Structure

```
pdfer/
├── backend/              # FastAPI backend
│   ├── main.py          # API endpoints
│   ├── pdf_processor.py # PDF processing logic
│   ├── date_utils.py    # Date processing utilities
│   └── requirements.txt # Python dependencies
├── frontend/            # React frontend
│   ├── public/
│   │   └── icons/
│   │       └── favicon.jpg  # Application favicon
│   ├── src/
│   │   ├── components/
│   │   │   └── PDFUpload.jsx # Main PDF upload component
│   │   └── ...
│   ├── package.json
│   └── ...
└── README.md
```

## Local Development Setup

### Prerequisites
- Python 3.12+
- Node.js 16+
- uv (for Python package management)
- Noto Fonts (for Tamil text support in PDFs) - Install with: `sudo apt install fonts-noto` or equivalent for your OS

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   uv pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   uv run uvicorn main:app --reload
   ```

   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## Usage

1. Open the application in your browser (http://localhost:3000)
2. Upload a PDF file using drag-and-drop or the file browser
3. If the PDF is password-protected, enter the password when prompted
4. Choose between two editing modes:
   - **Auto Age Adjustment**: Automatically adjust birth years to ensure all individuals appear 21+ years old
   - **Manual Mode**: Add custom text replacements:
     - Enter the text you want to replace in the "Number to Replace" field
     - Enter the new text in the "New Number" field
     - Add additional replacements as needed
5. Click "Process PDF" or "Click to adjust Age" to apply the changes
6. Download your modified PDF when processing is complete

## Deployment

### Backend Deployment Options

1. **Railway.app**:
   - Free tier available
   - Easy deployment with GitHub integration
   - Automatic SSL certificates

2. **Render.com**:
   - Free tier with some limitations
   - Simple deployment process
   - Custom domains supported

3. **Self-hosted**:
   - Deploy on any cloud provider (AWS, DigitalOcean, etc.)
   - Use Docker for containerized deployment
   - Full control over resources and scaling

### Frontend Deployment

1. **Vercel** (Recommended):
   - Free hosting for static sites
   - Automatic deployments from GitHub
   - Global CDN distribution
   - Zero-configuration deployment

2. **Netlify**:
   - Free tier available
   - Continuous deployment
   - Built-in form handling

## Environment Variables

For production deployment, set the following environment variables:

Frontend:
- `VITE_BACKEND_URL`: URL of the deployed backend API (optional, defaults to relative paths)

Backend:
- No special environment variables required for basic operation

Example `.env.production` for frontend:
```
VITE_BACKEND_URL=https://your-backend-url.com
```

## API Endpoints

### Backend API (http://localhost:8000/docs for full documentation)

- `POST /upload` - Upload and check PDF
- `POST /process` - Process PDF with text replacements
- `POST /make-21-plus` - Automatically adjust ages to make all individuals 21+
- `GET /download/{filename}` - Download processed PDF

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on the GitHub repository or contact the maintainers.