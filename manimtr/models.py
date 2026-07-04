"""
数据模型：定义动画步骤、轨道几何、站点、徽章、线路、网络等。
"""
import numpy as np
from manim import WHITE
from typing import Tuple, Optional, List, Union, Literal, Set, Dict

# ========================= Step 类 =========================
class Step:
    """
    动画步骤容器，工厂方法创建
    """
    def __init__(self, step_type: str, params: dict):
        self.type = step_type
        self.params = params

    @classmethod
    def build_line(cls, line_index: int, show_stations: bool = True, speed: float = 1.0):
        return cls("build_line", {"line_index": line_index, "show_stations": show_stations, "speed": speed})

    @classmethod
    def build_segment(cls, line_index: int, segment_index: int, speed: float = 1.0):
        return cls("build_segment", {"line_index": line_index, "segment_index": segment_index, "speed": speed})

    @classmethod
    def retract_line(cls, line_index: int, speed: float = 1.0):
        return cls("retract_line", {"line_index": line_index, "speed": speed})

    @classmethod
    def retract_segment(cls, line_index: int, segment_index: int, speed: float = 1.0):
        return cls("retract_segment", {"line_index": line_index, "segment_index": segment_index, "speed": speed})

    @classmethod
    def zoom_to_rect(cls, bounds: Tuple[float, float, float, float], run_time: float = 1.0):
        return cls("zoom_to_rect", {"bounds": bounds, "run_time": run_time})

    @classmethod
    def zoom_to_point(cls, point: Tuple[float, float], width: float, height: float, run_time: float = 1.0):
        return cls("zoom_to_point", {"point": point, "width": width, "height": height, "run_time": run_time})

    @classmethod
    def zoom_to_full_map(cls, run_time: float = 1.0, padding_ratio: float = 0.05):
        return cls("zoom_to_full_map", {"run_time": run_time, "padding_ratio": padding_ratio})

    @classmethod
    def zoom_to_first_station(cls, line_index: int, zoom_ratio: float = 0.3, run_time: float = 1.0):
        return cls("zoom_to_first_station", {"line_index": line_index, "zoom_ratio": zoom_ratio, "run_time": run_time})

    @classmethod
    def wait(cls, duration: float = 1.0):
        return cls("wait", {"duration": duration})

    @classmethod
    def add_badge(cls, line_index: int, segment_index: int):
        return cls("add_badge", {"line_index": line_index, "segment_index": segment_index})

    @classmethod
    def remove_badge(cls, line_index: int, segment_index: int):
        return cls("remove_badge", {"line_index": line_index, "segment_index": segment_index})

    @classmethod
    def show_special_icon(cls, station_name: str, run_time: float = 1.0):
        return cls("show_special_icon", {"station_name": station_name, "run_time": run_time})

    @classmethod
    def arrange_transfers(cls, station_name: str):
        """将站点升级为换乘站"""
        return cls("arrange_transfers", {"station_name": station_name})

    @classmethod
    def set_preview(cls, enabled: bool = True, fade_speed: float = 2.0):
        return cls("set_preview", {"enabled": enabled, "fade_speed": fade_speed})


# ========================= 轨道段 =========================
class TrackSegment:
    def __init__(self, start_station: "MetroStation", end_station: "MetroStation",
                 curve_type: Literal["line", "arc", "bezier"] = "line",
                 angle_deg: Optional[float] = None,
                 control1: Optional[Tuple[float, float]] = None,
                 control2: Optional[Tuple[float, float]] = None):
        self.start = start_station
        self.end = end_station
        self.curve_type = curve_type
        self.angle_deg = angle_deg
        self.control1 = control1
        self.control2 = control2


# ========================= 站点 =========================
class MetroStation:
    def __init__(self, name: str, sub_name: Optional[str] = None,
                 pos_mc: Tuple[float, float] = (0, 0),
                 station_color=WHITE, station_font_size: int = 30,
                 sub_font_size: int = 20):
        self.name = name
        self.sub_name = sub_name
        self.pos_mc = np.array(pos_mc, dtype=float)
        self.station_color = station_color
        self.station_font_size = station_font_size
        self.sub_font_size = sub_font_size
        self.lines: Set[str] = set()
        self.special_icon: Optional["SpecialNode"] = None
        self._cached_marker = None
        self._cached_label = None


# ========================= 线路 =========================
class MetroPath:
    def __init__(self, line_name: str, line_color_hex: str):
        self.line_name = line_name
        self.line_color_hex = line_color_hex
        self.stations: List[MetroStation] = []
        self.segments: List[TrackSegment] = []

    def add_station(self, station: MetroStation,
                    curve_type: Literal["line", "arc", "bezier"] = "line",
                    angle_deg: Optional[float] = None,
                    control1: Optional[Tuple[float, float]] = None,
                    control2: Optional[Tuple[float, float]] = None):
        if self.stations:
            prev = self.stations[-1]
            seg = TrackSegment(prev, station, curve_type, angle_deg, control1, control2)
            self.segments.append(seg)
        self.stations.append(station)
        station.lines.add(self.line_name)
        return self

    def get_default_badge(self) -> "LineBadge":
        return LineBadge(self.line_name, self.line_color_hex)


# ========================= 徽章 =========================
class LineBadge:
    def __init__(self, line_number: str, bg_color: str, text_color=WHITE, width=0.7, height=0.45):
        self.line_number = line_number
        self.bg_color = bg_color
        self.text_color = text_color
        self.width = width
        self.height = height


# ========================= 特殊节点 =========================
class SpecialNode:
    def __init__(self, station: MetroStation, icon_path: str, scale=0.3, zoom_on_arrival=True):
        self.station = station
        self.icon_path = icon_path
        self.scale = scale
        self.zoom_on_arrival = zoom_on_arrival
        station.special_icon = self


# ========================= RMG 网络数据 =========================
class RMGNetwork:
    def __init__(self):
        self.lines: List[MetroPath] = []
        self.stations: List[MetroStation] = []
        self.station_dict: Dict[str, MetroStation] = {}

    @classmethod
    def from_rmg(cls, json_path: str):
        import json
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        network = cls()
        # 先创建所有站点对象（唯一）
        for line_data in data["lines"]:
            for st_data in line_data["stations"]:
                name = st_data["name"]
                if name not in network.station_dict:
                    station = MetroStation(
                        name=name,
                        sub_name=st_data.get("sub"),
                        pos_mc=(st_data["x"], st_data["z"])
                    )
                    network.station_dict[name] = station
                    network.stations.append(station)

        # 构建线路
        for line_data in data["lines"]:
            path = MetroPath(line_data["name"], line_data["color"])
            curves = line_data.get("curves", [])
            stations_on_line = [network.station_dict[st["name"]] for st in line_data["stations"]]
            for i, station in enumerate(stations_on_line):
                curve_type = curves[i] if i < len(curves) else "line"
                path.add_station(station, curve_type=curve_type)
            network.lines.append(path)
        return network