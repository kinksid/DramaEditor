@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   DramaEditor 一键启动
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装: https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

echo 正在启动开发服务器...
echo 本地访问:   http://localhost:3000
echo 局域网访问: 启动后见上方自动识别的 10.11.x.x 地址
echo 按 Ctrl+C 可停止服务
echo.

call npm run dev

if errorlevel 1 (
    echo.
    echo [错误] 服务启动失败
    pause
    exit /b 1
)
