# coding=utf-8
"""
MTR 模组线路数据导出工具 - 支持忽略指定线路类型和线路名称
输出文件：mtr_network.json
"""
import json
from urllib import request, error
from urllib.parse import urljoin
from os.path import exists

# ================= 配置区域 =================
WORLD: int = 0
USE_MTR_400: bool = True
DRAW_HIDDEN_ROUTES: bool = False
SCALE: float = 0.1

# 忽略的线路类型（地铁 train_light_rail 已注释，保留）
IGNORED_ROUTE_TYPES = {
    "train_normal",
    "train_high_speed",
    # "train_light_rail",  # 地铁 - 保留
    "boat_normal",
    "boat_light_rail",
    "boat_high_speed",
    "cable_car_normal",
    "bus_normal",
    "bus_light_rail",
    "bus_high_speed",
    "airplane_normal",
}

# 忽略的具体线路名称（按需添加）
IGNORED_LINE_NAMES = {
    # "9号线",
    # "机场线",
}

DATA_LINK_BASE = 'https://letsplay.minecrafttransitrailway.com/system-map/'
DATA_LINK = urljoin(DATA_LINK_BASE, (f'mtr/api/map/stations-and-routes?dimension={WORLD}' if USE_MTR_400 else 'data'))

def fetch_data(link):
    print("正在获取数据:", link)
    req = request.Request(link)
    try:
        with request.urlopen(req) as res:
            return json.loads(res.read().decode('UTF-8'))
    except Exception as e:
        print(f"获取数据失败: {e}")
        exit(1)

def convert_data_3(data):
    # ...（同上，略）
    pass

def convert_data_4(data):
    # ...（同上，略）
    pass

def export_to_framework_json(routes, stations, output_path):
    lines_output = []
    for route in routes:
        line_name = route['name'][0]
        line_color = route['color']
        station_list = []
        for sid in route['stations']:
            st = stations[sid]
            st_name = st['name'][0]
            st_sub = st['name'][1] if st['name'][1] else None
            x = st['x'] * SCALE
            z = st['z'] * SCALE
            station_list.append({'name': st_name, 'sub': st_sub, 'x': x, 'z': z})
        curves = ['line'] * (len(station_list) - 1)
        lines_output.append({'name': line_name, 'color': line_color, 'stations': station_list, 'curves': curves})
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({'lines': lines_output}, f, indent=2, ensure_ascii=False)
    print(f"✅ 成功导出 {len(lines_output)} 条线路到 {output_path}")

if __name__ == '__main__':
    print("=" * 50)
    print("MTR 线路导出器（支持忽略类型和具体线路）")
    print("请确保游戏已启动，且 localhost:8888 可访问")
    print("=" * 50)
    raw_data = fetch_data(DATA_LINK)
    if USE_MTR_400:
        routes, stations = convert_data_4(raw_data)
    else:
        routes, stations = convert_data_3(raw_data)
    output_file = 'mtr_network.json'
    if exists(output_file):
        overwrite = input(f"文件 {output_file} 已存在，是否覆盖？(y/n): ")
        if overwrite.lower() != 'y':
            print("取消导出。")
            exit(0)
    export_to_framework_json(routes, stations, output_file)