"""
主场景类 MTRMapScene - 实现地图加载、坐标映射、动画执行。
"""
from typing import Optional, List, Tuple, Dict, Set
import numpy as np
from PIL import Image
from manim import *
from collections import defaultdict
from .models import Step, MetroPath, LineBadge, SpecialNode, TrackSegment, MetroStation, RMGNetwork
from .utils import manim_color_from_hex, smart_label_position, create_station_label, get_camera_aspect_ratio

class MTRMapScene(MovingCameraScene):
    def __init__(self, camera_zoom_ratio: float = 0.5, preview_mode: bool = False,
                 preview_fade_speed: float = 2.0, **kwargs):
        super().__init__(**kwargs)
        self.camera_zoom_ratio = camera_zoom_ratio
        self.preview_mode = preview_mode
        self.preview_fade_speed = preview_fade_speed
        self.paths: List[MetroPath] = []
        self.line_badges: List[LineBadge] = []
        self.all_stations: List[MetroStation] = []
        self.segment_mobjects: Dict[Tuple[int, int], VMobject] = {}
        self.station_markers: Dict[MetroStation, VMobject] = {}
        self.station_labels: Dict[MetroStation, VMobject] = {}
        self._badges: List[Tuple[VMobject, VMobject, int, int]] = []
        self.mc_to_manim = None
        self.bg_bounds = None
        self.full_map_width = None
        self.full_map_height = None
        self.bg = None
        self._train = None
        self._trail = None
        self._camera_following = False
        self._camera_follow_updater = None

    # ---------- 背景设置与坐标映射 ----------
    def setup_map(self, bg_image_path: Optional[str] = None,
                  ref_points: Optional[List[Tuple[float, float, float, float]]] = None,
                  mc_bounds: Optional[Tuple[float, float, float, float]] = None,
                  manim_bounds: Optional[Tuple[float, float, float, float]] = None,
                  bg_opacity: float = 1.0):
        if bg_image_path is None:
            if manim_bounds is None:
                left, right, bottom, top = -7, 7, -4, 4
            else:
                left, right, bottom, top = manim_bounds
            bg_rect = Rectangle(width=right-left, height=top-bottom, color=WHITE, fill_opacity=1)
            bg_rect.move_to((left+right)/2, (bottom+top)/2)
            self.bg = bg_rect
            self.add(self.bg)
            self.bg_bounds = (left, right, bottom, top)
            self.full_map_width = right - left
            self.full_map_height = top - bottom

            if mc_bounds is not None:
                x_min, z_min, x_max, z_max = mc_bounds
                def mc_to_manim(mc_pos):
                    x, z = mc_pos[0], mc_pos[1]
                    t = (x - x_min) / (x_max - x_min)
                    u = (z - z_min) / (z_max - z_min)
                    mx = left + t * (right - left)
                    my = bottom + u * (top - bottom)
                    return np.array([mx, my, 0])
                self.mc_to_manim = mc_to_manim
            else:
                def mc_to_manim(mc_pos):
                    return np.array([mc_pos[0], mc_pos[1], 0])
                self.mc_to_manim = mc_to_manim
            return

        # 有背景图片
        self.bg = ImageMobject(bg_image_path)
        self.bg.set_opacity(bg_opacity)
        self.add(self.bg)

        with Image.open(bg_image_path) as img:
            img_width, img_height = img.size

        if manim_bounds is None:
            target_width = 12
            scale = target_width / img_width
            self.bg.scale(scale)
            self.bg.move_to(ORIGIN)
            left = self.bg.get_left()[0]
            right = self.bg.get_right()[0]
            bottom = self.bg.get_bottom()[1]
            top = self.bg.get_top()[1]
        else:
            left, right, bottom, top = manim_bounds
            scale_x = (right - left) / img_width
            scale_y = (top - bottom) / img_height
            scale = min(scale_x, scale_y)
            self.bg.scale(scale)
            self.bg.move_to(ORIGIN)
            self.bg.move_to((left+right)/2, (bottom+top)/2)

        bg_left = self.bg.get_left()[0]
        bg_right = self.bg.get_right()[0]
        bg_bottom = self.bg.get_bottom()[1]
        bg_top = self.bg.get_top()[1]

        if ref_points is not None and len(ref_points) >= 2:
            def px_to_manim(px, py):
                mx = bg_left + (px / img_width) * (bg_right - bg_left)
                my = bg_top - (py / img_height) * (bg_top - bg_bottom)
                return np.array([mx, my, 0])

            world_pts = []
            manim_pts = []
            for (img_x, img_y, world_x, world_z) in ref_points:
                manim_pt = px_to_manim(img_x, img_y)
                world_pts.append([world_x, world_z])
                manim_pts.append(manim_pt[:2])

            world_pts = np.array(world_pts)
            manim_pts = np.array(manim_pts)
            n = len(world_pts)

            if n == 2:
                A_x = np.vstack([world_pts[:,0], np.ones(n)]).T
                coeff_x, _, _, _ = np.linalg.lstsq(A_x, manim_pts[:,0], rcond=None)
                A_y = np.vstack([world_pts[:,1], np.ones(n)]).T
                coeff_y, _, _, _ = np.linalg.lstsq(A_y, manim_pts[:,1], rcond=None)
                self.transform = (coeff_x[0], coeff_x[1], coeff_y[0], coeff_y[1])
                def mc_to_manim(mc_pos):
                    x, z = mc_pos[0], mc_pos[1]
                    mx = self.transform[0] * x + self.transform[1]
                    my = self.transform[2] * z + self.transform[3]
                    return np.array([mx, my, 0])
            else:
                A = np.hstack([world_pts, np.ones((n,1))])
                M, _, _, _ = np.linalg.lstsq(A, manim_pts, rcond=None)
                self.transform = M
                def mc_to_manim(mc_pos):
                    x, z = mc_pos[0], mc_pos[1]
                    mx, my = np.dot([x, z, 1], self.transform)
                    return np.array([mx, my, 0])
            self.mc_to_manim = mc_to_manim

        elif mc_bounds is not None:
            x_min, z_min, x_max, z_max = mc_bounds
            def mc_to_manim(mc_pos):
                x_mc, z_mc = mc_pos[0], mc_pos[1]
                t = (x_mc - x_min) / (x_max - x_min)
                u = (z_mc - z_min) / (z_max - z_min)
                mx = bg_left + t * (bg_right - bg_left)
                my = bg_bottom + u * (bg_top - bg_bottom)
                return np.array([mx, my, 0])
            self.mc_to_manim = mc_to_manim
        else:
            raise ValueError("必须提供 ref_points 或 mc_bounds 之一")

        self.bg_bounds = (bg_left, bg_right, bg_bottom, bg_top)
        self.full_map_width = bg_right - bg_left
        self.full_map_height = bg_top - bg_bottom

    # ---------- 添加网络/线路 ----------
    def add_network(self, network: RMGNetwork):
        for path in network.lines:
            self.add_line(path)
        self.all_stations = network.stations

    def add_line(self, path: MetroPath, badge: Optional[LineBadge] = None):
        if badge is None:
            badge = path.get_default_badge()
        self.paths.append(path)
        self.line_badges.append(badge)
        for station in path.stations:
            if station not in self.all_stations:
                self.all_stations.append(station)

    def add_special_node(self, station_name: str, icon_path: str,
                         scale: float = 0.3, zoom_on_arrival: bool = True):
        for station in self.all_stations:
            if station.name == station_name:
                node = SpecialNode(station, icon_path, scale, zoom_on_arrival)
                return
        raise ValueError(f"未找到站点: {station_name}")

    # ---------- 动画执行主入口 ----------
    def build_animation(self, steps: List[Step], default_build_speed: float = 1.0,
                        camera_follow: bool = True):
        if self.preview_mode:
            self._run_preview(default_build_speed, camera_follow)
            self._clear_all_animations()

        for step in steps:
            t = step.type
            p = step.params
            if t == "build_line":
                self._build_line(p["line_index"], p.get("show_stations", True),
                                 p.get("speed", default_build_speed), camera_follow)
            elif t == "build_segment":
                self._build_single_segment(p["line_index"], p["segment_index"],
                                           p.get("speed", default_build_speed), camera_follow)
            elif t == "retract_line":
                self._retract_line(p["line_index"], p.get("speed", default_build_speed), camera_follow)
            elif t == "retract_segment":
                self._retract_single_segment(p["line_index"], p["segment_index"],
                                             p.get("speed", default_build_speed), camera_follow)
            elif t == "zoom_to_rect":
                self._zoom_to_bounds(p["bounds"], p.get("run_time", 1.0))
            elif t == "zoom_to_point":
                pos = self.mc_to_manim(np.array(p["point"]))
                self._zoom_to_point(pos, p["width"], p["height"], p.get("run_time", 1.0))
            elif t == "zoom_to_full_map":
                padding = p.get("padding_ratio", 0.05)
                bounds = self.get_full_map_bounds(padding)
                self._zoom_to_bounds(bounds, p.get("run_time", 1.0))
            elif t == "zoom_to_first_station":
                self._zoom_to_first_station(p["line_index"], p["zoom_ratio"], p["run_time"])
            elif t == "wait":
                self.wait(p.get("duration", 1.0))
            elif t == "add_badge":
                self._add_segment_badges(p["line_index"], p["segment_index"])
            elif t == "remove_badge":
                self._remove_segment_badges(p["line_index"], p["segment_index"])
            elif t == "show_special_icon":
                self._show_special_icon(p["station_name"], p.get("run_time", 1.0))
            elif t == "arrange_transfers":
                self._upgrade_station_to_transfer(p["station_name"])
            elif t == "set_preview":
                self.preview_mode = p["enabled"]
                self.preview_fade_speed = p.get("fade_speed", 2.0)
            else:
                raise ValueError(f"未知步骤类型: {t}")

    # ---------- 预览 ----------
    def _run_preview(self, build_speed, camera_follow):
        for line_idx, path in enumerate(self.paths):
            for seg_idx in range(len(path.segments)):
                self._build_single_segment(line_idx, seg_idx, build_speed, camera_follow, add_to_scene=True)
        self.wait(0.5)
        animations = [FadeOut(mobj, run_time=self.preview_fade_speed) for mobj in self.segment_mobjects.values()]
        if animations:
            self.play(*animations, run_time=self.preview_fade_speed)
        self.segment_mobjects.clear()
        self.station_markers.clear()
        self.station_labels.clear()
        self._badges.clear()

    def _clear_all_animations(self):
        for mobj in list(self.segment_mobjects.values()):
            self.remove(mobj)
        for marker in self.station_markers.values():
            self.remove(marker)
        for label in self.station_labels.values():
            self.remove(label)
        for start_b, end_b, _, _ in self._badges:
            self.remove(start_b, end_b)
        self.segment_mobjects.clear()
        self.station_markers.clear()
        self.station_labels.clear()
        self._badges.clear()

    # ---------- 核心绘制函数 ----------
    def _create_segment_mobj(self, seg: TrackSegment, start_p, end_p, line_color):
        if seg.curve_type == "line":
            return Line(start_p, end_p, color=line_color, stroke_width=6)
        elif seg.curve_type == "arc":
            angle_rad = np.radians(seg.angle_deg) if seg.angle_deg else np.pi/2
            return ArcBetweenPoints(start_p, end_p, angle=angle_rad, color=line_color, stroke_width=6)
        elif seg.curve_type == "bezier":
            if seg.control1 is not None and seg.control2 is not None:
                c1 = self.mc_to_manim(np.array(seg.control1))
                c2 = self.mc_to_manim(np.array(seg.control2))
                return CubicBezier(start_p, c1, c2, end_p, color=line_color, stroke_width=6)
            elif seg.control1 is not None:
                c = self.mc_to_manim(np.array(seg.control1))
                return CubicBezier(start_p, c, c, end_p, color=line_color, stroke_width=6)
            else:
                return Line(start_p, end_p, color=line_color, stroke_width=6)
        else:
            return Line(start_p, end_p, color=line_color, stroke_width=6)

    def _create_station_marker(self, station: MetroStation, line_color_hex: str):
        center = self.mc_to_manim(station.pos_mc)
        color = manim_color_from_hex(line_color_hex)
        num_lines = len(station.lines)
        if num_lines >= 3:
            marker = Annulus(inner_radius=0.18, outer_radius=0.28, color=WHITE, fill_opacity=1)
            inner = Dot(center, radius=0.18, color=color, fill_opacity=1)
            marker.add(inner)
        elif num_lines == 2:
            marker = RoundedRectangle(width=0.5, height=0.5, corner_radius=0.1, color=WHITE, fill_color=color, fill_opacity=1, stroke_width=2)
            marker.move_to(center)
        else:
            marker = Dot(center, radius=0.22, color=WHITE, fill_opacity=1)
            inner = Dot(center, radius=0.16, color=color, fill_opacity=1)
            marker.add(inner)
        return marker

    def _create_station_label_group(self, station: MetroStation, preferred_direction: Optional[str] = None):
        center = self.mc_to_manim(station.pos_mc)
        label_width = max(len(station.name) * 0.15, 0.8)
        label_height = 0.4
        existing_bboxes = []
        for lbl in self.station_labels.values():
            rect = lbl.get_bounding_box()
            if rect:
                existing_bboxes.append((rect[0][0], rect[1][0], rect[0][1], rect[1][1]))
        pos = smart_label_position(center, existing_bboxes, preferred_direction, (label_width, label_height))
        label = create_station_label(station, position_offset=pos - center)
        label.move_to(pos, aligned_edge="center")
        return label

    def _build_line(self, line_idx: int, show_stations: bool, build_speed: float, camera_follow: bool):
        path = self.paths[line_idx]
        line_color = manim_color_from_hex(path.line_color_hex)
        # 预创建线段
        for seg_idx, seg in enumerate(path.segments):
            start_p = self.mc_to_manim(seg.start.pos_mc)
            end_p = self.mc_to_manim(seg.end.pos_mc)
            mobj = self._create_segment_mobj(seg, start_p, end_p, line_color)
            self.segment_mobjects[(line_idx, seg_idx)] = mobj
            start_dot = Dot(start_p, radius=0.08, color=line_color, fill_opacity=1)
            end_dot = Dot(end_p, radius=0.08, color=line_color, fill_opacity=1)
            mobj.add(start_dot, end_dot)
        # 动画播放
        train = Dot(color=YELLOW, radius=0.18)
        trail = TracedPath(train.get_center, stroke_color=line_color, stroke_width=6, dissipating_time=0.5)
        self.add(train, trail)
        if camera_follow:
            self._start_camera_follow(train)

        current_pos = self.mc_to_manim(path.stations[0].pos_mc)
        train.move_to(current_pos)
        for seg_idx, seg in enumerate(path.segments):
            end_p = self.mc_to_manim(seg.end.pos_mc)
            mobj = self.segment_mobjects[(line_idx, seg_idx)]
            seg_path = VMobject()
            seg_path.set_points(mobj.get_points())
            self.play(
                MoveAlongPath(train, seg_path, rate_func=linear, run_time=build_speed),
                FadeIn(mobj, run_time=build_speed/2),
                run_time=build_speed
            )
            if show_stations and seg.end.is_station:
                self._show_station(seg.end, line_color_hex=path.line_color_hex, build_speed=build_speed/2)
        self.remove(train, trail)
        if camera_follow:
            self._stop_camera_follow()
        self._add_segment_badges(line_idx, 0)
        self._add_segment_badges(line_idx, len(path.segments)-1)

    def _show_station(self, station: MetroStation, line_color_hex: str, build_speed: float):
        if station in self.station_markers:
            self._upgrade_station_to_transfer(station.name)
        else:
            marker = self._create_station_marker(station, line_color_hex)
            self.station_markers[station] = marker
            label = self._create_station_label_group(station)
            self.station_labels[station] = label
            self.play(FadeIn(marker, run_time=build_speed), Write(label, run_time=build_speed))

    def _upgrade_station_to_transfer(self, station_name: str):
        for station in self.all_stations:
            if station.name == station_name:
                if len(station.lines) < 2:
                    return
                if station in self.station_markers:
                    old_marker = self.station_markers[station]
                    # 选取其中一条线路颜色
                    for path in self.paths:
                        if path.line_name in station.lines:
                            line_color_hex = path.line_color_hex
                            break
                    new_marker = self._create_station_marker(station, line_color_hex)
                    self.play(ReplacementTransform(old_marker, new_marker), run_time=0.5)
                    self.station_markers[station] = new_marker
                return
        raise ValueError(f"未找到站点 {station_name}")

    # ---------- 摄像机跟随 ----------
    def _start_camera_follow(self, mobject):
        if self._camera_following:
            return
        self._camera_following = True
        aspect = get_camera_aspect_ratio(self.camera)
        def update_camera(frame):
            center = mobject.get_center()
            left_bound, right_bound, bottom_bound, top_bound = self.bg_bounds
            frame_width = frame.width
            frame_height = frame.height
            min_x = left_bound + frame_width/2
            max_x = right_bound - frame_width/2
            min_y = bottom_bound + frame_height/2
            max_y = top_bound - frame_height/2
            if min_x > max_x:
                cx = (left_bound + right_bound)/2
            else:
                cx = np.clip(center[0], min_x, max_x)
            if min_y > max_y:
                cy = (bottom_bound + top_bound)/2
            else:
                cy = np.clip(center[1], min_y, max_y)
            frame.move_to(np.array([cx, cy, 0]))
        self._camera_follow_updater = update_camera
        self.camera.frame.add_updater(update_camera)

    def _stop_camera_follow(self):
        if self._camera_follow_updater:
            self.camera.frame.clear_updaters()
            self._camera_following = False

    # ---------- 徽章 ----------
    def _add_segment_badges(self, line_idx, seg_idx):
        path = self.paths[line_idx]
        seg = path.segments[seg_idx]
        badge_info = self.line_badges[line_idx]
        start_pos = self.mc_to_manim(seg.start.pos_mc)
        end_pos = self.mc_to_manim(seg.end.pos_mc)
        def create_badge(pos):
            bg_color = manim_color_from_hex(badge_info.bg_color) if isinstance(badge_info.bg_color, str) else badge_info.bg_color
            rect = RoundedRectangle(width=badge_info.width, height=badge_info.height,
                                    corner_radius=0.1, fill_color=bg_color, fill_opacity=1, stroke_width=0)
            text = Text(badge_info.line_number, font="Microsoft YaHei", font_size=20, color=badge_info.text_color)
            badge = VGroup(rect, text)
            text.move_to(rect.get_center())
            badge.move_to(pos).shift(UP * 0.5)
            return badge
        start_badge = create_badge(start_pos)
        end_badge = create_badge(end_pos)
        self.play(FadeIn(start_badge), FadeIn(end_badge), run_time=0.3)
        self._badges.append((start_badge, end_badge, line_idx, seg_idx))

    def _remove_segment_badges(self, line_idx, seg_idx):
        to_keep = []
        for sb, eb, li, si in self._badges:
            if li == line_idx and si == seg_idx:
                self.play(FadeOut(sb), FadeOut(eb), run_time=0.3)
            else:
                to_keep.append((sb, eb, li, si))
        self._badges = to_keep

    # ---------- 收拢 ----------
    def _retract_line(self, line_idx, speed, camera_follow):
        path = self.paths[line_idx]
        for seg_idx in range(len(path.segments)-1, -1, -1):
            self._retract_single_segment(line_idx, seg_idx, speed, camera_follow)

    def _retract_single_segment(self, line_idx, seg_idx, speed, camera_follow):
        key = (line_idx, seg_idx)
        mobj = self.segment_mobjects.get(key)
        if mobj is None:
            return
        path = self.paths[line_idx]
        seg = path.segments[seg_idx]
        start_p = self.mc_to_manim(seg.start.pos_mc)
        end_p = self.mc_to_manim(seg.end.pos_mc)
        train = Dot(color=YELLOW, radius=0.18)
        train.move_to(end_p)
        self.add(train)
        if camera_follow:
            self._start_camera_follow(train)
        seg_path = VMobject()
        seg_path.set_points(mobj.get_points()[::-1])
        self.play(
            MoveAlongPath(train, seg_path, rate_func=linear, run_time=speed),
            mobj.animate.set_opacity(0),
            run_time=speed
        )
        self.remove(mobj, train)
        if camera_follow:
            self._stop_camera_follow()
        del self.segment_mobjects[key]

    # ---------- 特殊图标 ----------
    def _show_special_icon(self, station_name, run_time):
        for station in self.all_stations:
            if station.name == station_name and station.special_icon:
                node = station.special_icon
                pos = self.mc_to_manim(station.pos_mc)
                icon = ImageMobject(node.icon_path)
                icon.scale(node.scale)
                icon.move_to(pos).shift(RIGHT * 0.8)
                self.play(FadeIn(icon), run_time=run_time)
                if node.zoom_on_arrival:
                    self._zoom_to_point(pos, 2, 1.5, run_time=1.2)
                    self.wait(0.5)
                return
        raise ValueError(f"未找到特殊节点: {station_name}")

    # ---------- 相机缩放 ----------
    def _zoom_to_bounds(self, bounds, run_time):
        left, right, bottom, top = bounds
        center = np.array([(left+right)/2, (bottom+top)/2, 0])
        width = right - left
        height = top - bottom
        self.play(
            self.camera.frame.animate.move_to(center).set(width=width, height=height),
            run_time=run_time,
            rate_func=rate_functions.ease_in_out_sine
        )

    def _zoom_to_point(self, pos, width, height, run_time):
        self.play(
            self.camera.frame.animate.move_to(pos).set(width=width, height=height),
            run_time=run_time,
            rate_func=rate_functions.ease_in_out_sine
        )

    def _zoom_to_first_station(self, line_idx, zoom_ratio, run_time):
        path = self.paths[line_idx]
        first_station = path.stations[0]
        pos = self.mc_to_manim(first_station.pos_mc)
        new_width = self.full_map_width * zoom_ratio
        new_height = new_width / get_camera_aspect_ratio(self.camera)
        self._zoom_to_point(pos, new_width, new_height, run_time)

    def get_full_map_bounds(self, padding_ratio=0.05):
        left, right, bottom, top = self.bg_bounds
        pad_x = (right - left) * padding_ratio
        pad_y = (top - bottom) * padding_ratio
        return (left - pad_x, right + pad_x, bottom - pad_y, top + pad_y)

    def get_path_bounds(self, padding_ratio=0.15):
        if not self.all_stations:
            return self.get_full_map_bounds()
        positions = [self.mc_to_manim(s.pos_mc) for s in self.all_stations]
        xs = [p[0] for p in positions]
        ys = [p[1] for p in positions]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        pad_x = (max_x - min_x) * padding_ratio
        pad_y = (max_y - min_y) * padding_ratio
        return (min_x - pad_x, max_x + pad_x, min_y - pad_y, max_y + pad_y)