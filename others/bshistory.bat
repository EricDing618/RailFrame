@echo off
chcp 65001 >nul
title 滨蜀发展史演示器 - 本地启动工具（带检查）

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo ==============================================
echo    🌐 滨蜀发展史演示器 - 启动工具
echo ==============================================
echo.

:: 定义必需文件列表（相对路径）
set REQUIRED_FILES=bld\bshistory.html bld\bshistory.worker.js bld\vue.global.js bld\lz-string.min.js

echo [检查] 验证项目文件完整性...
set MISSING=0
for %%f in (%REQUIRED_FILES%) do (
    if not exist "%%f" (
        echo   ❌ 缺失: %%f
        set MISSING=1
    )
)

if %MISSING%==1 (
    echo.
    echo ⚠️ 部分必需文件缺失，程序可能无法正常运行。
    echo 建议重新运行增强爬虫下载完整项目。
    echo.
    choice /C YN /M "是否继续启动 (Y/N)"
    if errorlevel 2 exit /b
)

:: 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到 Python，请安装并加入 PATH。
    pause
    exit /b 1
)

:: 寻找可用端口
set PORT=8000
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul
if errorlevel 1 ( set PORT=8000 ) else ( set PORT=8080 )

:: 启动服务器和浏览器
start http://localhost:%PORT%/bld/bshistory.html
timeout /t 2 >nul
python -m http.server %PORT%

pause