import React, { useState, useRef } from "react";

const PDFUpload = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [replacements, setReplacements] = useState([{ from: "", to: "" }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMaking21Plus, setIsMaking21Plus] = useState(false);
  const [processedFile, setProcessedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [showManualMode, setShowManualMode] = useState(false);
  const fileInputRef = useRef(null);

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError("");

      // Reset state
      setIsEncrypted(false);
      setPassword("");
      setReplacements([{ from: "", to: "" }]);
      setProcessedFile(null);

      // Upload file to check if it's encrypted
      uploadFile(selectedFile);
    } else {
      setError("Please select a valid PDF file.");
    }
  };

  const uploadFile = async (fileToUpload) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (response.ok) {
        const data = await response.json();
        if (data.encrypted) {
          setIsEncrypted(true);
        } else {
          // File is not encrypted, proceed to replacements
          setIsEncrypted(false);
        }
      } else {
        try {
          const errorData = await response.json();
          setError(errorData.detail || "Failed to upload file");
        } catch (jsonError) {
          // If we can't parse the JSON error response, show a generic error
          setError("Failed to upload file. Server returned an error.");
        }
      }
    } catch (err) {
      setError(
        "Failed to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);

    try {
      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.filename) {
          // If we got a filename back, the authentication was successful
          setIsEncrypted(false);
          // Update the filename to the unlocked file
          setFileName(data.filename);
        } else {
          setError("Invalid password. Please try again.");
        }
      } else {
        try {
          const errorData = await response.json();
          setError(errorData.detail || "Failed to validate password");
        } catch (jsonError) {
          // If we can't parse the JSON error response, show a generic error
          setError("Failed to validate password. Server returned an error.");
        }
      }
    } catch (err) {
      setError(
        "Failed to connect to the server. Please make sure the backend is running.",
      );
    }
  };

  const addReplacement = () => {
    setReplacements([...replacements, { from: "", to: "" }]);
  };

  const updateReplacement = (index, field, value) => {
    const updatedReplacements = [...replacements];
    updatedReplacements[index][field] = value;
    setReplacements(updatedReplacements);
  };

  const removeReplacement = (index) => {
    if (replacements.length > 1) {
      const updatedReplacements = replacements.filter((_, i) => i !== index);
      setReplacements(updatedReplacements);
    }
  };

  const handleProcessPDF = async () => {
    if (replacements.some((r) => !r.from.trim())) {
      setError('Please fill in all "Number to Replace" fields');
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // Prepare replacements object
      const replacementsObj = {};
      replacements.forEach((r) => {
        if (r.from.trim()) {
          replacementsObj[r.from.trim()] = r.to.trim();
        }
      });

      const formData = new FormData();
      formData.append("filename", fileName);
      // Note: After unlocking, isEncrypted is false but we might still need password
      // for subsequent operations. We'll include it if we have it.
      if (password) {
        formData.append("password", password);
      }
      formData.append("replacements", JSON.stringify(replacementsObj));

      const response = await fetch(`${BACKEND_URL}/process`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProcessedFile(data.filename);

        // Build detailed message based on replacement results
        if (data.total_replacements === 0) {
          // Check which numbers were not found
          const notFoundNumbers = [];
          Object.entries(data.replacement_details).forEach(
            ([number, details]) => {
              if (!details.found || details.count === 0) {
                notFoundNumbers.push(number);
              }
            },
          );

          if (notFoundNumbers.length > 0) {
            setError(
              `Numbers not found in PDF: ${notFoundNumbers.join(", ")}. Please check if these numbers exist in the document.`,
            );
          } else {
            setError(
              "No numbers were found and replaced. Please check if the numbers exist in the PDF.",
            );
          }
        } else {
          // Show success message with detailed replacement count
          const foundNumbers = [];
          const notFoundNumbers = [];

          Object.entries(data.replacement_details).forEach(
            ([number, details]) => {
              if (details.found && details.count > 0) {
                foundNumbers.push(`${number} (${details.count} found)`);
              } else {
                notFoundNumbers.push(number);
              }
            },
          );

          let message = `Successfully replaced ${data.total_replacements} number(s) in the PDF.`;

          if (foundNumbers.length > 0) {
            message += ` Found: ${foundNumbers.join(", ")}.`;
          }

          if (notFoundNumbers.length > 0) {
            message += ` Not found: ${notFoundNumbers.join(", ")}.`;
          }

          setError(message);
        }
      } else {
        try {
          const errorData = await response.json();
          setError(errorData.detail || "Failed to process PDF");
        } catch (jsonError) {
          // If we can't parse the JSON error response, show a generic error
          setError("Failed to process PDF. Server returned an error.");
        }
      }
    } catch (err) {
      setError(
        "Failed to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/download/${processedFile}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = processedFile;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Failed to download file");
      }
    } catch (err) {
      setError("Failed to download file");
    }
  };

  const handleMake21Plus = async () => {
    setIsMaking21Plus(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("filename", fileName);
      // Note: After unlocking, isEncrypted is false but we might still need password
      // for subsequent operations. We'll include it if we have it.
      if (password) {
        formData.append("password", password);
      }

      const response = await fetch(`${BACKEND_URL}/make-21-plus`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProcessedFile(data.filename);

        if (data.message) {
          setError(data.message);
        }

        if (data.total_replacements === 0 && !data.message) {
          setError("No dates were found to modify. Original PDF returned.");
        }
      } else {
        try {
          const errorData = await response.json();
          setError(
            errorData.detail || "Failed to process PDF for 21+ conversion",
          );
        } catch (jsonError) {
          // If we can't parse the JSON error response, show a generic error
          setError("Failed to process PDF for 21+ conversion. Server returned an error.");
        }
      }
    } catch (err) {
      setError(
        "Failed to connect to the server. Please make sure the backend is running.",
      );
    } finally {
      setIsMaking21Plus(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <svg
              className="w-12 h-12 text-light-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            <p className="text-lg font-medium text-light-300">
              Drag & drop your PDF file here
            </p>
            <p className="text-light-500">or</p>
            <button className="btn-primary">Browse Files</button>
            <p className="text-sm text-light-500">Supports PDF files only</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,application/pdf"
            onChange={(e) =>
              e.target.files[0] && handleFileSelect(e.target.files[0])
            }
          />
        </div>
      ) : (
        <div className="border border-dark-700 rounded-lg p-6 bg-dark-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 min-w-0">
              <svg
                className="w-8 h-8 text-light-900 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              <div className="min-w-0">
                <p className="font-medium text-light-900 truncate" title={fileName}>
                  {fileName}
                </p>
                <p className="text-sm text-light-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setFileName("");
                setIsEncrypted(false);
                setPassword("");
                setReplacements([{ from: "", to: "" }]);
                setProcessedFile(null);
                setError("");
                setShowManualMode(false);
              }}
              className="text-light-400 hover:text-light-300"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          {isUploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-light-500 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          className={`rounded-md p-4 border ${
            error.includes("Success") ||
            error.includes("Successfully") ||
            error.includes("No numbers were found") ||
            error.includes("No dates found") ||
            error.includes("Original PDF returned") ||
            error.startsWith("Made ")
              ? "bg-dark-800 border-dark-600"
              : "bg-red-900 border-red-800"
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {error.includes("Success") ||
              error.includes("Successfully") ||
              error.includes("No numbers were found") ||
              error.includes("No dates found") ||
              error.includes("Original PDF returned") ||
              error.startsWith("Made ") ? (
                <svg
                  className="h-5 w-5 text-light-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3
                className={`text-sm font-medium ${
                  error.includes("Success") ||
                  error.includes("Successfully") ||
                  error.startsWith("Made ")
                    ? "text-green-400"
                    : error.includes("No numbers were found") ||
                        error.includes("No dates found") ||
                        error.includes("Original PDF returned")
                      ? "text-yellow-400"
                      : "text-red-300"
                }`}
              >
                {error}
              </h3>
            </div>
          </div>
        </div>
      )}

      {isEncrypted && (
        <div className="border border-dark-600 rounded-lg bg-dark-800 p-6">
          <h3 className="text-lg font-medium text-light-900 mb-4">
            Password Protected PDF
          </h3>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-light-300"
              >
                Enter Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter PDF password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5 text-light-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-light-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                        clipRule="evenodd"
                      />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary">
              Unlock PDF
            </button>
          </form>
        </div>
      )}

{file && !isUploading && !isEncrypted && !processedFile && (
        <div className="border border-dark-700 rounded-lg p-6 bg-dark-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-light-900">Auto Age Adjustment</h3>
            <button
              onClick={() => setShowManualMode(!showManualMode)}
              className="text-sm text-light-400 hover:text-light-300"
            >
              {showManualMode ? 'Use Auto Mode' : 'Use Manual Mode'}
            </button>
          </div>
          
          {!showManualMode ? (
            <div className="space-y-4">
              <p className="text-light-400">
                Automatically adjust birth years to ensure all individuals appear 21+ years old.
              </p>
              <button
                onClick={handleMake21Plus}
                disabled={isMaking21Plus}
                className={isMaking21Plus ? 'btn-disabled' : 'btn-primary'}
              >
                {isMaking21Plus ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-dark-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Click to adjust Age'
                )}
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-medium text-light-900 mb-4">Manual Number Replacements</h3>
              
              <div className="space-y-4">
                {replacements.map((replacement, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-sm font-medium text-light-300 mb-1">
                        Number to Replace
                      </label>
                      <input
                        type="text"
                        value={replacement.from}
                        onChange={(e) => updateReplacement(index, 'from', e.target.value)}
                        className="input-field"
                        placeholder="Number to replace (e.g., 2024)"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <label className="block text-sm font-medium text-light-300 mb-1">
                        New Number
                      </label>
                      <input
                        type="text"
                        value={replacement.to}
                        onChange={(e) => updateReplacement(index, 'to', e.target.value)}
                        className="input-field"
                        placeholder="Replacement number (e.g., 2025)"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      {replacements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReplacement(index)}
                          className="w-full inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-dark-600 text-sm font-medium rounded-md text-light-300 bg-dark-700 hover:bg-dark-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addReplacement}
                  className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 border border-dark-600 text-sm font-medium rounded-md text-light-300 bg-dark-700 hover:bg-dark-600"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-light-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Another Replacement
                </button>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={handleProcessPDF}
                  disabled={isProcessing}
                  className={isProcessing ? 'btn-disabled' : 'btn-primary'}
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-dark-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Process PDF Manually'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {processedFile && (
        <div className="border border-dark-600 rounded-lg bg-dark-800 p-6">
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-medium text-light-900">PDF Processed Successfully!</h3>
          </div>
          <p className="text-light-400 mb-4">Your modified PDF is ready for download.</p>
          <button
            onClick={downloadFile}
            className="btn-primary w-full sm:w-auto"
          >
            <svg className="-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download Modified PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
