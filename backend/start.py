#!/usr/bin/env python3
import subprocess
import sys
import os
import signal
import time

processes = []

def signal_handler(sig, frame):
    print('\n正在停止所有服务...')
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=5)
        except:
            p.kill()
    print('所有服务已停止')
    sys.exit(0)

def run_setup(name, cmd, cwd):
    print(f'执行 {name}...')
    result = subprocess.run(
        cmd,
        cwd=cwd
    )
    if result.returncode != 0:
        print(f'{name} 失败')
        sys.exit(result.returncode)

def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print('=' * 50)
    print('知己肤 服务启动器')
    print('=' * 50)

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    run_setup('Django 数据迁移', ['python', 'services/django/manage.py', 'migrate'], project_root)
    
    services = [
        ('前端应用', ['npm', 'run', 'dev:web'], project_root, 3000),
        ('后端 API', ['npm', 'run', 'dev:api'], project_root, 8787),
        ('后台管理', ['npm', 'run', 'dev:admin'], project_root, 8788),
    ]
    
    for name, cmd, cwd, port in services:
        print(f'启动 {name} (端口 {port})...')
        try:
            p = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                shell=True,
                cwd=cwd
            )
            processes.append(p)
            time.sleep(1)
        except FileNotFoundError:
            print(f'错误: 找不到 npm，请确保 Node.js 已安装')
            signal_handler(None, None)
    
    print('=' * 50)
    print('所有服务已启动!')
    print('=' * 50)
    print()
    print('访问地址:')
    print('  前端应用: http://localhost:3000')
    print('  后端 API: http://localhost:8787')
    print('  后台管理: http://localhost:8788')
    print()
    print('按 Ctrl+C 停止所有服务')
    print()
    
    while True:
        time.sleep(1)
        for i, p in enumerate(processes):
            if p.poll() is not None:
                print(f'服务 {services[i][0]} 已退出')

if __name__ == '__main__':
    main()
