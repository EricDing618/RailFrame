#!/usr/bin/env python3
"""
增强版网站镜像爬虫 (编码修复版)
支持递归捕获 new Worker(...) 和 importScripts(...) 依赖
自动修复引用中的查询参数
"""

import os
import re
import sys
import time
from urllib.parse import urljoin, urlparse, urlunparse
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
    if not url:
        return None
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))

def get_local_path(url):
    parsed = urlparse(url)
    path = parsed.path
    if path.startswith("/"):
        path = path[1:]
    if not path or path.endswith("/"):
        path = path + "index.html"
    if "." not in os.path.basename(path):
        path = path + ".html"
    return os.path.join(OUTPUT_DIR, path)

def download_file(url, force=False):
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

        # 判断是否为文本类文件 (JS, CSS, HTML, JSON等)
        is_text = False
        content_type = resp.headers.get('Content-Type', '').lower()
        if 'text' in content_type or 'javascript' in content_type or 'json' in content_type:
            is_text = True
        elif url.endswith(('.js', '.mjs', '.css', '.html', '.htm', '.json', '.xml', '.svg')):
            is_text = True

        if is_text:
            # 核心修复：强制用 UTF-8 解码
            try:
                text_content = resp.content.decode('utf-8')
            except UnicodeDecodeError:
                # 如果 UTF-8 解码失败，尝试 GBK
                try:
                    text_content = resp.content.decode('gbk')
                except:
                    text_content = resp.content.decode('utf-8', errors='replace')
            with open(local_path, 'w', encoding='utf-8') as f:
                f.write(text_content)
        else:
            # 二进制文件 (图片、字体等)
            with open(local_path, 'wb') as f:
                f.write(resp.content)

        downloaded.add(norm_url)
        print(f"  ✅ 下载成功: {os.path.basename(local_path)}")
        return True
    except Exception as e:
        print(f"  ❌ 下载失败: {url} -> {e}")
        return False

def extract_worker_urls_from_js(js_content, base_url):
    """从JavaScript内容中提取 Worker 脚本 URL"""
    workers = set()
    # 匹配 new Worker('...') 或 new Worker("...")
    for m in re.finditer(r'new\s+Worker\s*\([\'"]([^\'"]+)[\'"]', js_content):
        raw = m.group(1)
        if '?' in raw:
            raw = raw.split('?')[0]
        workers.add(urljoin(base_url, raw))
    # 匹配 importScripts('...')
    for m in re.finditer(r'importScripts\s*\([\'"]([^\'"]+)[\'"]', js_content):
        raw = m.group(1)
        if '?' in raw:
            raw = raw.split('?')[0]
        workers.add(urljoin(base_url, raw))
    return workers

def extract_resources_from_html(html_content, base_url):
    """从HTML中提取常规资源（script, link, img, source）"""
    resources = set()
    for m in re.finditer(r'<script[^>]*src=["\']([^"\']+)["\']', html_content, re.I):
        resources.add(urljoin(base_url, m.group(1)))
    for m in re.finditer(r'<link[^>]*href=["\']([^"\']+)["\']', html_content, re.I):
        href = m.group(1)
        if href.startswith("resource://"):
            continue
        resources.add(urljoin(base_url, href))
    for m in re.finditer(r'<img[^>]*src=["\']([^"\']+)["\']', html_content, re.I):
        resources.add(urljoin(base_url, m.group(1)))
    for m in re.finditer(r'<source[^>]*src=["\']([^"\']+)["\']', html_content, re.I):
        resources.add(urljoin(base_url, m.group(1)))
    return resources

def fix_worker_refs_in_html(html_content):
    """移除HTML中Worker构造器URL的查询参数，避免本地加载时404"""
    html_content = re.sub(r'(new\s+Worker\s*\([\'"])([^\'"\?]+)\?[^\'"]+([\'"])', r'\1\2\3', html_content)
    return html_content

def crawl_page(url, visited=None):
    if visited is None:
        visited = set()
    norm_url = normalize_url(url)
    if norm_url in visited:
        return
    visited.add(norm_url)

    print(f"\n📄 处理: {url}")
    if not download_file(url):
        return

    local_path = get_local_path(norm_url)
    try:
        with open(local_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        print(f"  ⚠️ 无法读取本地文件: {e}")
        return

    # 如果是HTML，提取常规资源 + 修复Worker引用
    if local_path.endswith(('.html', '.htm')):
        fixed_content = fix_worker_refs_in_html(content)
        if fixed_content != content:
            with open(local_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print("  🔧 已移除HTML中Worker URL的查询参数")
            content = fixed_content

        resources = extract_resources_from_html(content, url)
        for res in resources:
            if normalize_url(res) not in visited:
                pending.add(res)

    # 如果是JS文件，提取Worker/importScripts依赖
    elif local_path.endswith(('.js', '.mjs')):
        js_urls = extract_worker_urls_from_js(content, url)
        for js_url in js_urls:
            if normalize_url(js_url) not in visited:
                pending.add(js_url)
                if urlparse(js_url).netloc in ('', base_domain):
                    crawl_page(js_url, visited)

    # 递归处理待下载资源中的HTML页面
    for res in list(pending):
        if normalize_url(res) not in visited:
            path = urlparse(res).path
            if path.endswith(('.html', '.htm')) or '.' not in os.path.basename(path):
                crawl_page(res, visited)

def main():
    print("=" * 70)
    print("  🚀 增强版爬虫 - 支持 Worker 依赖捕获 + 编码修复")
    print(f"  目标: {BASE_URL}")
    print("=" * 70)

    start_url = urljoin(BASE_URL, 'bshistory.html')
    crawl_page(start_url)

    if pending:
        print(f"\n📦 并发下载剩余 {len(pending)} 个资源...")
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {executor.submit(download_file, url): url for url in pending}
            for future in as_completed(futures):
                pass

    print("\n" + "=" * 70)
    print(f"✅ 完成！共下载 {len(downloaded)} 个文件")
    print(f"   保存于: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 70)

if __name__ == '__main__':
    main()