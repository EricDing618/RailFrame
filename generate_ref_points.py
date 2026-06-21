"""
参考点自动生成工具
用法：运行此脚本，按照提示打开地图图片，依次点击参考点（至少2个），
     输入对应的 Minecraft 世界坐标 (x, z)，脚本会输出 ref_points 代码段。
"""
import cv2
import numpy as np
import json

def click_points(image_path):
    img = cv2.imread(image_path)
    if img is None:
        print(f"错误：无法读取图片 {image_path}")
        return None
    clone = img.copy()
    points = []

    def click_event(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            points.append((x, y))
            cv2.circle(clone, (x, y), 5, (0, 255, 0), -1)
            cv2.putText(clone, f"({x},{y})", (x+5, y-5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 1)
            cv2.imshow("image", clone)
            print(f"已记录点 {len(points)}: 像素坐标 ({x}, {y})")

    cv2.imshow("image", clone)
    cv2.setMouseCallback("image", click_event)
    print("请依次点击地图上的参考点（例如西南角、东北角）...")
    print("点击完成后按 ESC 键退出")
    while True:
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break
    cv2.destroyAllWindows()
    return points

def main():
    print("=" * 50)
    print("MTR 动画框架 - 参考点生成工具")
    print("=" * 50)
    image_path = input("请输入地图图片路径: ").strip()
    points = click_points(image_path)
    if not points:
        print("未获取到任何点，退出。")
        return

    print(f"\n共获取到 {len(points)} 个点")
    ref_points = []
    for i, (px, py) in enumerate(points):
        print(f"\n--- 点 {i+1} ---")
        print(f"像素坐标: ({px}, {py})")
        world_x = float(input("对应的 Minecraft 世界 X 坐标: "))
        world_z = float(input("对应的 Minecraft 世界 Z 坐标: "))
        ref_points.append((px, py, world_x, world_z))

    print("\n" + "=" * 50)
    print("生成的 ref_points 代码（直接复制到 setup_map 中）：")
    print("ref_points = [")
    for rp in ref_points:
        print(f"    {rp},")
    print("]")
    print("=" * 50)

    save = input("\n是否保存到 ref_points.json 以便日后使用？(y/n): ").lower()
    if save == 'y':
        with open("ref_points.json", "w") as f:
            json.dump(ref_points, f, indent=2)
        print("已保存到 ref_points.json")

if __name__ == "__main__":
    main()