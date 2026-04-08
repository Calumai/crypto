@echo off
cd /d "%~dp0backend"
echo Starting Crypto Trader Backend...
echo.
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo Installing dependencies...
pip install -r requirements.txt -q
echo.
echo Generating encryption key (if not set)...
python -c "import os; from dotenv import dotenv_values; v=dotenv_values('.env'); key=v.get('ENCRYPTION_KEY',''); print('Encryption key already set.' if key else 'Set ENCRYPTION_KEY in .env!'); print('Run: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"') if not key else None"
echo.
echo Starting server at http://localhost:8000
python run.py
pause
