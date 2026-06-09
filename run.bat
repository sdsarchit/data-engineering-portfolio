@echo off
title Data Engineering Portfolio Launcher
echo =====================================================================
echo          ARCHIT SOMAYAJULA DATA ENGINEERING PORTFOLIO LAUNCHER
echo =====================================================================
echo.

cd /d "%~dp0"

rem [1/4] Detecting Python & Environment manager...
echo Detecting environment manager...

set "CONDA_ACTIVATE_PATH="
set "PYTHON_EXEC="

rem Check standard Windows installation directories for Anaconda/Miniconda
if exist "%USERPROFILE%\anaconda3\Scripts\activate.bat" (
    set "CONDA_ACTIVATE_PATH=%USERPROFILE%\anaconda3\Scripts\activate.bat"
    set "PYTHON_EXEC=%USERPROFILE%\anaconda3\envs\de_portfolio\python.exe"
    echo [Conda Located at %USERPROFILE%\anaconda3]
    goto setup_conda
)
if exist "%USERPROFILE%\miniconda3\Scripts\activate.bat" (
    set "CONDA_ACTIVATE_PATH=%USERPROFILE%\miniconda3\Scripts\activate.bat"
    set "PYTHON_EXEC=%USERPROFILE%\miniconda3\envs\de_portfolio\python.exe"
    echo [Conda Located at %USERPROFILE%\miniconda3]
    goto setup_conda
)
if exist "%USERPROFILE%\AppData\Local\anaconda3\Scripts\activate.bat" (
    set "CONDA_ACTIVATE_PATH=%USERPROFILE%\AppData\Local\anaconda3\Scripts\activate.bat"
    set "PYTHON_EXEC=%USERPROFILE%\AppData\Local\anaconda3\envs\de_portfolio\python.exe"
    echo [Conda Located in Local AppData Anaconda]
    goto setup_conda
)
if exist "%USERPROFILE%\AppData\Local\miniconda3\Scripts\activate.bat" (
    set "CONDA_ACTIVATE_PATH=%USERPROFILE%\AppData\Local\miniconda3\Scripts\activate.bat"
    set "PYTHON_EXEC=%USERPROFILE%\AppData\Local\miniconda3\envs\de_portfolio\python.exe"
    echo [Conda Located in Local AppData Miniconda]
    goto setup_conda
)
if exist "C:\ProgramData\anaconda3\Scripts\activate.bat" (
    set "CONDA_ACTIVATE_PATH=C:\ProgramData\anaconda3\Scripts\activate.bat"
    set "PYTHON_EXEC=C:\ProgramData\anaconda3\envs\de_portfolio\python.exe"
    echo [Conda Located in ProgramData Anaconda]
    goto setup_conda
)
if exist "C:\ProgramData\miniconda3\Scripts\activate.bat" (
    set "CONDA_ACTIVATE_PATH=C:\ProgramData\miniconda3\Scripts\activate.bat"
    set "PYTHON_EXEC=C:\ProgramData\miniconda3\envs\de_portfolio\python.exe"
    echo [Conda Located in ProgramData Miniconda]
    goto setup_conda
)

rem Check if conda is globally in PATH and try to locate its activate.bat
where conda >nul 2>nul
if %errorlevel% equ 0 goto conda_in_path

goto conda_not_found

:conda_in_path
echo [Conda Detected in PATH]
set "CONDA_ACTIVATE_PATH=conda.bat activate"
goto setup_conda


:setup_conda
echo Setting up Conda environment...
if "%CONDA_ACTIVATE_PATH%"=="conda.bat activate" (
    call conda env list | findstr "de_portfolio" >nul
) else (
    rem Resolve canonical absolute paths for conda executable and condabin folder
    for %%i in ("%CONDA_ACTIVATE_PATH%\..\..") do set "CONDA_ROOT_DIR=%%~fpi"
    
    rem Set PATH using absolute directories to prevent relative dot-dot resolution issues in Windows
    set "PATH=%CONDA_ROOT_DIR%\Scripts;%CONDA_ROOT_DIR%\condabin;%CONDA_ROOT_DIR%;%PATH%"
    call conda env list | findstr "de_portfolio" >nul
)

if %errorlevel% neq 0 goto create_conda_env
echo Existing Conda environment 'de_portfolio' found.
goto activate_conda_env

:create_conda_env
echo Creating new Conda environment 'de_portfolio' (Python 3.12)...
call conda create -y -n de_portfolio python=3.12
goto activate_conda_env

:activate_conda_env
echo Activating Conda environment de_portfolio...
if "%CONDA_ACTIVATE_PATH%"=="conda.bat activate" (
    call conda activate de_portfolio
    rem Once activated, CONDA_PREFIX is set to absolute environment path
    set "PYTHON_EXEC=%CONDA_PREFIX%\python.exe"
) else (
    call "%CONDA_ACTIVATE_PATH%" de_portfolio
)
goto install_dependencies


:conda_not_found
echo [Conda Not Found] Falling back to standard Python Virtualenv (.venv)...
set "PYTHON_EXEC=.venv\Scripts\python.exe"
if not exist .venv goto create_venv
echo Existing virtual environment (.venv) found.
goto activate_venv

:create_venv
echo Creating new virtual environment in .venv...
python -m venv .venv
goto activate_venv

:activate_venv
echo Activating virtual environment (.venv)...
call .venv\Scripts\activate.bat
goto install_dependencies


:install_dependencies
echo.
echo [2/4] Installing dependencies...
echo Installing dependencies from backend\requirements.txt...
"%PYTHON_EXEC%" -m pip install --upgrade pip
"%PYTHON_EXEC%" -m pip install -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo WARNING: Dependency installation encountered errors.
)

echo.
echo [3/4] Starting Full-Stack Local Servers...
echo Cleansing potential legacy ports 5000 and 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>nul

echo Starting Flask Backend API on http://localhost:5000...
start "Flask-Backend-API" "%PYTHON_EXEC%" backend\app.py

echo Starting Frontend Web Portal Server on http://localhost:8000...
start "Frontend-HTTP-Server" "%PYTHON_EXEC%" -m http.server 8000 --directory frontend

echo.
echo [4/4] Launching default browser...
timeout /t 3 >nul
start http://localhost:8000

echo.
echo =====================================================================
echo SUCCESS: Both servers running in background.
echo - Portfolio Portal: http://localhost:8000
echo - Flask Backend API: http://localhost:5000
echo.
echo Leave this terminal open. Press CTRL+C to terminate both servers.
echo =====================================================================
echo.

pause
