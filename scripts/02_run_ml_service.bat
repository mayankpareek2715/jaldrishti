@echo off
REM JalDrishti - starts the Python FastAPI AI/ML microservice on port 8000.
cd /d "%~dp0..\ml-service"

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat

echo Installing dependencies (first run only, may take a few minutes)...
pip install -r requirements.txt

echo Building the training dataset...
cd model
python build_training_dataset.py

echo Training the model (XGBoost + Logistic Regression baseline)...
python train.py
cd ..

echo Starting FastAPI service on http://localhost:8000 ...
uvicorn main:app --reload --port 8000
