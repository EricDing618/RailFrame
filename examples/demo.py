import sys
import os
# 将项目根目录（即父目录）添加到 Python 搜索路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from manimtr import MTRMapScene, RMGNetwork, Step

class MyHistory(MTRMapScene):
    def construct(self):
        # 无背景，白色，坐标范围根据实际修改
        self.setup_map(bg_image_path=None, mc_bounds=(0, 0, 2000, 2000))
        network = RMGNetwork.from_rmg("mtr_network.json")
        self.add_network(network)

        steps = [
            Step.zoom_to_first_station(line_index=0, zoom_ratio=0.3, run_time=1.5),
            Step.build_line(line_index=0, show_stations=True, speed=2.0),
            Step.arrange_transfers(station_name="人民广场"),  # 升级换乘
            Step.wait(1.0),
            Step.zoom_to_full_map(run_time=2.0),
        ]
        self.build_animation(steps)

# 运行: manim -pql demo.py MyHistory