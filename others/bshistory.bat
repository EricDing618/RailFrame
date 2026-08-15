@echo off
chcp 65001 >nul
title 滨蜀发展史演示器 - 本地服务器

:: 获取脚本所在目录，并切换到该目录
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo ==============================================
echo    🌐 滨蜀发展史演示器 - 本地启动工具
echo ==============================================
echo.

:: 1. 检查 Python 是否安装
echo [1/4] 检查 Python 环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到 Python！
    echo.
    echo 请先安装 Python 3.x，并确保勾选 "Add Python to PATH"。
    echo 下载地址：https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PY_VER=%%i
echo ✅ 找到 %PY_VER%
echo.

:: 2. 检查目标 HTML 文件是否存在
echo [2/4] 检查项目文件...
if not exist "bld\bshistory.html" (
    echo ❌ 错误：未找到 bld\bshistory.html！
    echo.
    echo 请确保将此 .bat 文件放在与 "bld" 文件夹相同的目录下。
    echo 当前目录：%cd%
    echo.
    pause
    exit /b 1
)
echo ✅ 找到主页面：bld\bshistory.html
echo.

:: 3. 检测端口占用，尝试 8000，若被占用则使用 8080
echo [3/4] 检测可用端口...
set PORT=8000
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo ✅ 端口 %PORT% 可用
) else (
    echo ⚠️ 端口 8000 已被占用，尝试使用 8080...
    set PORT=8080
    netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul
    if errorlevel 1 (
        echo ✅ 端口 8080 可用
    ) else (
        echo ❌ 端口 8080 也被占用，请手动关闭占用进程后重试。
        pause
        exit /b 1
    )
)
echo.

:: 4. 启动浏览器（稍等2秒确保服务器就绪）
echo [4/4] 正在启动 HTTP 服务器...
echo.
echo ==============================================
echo    ✅ 服务器启动中...
echo    访问地址：http://localhost:%PORT%/bld/bshistory.html
echo    按 Ctrl + C 可停止服务器
echo ==============================================
echo.

:: 延迟 2 秒打开浏览器（等待服务器初始化）
timeout /t 2 /nobreak >nul
start http://localhost:%PORT%/bld/bshistory.html

:: 启动 Python HTTP 服务器（前台运行）
python -m http.server %PORT%

:: 如果服务器退出，暂停查看结果
pause