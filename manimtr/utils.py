"""
辅助工具函数
"""
import numpy as np
from manim import ManimColor, Text, VGroup, DOWN, UP, LEFT, RIGHT, WHITE
from typing import Tuple, List, Optional

def manim_color_from_hex(hex_str: str) -> ManimColor:
    return ManimColor(hex_str)

def get_camera_aspect_ratio(camera) -> float:
    frame = camera.frame
    return frame.width / frame.height

def smart_label_position(center: np.ndarray, existing_bboxes: List[Tuple[float, float, float, float]],
                         preferred_direction: Optional[str] = None,
                         label_size: Tuple[float, float] = (1.0, 0.5),
                         padding: float = 0.1) -> np.ndarray:
    directions = []
    if preferred_direction:
        dir_map = {"left": (-1,0), "right": (1,0), "up": (0,1), "down": (0,-1)}
        directions.append(dir_map[preferred_direction])
    directions += [(1,0), (-1,0), (0,1), (0,-1)]
    w, h = label_size
    for dx, dy in directions:
        label_center = center + np.array([dx * (w/2 + padding), dy * (h/2 + padding), 0])
        left = label_center[0] - w/2
        right = label_center[0] + w/2
        bottom = label_center[1] - h/2
        top = label_center[1] + h/2
        overlap = False
        for (l, r, b, t) in existing_bboxes:
            if not (right < l or left > r or top < b or bottom > t):
                overlap = True
                break
        if not overlap:
            return label_center
    return center + np.array([w/2 + padding, 0, 0])

def create_station_label(station, font: str = "Microsoft YaHei", color=WHITE,
                         align: str = "left", position_offset: np.ndarray = None) -> VGroup:
    from manim import Text
    name_text = Text(station.name, font=font, color=color, font_size=station.station_font_size)
    if station.sub_name:
        sub_text = Text(station.sub_name, font=font, color=color, font_size=station.sub_font_size)
        if align == "left":
            group = VGroup(name_text, sub_text).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        else:
            group = VGroup(name_text, sub_text).arrange(DOWN, aligned_edge=RIGHT, buff=0.1)
    else:
        group = name_text
    if position_offset is not None:
        group.shift(position_offset)
    return group