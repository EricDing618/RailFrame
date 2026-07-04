"""
参考点自动生成工具（增强版）
用法：运行此脚本，按照提示打开地图图片，依次点击参考点（至少2个），
     输入对应的 Minecraft 世界坐标 (x, z)，脚本会输出 ref_points 代码段。
新增功能：
    - 右键点击撤销上一个点
    - 按 R 键重置所有点
    - 自动缩放图片以适应屏幕，点击坐标自动映射回原始图片尺寸
    - 输入坐标时支持重试，并显示当前点的像素坐标
    - 实时显示已采集的点列表
    - 至少需要 2 个点才能生成代码，推荐 3 个以上
"""
import cv2
import numpy as np
import json

class PointPicker:
    def __init__(self, image_path):
        self.original_img = cv2.imread(image_path)
        if self.original_img is None:
            raise FileNotFoundError(f"无法读取图片: {image_path}")
        self.original_h, self.original_w = self.original_img.shape[:2]
        
        self.scale = 1.0
        self.display_img = self._resize_for_display()
        self.display_h, self.display_w = self.display_img.shape[:2]
        
        self.points = []
        self.window_name = "参考点标定工具"
        self.running = True

    def _resize_for_display(self, max_width=1200, max_height=800):
        h, w = self.original_h, self.original_w
        scale_w = max_width / w
        scale_h = max_height / h
        self.scale = min(scale_w, scale_h)
        if self.scale < 1.0:
            new_w = int(w * self.scale)
            new_h = int(h * self.scale)
            display = cv2.resize(self.original_img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        else:
            display = self.original_img.copy()
            self.scale = 1.0
        return display

    def _map_display_to_original(self, dx, dy):
        ox = int(dx / self.scale)
        oy = int(dy / self.scale)
        ox = max(0, min(ox, self.original_w - 1))
        oy = max(0, min(oy, self.original_h - 1))
        return ox, oy

    def _draw_points(self):
        img_copy = self.display_img.copy()
        for idx, (ox, oy) in enumerate(self.points):
            dx = int(ox * self.scale)
            dy = int(oy * self.scale)
            cv2.circle(img_copy, (dx, dy), 6, (0, 255, 0), -1)
            cv2.putText(img_copy, f"{idx+1}", (dx+5, dy-5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            cv2.putText(img_copy, f"({ox},{oy})", (dx+5, dy+10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 0), 1)
        return img_copy

    def _show_info(self):
        title = f"{self.window_name} - 已选点: {len(self.points)} (右键撤销 | R重置 | ESC完成)"
        cv2.setWindowTitle(self.window_name, title)

    def mouse_callback(self, event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            ox, oy = self._map_display_to_original(x, y)
            self.points.append((ox, oy))
            print(f"[+] 添加点 {len(self.points)}: 原始坐标 ({ox}, {oy})")
            self.refresh_display()
        elif event == cv2.EVENT_RBUTTONDOWN:
            if self.points:
                removed = self.points.pop()
                print(f"[-] 撤销点 {len(self.points)+1}: 原始坐标 {removed}")
                self.refresh_display()
            else:
                print("[提示] 没有可撤销的点")

    def refresh_display(self):
        img_with_points = self._draw_points()
        cv2.imshow(self.window_name, img_with_points)
        self._show_info()

    def run(self):
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(self.window_name, self.display_w, self.display_h)
        self.refresh_display()
        cv2.setMouseCallback(self.window_name, self.mouse_callback)
        
        print("\n=== 操作说明 ===")
        print("左键点击：添加参考点")
        print("右键点击：撤销上一个点")
        print("按 R 键：重置所有点")
        print("按 ESC 键：完成采集并继续\n")
        
        while self.running:
            key = cv2.waitKey(1) & 0xFF
            if key == 27:
                self.running = False
            elif key == ord('r') or key == ord('R'):
                self.points.clear()
                print("[*] 已重置所有点")
                self.refresh_display()
        
        cv2.destroyAllWindows()
        return self.points

def get_world_coordinates(point_index, pixel_coord):
    while True:
        print(f"\n--- 点 {point_index+1} ---")
        print(f"像素坐标: ({pixel_coord[0]}, {pixel_coord[1]})")
        try:
            world_x = input("请输入 Minecraft 世界 X 坐标: ").strip()
            if world_x.lower() == 'q':
                return None
            world_x = float(world_x)
            world_z = input("请输入 Minecraft 世界 Z 坐标: ").strip()
            if world_z.lower() == 'q':
                return None
            world_z = float(world_z)
            return (world_x, world_z)
        except ValueError:
            print("❌ 输入无效，请输入数字坐标。输入 'q' 可跳过当前点。")

def main():
    print("=" * 60)
    print("MTR 动画框架 - 增强版参考点生成工具")
    print("=" * 60)
    image_path = input("请输入地图图片路径: ").strip()
    
    try:
        picker = PointPicker(image_path)
    except FileNotFoundError as e:
        print(e)
        return
    
    points_pixel = picker.run()
    
    if len(points_pixel) < 2:
        print(f"\n⚠️ 至少需要 2 个参考点，当前只有 {len(points_pixel)} 个。")
        print("请重新运行脚本并采集足够的点。")
        return
    
    print(f"\n✅ 共采集到 {len(points_pixel)} 个像素点")
    
    ref_points = []
    for idx, (px, py) in enumerate(points_pixel):
        result = get_world_coordinates(idx, (px, py))
        if result is None:
            print("⚠️ 用户跳过，放弃该点")
            continue
        wx, wz = result
        ref_points.append((px, py, wx, wz))
    
    if len(ref_points) < 2:
        print("❌ 有效参考点不足 2 个，无法生成映射。")
        return
    
    print("\n" + "=" * 60)
    print("生成的 ref_points 代码（直接复制到 setup_map 中）：")
    print("ref_points = [")
    for rp in ref_points:
        print(f"    {rp},")
    print("]")
    print("=" * 60)
    
    if len(ref_points) >= 3:
        print("✅ 使用了 3 个或更多点，主框架将自动采用仿射变换（可纠正旋转/倾斜）。")
    else:
        print("⚠️ 仅使用了 2 个点，主框架将采用缩放+平移映射（假设地图已正射校正）。")
        print("   推荐使用 3 个及以上参考点获得更精确的配准。")
    
    save = input("\n是否保存到 ref_points.json 以便日后使用？(y/n): ").strip().lower()
    if save == 'y':
        output = {"image_path": image_path, "ref_points": ref_points}
        with open("ref_points.json", "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print("✅ 已保存到 ref_points.json（包含图片路径和参考点）")
    else:
        print("未保存。")

if __name__ == "__main__":
    main()