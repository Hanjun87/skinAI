# 模型接入说明

## 文件说明

- `best_model_state_dict.pt`：训练得到的最优权重
- `labels.json`：类别映射
- `manifest.json`：模型输入规格与归一化参数
- `infer.py`：单张图片推理脚本

## 快速推理

在项目根目录执行：

```bash
python model_package/infer.py --image 你的图片路径 --package-dir model_package --topk 3
```

输出为 top-k 类别与概率，可直接接入应用服务层。

## 输入规范

- 输入尺寸：`224x224`
- 通道顺序：`RGB`
- 归一化均值：`[0.485, 0.456, 0.406]`
- 归一化方差：`[0.229, 0.224, 0.225]`
