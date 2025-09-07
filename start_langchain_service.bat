@echo off
echo Starting LangChain RAG Service...
echo.

echo Installing dependencies...
cd langchain-rag-service
pip install -r requirements.txt

echo.
echo Starting service on port 9004...
python main.py

pause