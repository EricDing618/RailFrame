#!/usr/bin/env python3
"""
网站镜像爬取工具 - 详细依赖信息版
递归下载 HTML 及其所有引用的 JS/CSS/图片等资源，保持目录结构。
显示每个依赖的详细类型、域名归属、大小和保存路径。
"""

import os
import re
import sys
import time
from urllib.parse import urljoin, urlparse, urlunparse
from pathlib import Path
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# ========== 配置 ==========
BASE_URL = "http://binshu.jowei19.com/bld/"
OUTPUT_DIR = "./bld_mirror"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
REQUEST_DELAY = 0.3
MAX_WORKERS = 5
# ===========================

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT})

downloaded = set()
pending = set()
base_domain = urlparse(BASE_URL).netloc


def normalize_url(url):
    """去除 URL 中的查询参数（?v=xxx）"""
    if not url:
        return None
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))


def get_local_path(url):
    """根据 URL 生成本地文件路径"""
    parsed = urlparse(url)
    path = parsed.path
    if path.startswith("/"):
        path = path[1:]
    if not path or path.endswith("/"):
        path = path + "index.html"
    if "." not in os.path.basename(path):
        path = path + ".html"
    return os.path.join(OUTPUT_DIR, path)


def get_resource_type(url):
    """根据文件扩展名判断资源类型"""
    path = urlparse(url).path.lower()
    if path.endswith((".js", ".mjs")):
        return "JS脚本"
    elif path.endswith((".css", ".scss", ".less")):
        return "CSS样式"
    elif path.endswith((".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".ico")):
        return "图片"
    elif path.endswith((".woff", ".woff2", ".ttf", ".eot", ".otf")):
        return "字体"
    elif path.endswith((".json")):
        return "JSON数据"
    elif path.endswith((".html", ".htm")):
        return "HTML页面"
    elif "." not in os.path.basename(path) or path.endswith("/"):
        return "HTML页面(无后缀)"
    else:
        return "未知资源"


def extract_resources(html_content, base_url):
    """从 HTML 内容中提取所有资源 URL，并附带标签类型"""
    resources = []

    # script src
    for m in re.finditer(r'<script[^>]*src=["\']([^"\']+)["\']', html_content, re.I):
        resources.append((urljoin(base_url, m.group(1)), "script", "src"))

    # link href (css, icon, preload, etc.)
    for m in re.finditer(r'<link[^>]*href=["\']([^"\']+)["\']', html_content, re.I):
        href = m.group(1)
        if href.startswith("resource://"):
            continue
        resources.append((urljoin(base_url, href), "link", "href"))

    # img src
    for m in re.finditer(r'<img[^>]*src=["\']([^"\']+)["\']', html_content, re.I):
        resources.append((urljoin(base_url, m.group(1)), "img", "src"))

    # source src (video/audio/picture)
    for m in re.finditer(r'<source[^>]*src=["\']([^"\']+)["\']', html_content, re.I):
        resources.append((urljoin(base_url, m.group(1)), "source", "src"))

    return resources


def download_file(url, force=False):
    """下载单个文件并显示详细信息"""
    norm_url = normalize_url(url)
    if not norm_url:
        return False

    if norm_url in downloaded and not force:
        return True

    local_path = get_local_path(norm_url)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    try:
        time.sleep(REQUEST_DELAY)
        resp = session.get(url, timeout=30)
        resp.raise_for_status()

        content = resp.content
        size = len(content)
        if size >= 1024 * 1024:
            size_str = f"{size / (1024 * 1024):.2f} MB"
        elif size >= 1024:
            size_str = f"{size / 1024:.2f} KB"
        else:
            size_str = f"{size} B"

        with open(local_path, "wb") as f:
            f.write(content)

        downloaded.add(norm_url)
        print(f"  ✅ 下载成功 | {get_resource_type(url)} | {os.path.basename(local_path)} ({size_str})")
        return True

    except Exception as e:
        print(f"  ❌ 下载失败 | {url} | 错误: {e}")
        return False


def print_resource_detail(res_url, tag, attr, is_external, reason=None):
    """统一输出依赖资源的详细信息"""
    res_type = get_resource_type(res_url)
    parsed = urlparse(res_url)
    filename = os.path.basename(parsed.path) or "(无文件名)"
    domain = parsed.netloc or "相对路径"

    if is_external:
        status_icon = "⏭️ 已过滤"
        status_text = "外部资源"
    else:
        status_icon = "📎 已收录"
        status_text = "内部资源"

    local_path = get_local_path(res_url) if not is_external else "(不下载)"

    print(f"  {status_icon} [{status_text}]")
    print(f"     类型: {res_type}")
    print(f"     标签: <{tag}> {attr}=\"{res_url}\"")
    print(f"     域名: {domain}")
    print(f"     文件: {filename}")
    if is_external:
        print(f"     原因: {reason or '跨域资源，保留CDN原链接，不下载到本地'}")
    else:
        print(f"     保存: {local_path}")
    print()  # 空行分隔


def crawl_page(url, visited=None):
    """递归爬取页面及其依赖"""
    if visited is None:
        visited = set()

    norm_url = normalize_url(url)
    if norm_url in visited:
        return
    visited.add(norm_url)

    # 下载当前页面
    print(f"\n📄 正在处理页面: {url}")
    if not download_file(url):
        return

    # 读取本地文件内容以提取依赖
    local_path = get_local_path(norm_url)
    try:
        with open(local_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception as e:
        print(f"  ⚠️ 无法读取 {local_path}: {e}")
        return

    # 提取资源
    resources = extract_resources(content, url)

    internal_resources = []
    external_resources = []

    for res_url, tag, attr in resources:
        parsed = urlparse(res_url)
        # 判断是否为外部资源（不同域名）
        is_external = bool(parsed.netloc) and parsed.netloc != base_domain

        if is_external:
            # 过滤外部资源，但打印详细提醒
            print_resource_detail(res_url, tag, attr, is_external=True)
            external_resources.append(res_url)
        else:
            # 内部资源：打印详细信息并加入待下载队列
            print_resource_detail(res_url, tag, attr, is_external=False)
            internal_resources.append(res_url)

    # 外部资源汇总提示
    if external_resources:
        print(f"  ⚠️ 共发现 {len(external_resources)} 个外部依赖，已跳过下载（保留原CDN链接）")
        print()

    # 将内部资源加入待下载队列（去重）
    for res in internal_resources:
        if normalize_url(res) not in visited:
            pending.add(res)

    # 递归下载内部 HTML 页面（深度优先）
    for res in internal_resources:
        path = urlparse(res).path
        # 仅对 HTML 页面或无后缀页面递归
        if path.endswith((".html", ".htm")) or "." not in os.path.basename(path) or path.endswith("/"):
            crawl_page(res, visited)
        else:
            # 非 HTML 资源直接下载（后续通过并发下载统一处理）
            pass


def main():
    print("=" * 70)
    print("  🌐 网站镜像爬取工具 - 详细依赖分析版")
    print(f"  目标站点: {BASE_URL}")
    print(f"  输出目录: {OUTPUT_DIR}")
    print(f"  并发线程: {MAX_WORKERS}")
    print("=" * 70)

    global downloaded, pending
    downloaded = set()
    pending = set()

    start_url = urljoin(BASE_URL, "bshistory.html")
    crawl_page(start_url)

    # 并发下载所有待下载的内部资源
    if pending:
        print(f"\n📦 开始并发下载剩余 {len(pending)} 个内部资源...")
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(download_file, url): url for url in pending}
            for future in as_completed(futures):
                pass

    print("\n" + "=" * 70)
    print(f"  ✅ 爬取完成！")
    print(f"  总计下载: {len(downloaded)} 个文件")
    print(f"  保存位置: {os.path.abspath(OUTPUT_DIR)}/")
    print("=" * 70)


if __name__ == "__main__":
    main()