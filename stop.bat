@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"

echo ========================================
echo   DramaEditor 终止开发服务
echo ========================================
echo.
echo 目标端口: %PORT%
echo.

set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  if not "%%P"=="0" (
    echo 正在终止 PID %%P ...
    taskkill /F /PID %%P >nul 2>&1
    if not errorlevel 1 (
      set "FOUND=1"
      echo [完成] 已终止进程 %%P
    )
  )
)

echo.
if "%FOUND%"=="0" (
  echo [提示] 端口 %PORT% 上未发现运行中的开发服务
) else (
  echo 开发服务已停止。
)

echo.
pause
