@echo off
REM Multi-Engine Document Processing Setup Script
REM Installs Python dependencies and downloads required models

echo 🚀 Setting up Multi-Engine Document Processing System
echo.

echo 📦 Installing Python dependencies...
pip install docling onnxruntime opencv-python numpy pillow

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python dependency installation failed
    echo Please install manually: pip install docling onnxruntime opencv-python numpy pillow
    pause
    exit /b 1
)

echo ✅ Python dependencies installed
echo.

echo 📥 Creating models directory...
if not exist "models" mkdir models

echo 📥 Downloading YOLO model for document layout analysis...
powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/ultralytics/yolov5/releases/download/v6.0/yolov5s.onnx' -OutFile 'models\yolo-doc.onnx'}"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ YOLO model download failed
    echo Please download manually from: https://github.com/ultralytics/yolov5/releases/download/v6.0/yolov5s.onnx
    echo Save as: models\yolo-doc.onnx
) else (
    echo ✅ YOLO model downloaded
)

echo.
echo 🔧 Configuration required:
echo 1. Set IBM Vision API credentials in .env:
echo    IBM_VISION_API_KEY=your_api_key
echo    IBM_VISION_SERVICE_URL=https://api.us-south.visual-recognition.watson.cloud.ibm.com
echo.
echo 2. For IBM Vision setup, visit: https://cloud.ibm.com/catalog/services/visual-recognition
echo.
echo 3. Test the system:
echo    npm run dev
echo    # Upload a document in the terminal chat
echo.

echo 🎯 Setup complete! Check DOCUMENT_PROCESSING_README.md for usage instructions.
pause