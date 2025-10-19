from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import fitz  # PyMuPDF
import os
import tempfile
import shutil
from typing import Dict, Optional
from pdf_processor import replace_numbers_in_pdf
from date_utils import generate_age_replacements

app = FastAPI(title="PDF Editor API", version="1.0.0")

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pdfer-flax.vercel.app", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temporary directory for file processing
TEMP_DIR = tempfile.mkdtemp()

# Store authenticated PDF documents in memory (in production, use a proper session store)
authenticated_docs = {}

@app.get("/")
async def root():
    return {"message": "PDF Editor API is running"}

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None)
):
    """Upload PDF and check if it's password protected"""
    if not file.filename or not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Save uploaded file temporarily
        temp_file_path = os.path.join(TEMP_DIR, file.filename)
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Check if PDF is password protected
        doc = fitz.open(temp_file_path)
        is_encrypted = doc.needs_pass
        
        print(f"PDF encrypted status: {is_encrypted}")
        if password:
            print(f"Password provided: {password}")
        
        if is_encrypted:
            if not password:
                doc.close()
                return {"encrypted": True, "message": "PDF is password protected"}
            
            # Try to authenticate with provided password
            auth_result = doc.authenticate(password)
            print(f"Authentication result: {auth_result}")
            if not auth_result:
                doc.close()
                raise HTTPException(status_code=401, detail="Invalid password")
            
            # Store the authenticated document for later use
            authenticated_docs[file.filename] = doc
            print(f"Stored authenticated document for {file.filename}")
        else:
            doc.close()
        
        return {"encrypted": is_encrypted, "filename": file.filename}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/process")
async def process_pdf(
    filename: str = Form(...),
    password: Optional[str] = Form(None),
    replacements: str = Form(...)  # JSON string of replacements
):
    """Process PDF with text replacements"""
    import json
    
    try:
        # Parse replacements JSON
        replacements_dict = json.loads(replacements)
        
        # Paths
        input_path = os.path.join(TEMP_DIR, filename)
        output_filename = f"modified_{filename}"
        output_path = os.path.join(TEMP_DIR, output_filename)
        
        # Check if we have an authenticated document
        doc = None
        doc_needs_cleanup = False
        if filename in authenticated_docs:
            doc = authenticated_docs[filename]
            doc_needs_cleanup = True  # Mark for cleanup after processing
            print(f"Using authenticated document for {filename}")
        elif password:
            # Authenticate if password provided but document not in cache
            print(f"Authenticating PDF with password: {password}")
            doc = fitz.open(input_path)
            auth_result = doc.authenticate(password)
            doc_needs_cleanup = True  # Mark for cleanup after processing
            print(f"Authentication result: {auth_result}")
            if not auth_result:
                doc.close()
                raise HTTPException(status_code=401, detail="Invalid password for processing")
        
        # Process PDF and get results
        result = replace_numbers_in_pdf(input_path, output_path, replacements_dict, doc)
        
        # Clean up authenticated document if we used one
        if doc_needs_cleanup and doc:
            try:
                # Only close if it's not in our authenticated_docs dict anymore
                # (replace_numbers_in_pdf only closes documents it opened itself)
                if filename in authenticated_docs:
                    authenticated_doc = authenticated_docs.pop(filename)
                    authenticated_doc.close()
                    print(f"Cleaned up authenticated document for {filename}")
            except Exception as cleanup_error:
                print(f"Warning: Error cleaning up document: {cleanup_error}")
        
        # Check if any replacements were actually made
        total_replacements = result.get("total_replacements", 0)
        replacement_details = result.get("replacement_details", {})
        
        # Prepare response with details
        response_data = {
            "success": True, 
            "filename": output_filename,
            "total_replacements": total_replacements,
            "replacement_details": replacement_details
        }
        
        # If no replacements were made, include a warning
        if total_replacements == 0:
            response_data["warning"] = "No replacements were made. Please check if the numbers exist in the PDF."
        
        return response_data
        
    except Exception as e:
        # Clean up authenticated document if it exists
        if filename in authenticated_docs:
            try:
                authenticated_doc = authenticated_docs.pop(filename)
                authenticated_doc.close()
            except Exception as cleanup_error:
                print(f"Warning: Error cleaning up document: {cleanup_error}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/make-21-plus")
async def make_21_plus(
    filename: str = Form(...),
    password: Optional[str] = Form(None)
):
    """Automatically make all people in the PDF appear 21+ years old"""
    try:
        # Paths
        input_path = os.path.join(TEMP_DIR, filename)
        output_filename = f"21plus_{filename}"
        output_path = os.path.join(TEMP_DIR, output_filename)
        
        # Check if we have an authenticated document
        doc = None
        doc_needs_cleanup = False
        if filename in authenticated_docs:
            doc = authenticated_docs[filename]
            doc_needs_cleanup = True  # Mark for cleanup after processing
            print(f"Using authenticated document for {filename}")
        elif password:
            # Authenticate if password provided but document not in cache
            print(f"Authenticating PDF with password: {password}")
            doc = fitz.open(input_path)
            auth_result = doc.authenticate(password)
            doc_needs_cleanup = True  # Mark for cleanup after processing
            print(f"Authentication result: {auth_result}")
            if not auth_result:
                doc.close()
                raise HTTPException(status_code=401, detail="Invalid password for processing")
        
        # If we don't have an authenticated doc, open normally
        if doc is None:
            doc = fitz.open(input_path)
            doc_needs_cleanup = True  # Mark for cleanup after processing
        
        # Extract all text from the PDF to find potential dates
        all_text = ""
        for page_num in range(len(doc)):
            page = doc[page_num]
            all_text += str(page.get_text())
        
        # Generate replacements to make everyone 21+
        replacements_dict = generate_age_replacements(all_text, target_age=21)
        
        if not replacements_dict:
            # Save the PDF (possibly unlocked) and return
            doc.save(output_path)
            # Clean up document if needed
            if doc_needs_cleanup:
                try:
                    if filename in authenticated_docs:
                        authenticated_doc = authenticated_docs.pop(filename)
                        authenticated_doc.close()
                    else:
                        doc.close()
                except Exception as cleanup_error:
                    print(f"Warning: Error cleaning up document: {cleanup_error}")
            
            return {
                "success": True,
                "filename": output_filename,
                "message": "No dates found to modify. PDF has been processed.",
                "total_replacements": 0,
                "replacements_made": []
            }
        
        # Process PDF with the generated replacements
        # Note: We pass the doc to reuse the authenticated instance
        result = replace_numbers_in_pdf(input_path, output_path, replacements_dict, doc)
        
        # Clean up document if needed
        if doc_needs_cleanup:
            try:
                if filename in authenticated_docs:
                    authenticated_doc = authenticated_docs.pop(filename)
                    authenticated_doc.close()
                else:
                    doc.close()
            except Exception as cleanup_error:
                print(f"Warning: Error cleaning up document: {cleanup_error}")
        
        # Return detailed results
        total_replacements = result.get("total_replacements", 0)
        replacement_details = result.get("replacement_details", {})
        
        response_data = {
            "success": True,
            "filename": output_filename,
            "message": f"Made {len(replacements_dict)} date changes to ensure all individuals are 21+",
            "total_replacements": total_replacements,
            "replacements_made": list(replacements_dict.items())
        }
        
        return response_data
        
    except Exception as e:
        # Clean up authenticated document if it exists
        if filename in authenticated_docs:
            try:
                authenticated_doc = authenticated_docs.pop(filename)
                authenticated_doc.close()
            except Exception as cleanup_error:
                print(f"Warning: Error cleaning up document: {cleanup_error}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.get("/download/{filename}")
async def download_pdf(filename: str):
    """Download processed PDF"""
    file_path = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/pdf'
    )

@app.on_event("shutdown")
def cleanup_temp_dir():
    """Clean up temporary files on shutdown"""
    # Clean up any remaining authenticated documents
    for filename, doc in authenticated_docs.items():
        try:
            doc.close()
        except:
            pass
    authenticated_docs.clear()
    
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)