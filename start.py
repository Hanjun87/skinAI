#!/usr/bin/env python3
import socket
import subprocess
import sys
import os
import signal
import time

processes = []
PYTHON_EXECUTABLE = sys.executable
DJANGO_BOOTSTRAP = os.path.join('services', 'django', 'bootstrap.py')
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
NPM_EXECUTABLE = 'npm.cmd' if os.name == 'nt' else 'npm'
NPX_EXECUTABLE = 'npx.cmd' if os.name == 'nt' else 'npx'

def load_env_file(path):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as file:
        for raw_line in file:
            line = raw_line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

load_env_file(os.path.join(PROJECT_ROOT, '.env'))

WEB_PORT = int(os.getenv('WEB_PORT', '3000'))
DJANGO_PORT = int(os.getenv('DJANGO_PORT', '8788'))
API_PORT = int(os.getenv('API_PORT', '8790'))

def stop_all_processes():
    for p in processes:
        if p.poll() is not None:
            continue
        try:
            p.terminate()
            p.wait(timeout=5)
        except:
            p.kill()

def ensure_port_available(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        if sock.connect_ex(('127.0.0.1', port)) == 0:
            return False
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(('127.0.0.1', port))
        except OSError:
            return False
    return True

def find_available_port(preferred_port, reserved_ports=None, search_limit=50):
    reserved_ports = reserved_ports or set()
    for port in range(preferred_port, preferred_port + search_limit):
        if port in reserved_ports:
            continue
        if ensure_port_available(port):
            return port
    raise RuntimeError(f'未找到可用端口，起始端口 {preferred_port}')

def signal_handler(sig, frame):
    print('\n正在停止所有服务...')
    stop_all_processes()
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

    project_root = PROJECT_ROOT
    run_setup('Django 数据迁移', [PYTHON_EXECUTABLE, DJANGO_BOOTSTRAP, 'migrate'], project_root)
    run_setup('默认管理员初始化', [PYTHON_EXECUTABLE, DJANGO_BOOTSTRAP, 'bootstrap_admin'], project_root)

    selected_django_port = find_available_port(DJANGO_PORT)
    selected_api_port = find_available_port(API_PORT, reserved_ports={selected_django_port})
    selected_web_port = find_available_port(WEB_PORT, reserved_ports={selected_django_port, selected_api_port})

    if selected_web_port != WEB_PORT:
        print(f'提示: 前端默认端口 {WEB_PORT} 已被占用，已切换到 {selected_web_port}')
    if selected_django_port != DJANGO_PORT:
        print(f'提示: Django 默认端口 {DJANGO_PORT} 已被占用，已切换到 {selected_django_port}')
    if selected_api_port != API_PORT:
        print(f'提示: Node 默认端口 {API_PORT} 已被占用，已切换到 {selected_api_port}')

    services = [
        ('前端应用', [NPX_EXECUTABLE, 'vite', '--host=0.0.0.0', '--port', str(selected_web_port)], os.path.join('apps', 'web'), selected_web_port, {
            **os.environ,
            'VITE_DEV_PROXY_TARGET': f'http://localhost:{selected_django_port}'
        }),
        ('Django 主后端', [PYTHON_EXECUTABLE, DJANGO_BOOTSTRAP, 'runserver', f'0.0.0.0:{selected_django_port}'], '.', selected_django_port, {
            **os.environ,
            'DJANGO_PORT': str(selected_django_port)
        }),
        ('Node 兼容层', [NPM_EXECUTABLE, 'run', 'dev:api'], '.', selected_api_port, {
            **os.environ,
            'API_PORT': str(selected_api_port),
            'SKINAI_DJANGO_API_BASE_URL': f'http://127.0.0.1:{selected_django_port}'
        }),
    ]
    
    for name, cmd, cwd, port, env in services:
        print(f'启动 {name} (端口 {port})...')
        try:
            p = subprocess.Popen(
                cmd,
                shell=False,
                cwd=os.path.join(os.path.dirname(os.path.abspath(__file__)), cwd),
                env=env
            )
            processes.append(p)
            time.sleep(2)
            if p.poll() is not None:
                print(f'错误: {name} 启动失败，退出码 {p.returncode}')
                stop_all_processes()
                sys.exit(p.returncode or 1)
        except FileNotFoundError:
            print(f'错误: 找不到 {NPM_EXECUTABLE}，请确保 Node.js 已安装')
            signal_handler(None, None)
    
    print('=' * 50)
    print('所有服务已启动!')
    print('=' * 50)
    print()
    print('访问地址:')
    print(f'  前端应用: http://localhost:{selected_web_port}')
    print(f'  Django 主后端: http://localhost:{selected_django_port}')
    print(f'  Node 兼容层: http://localhost:{selected_api_port}')
    print()
    print('按 Ctrl+C 停止所有服务')
    print()
    
    reported_exits = set()
    while True:
        time.sleep(1)
        for i, p in enumerate(processes):
            if p.poll() is not None:
                if i in reported_exits:
                    continue
                reported_exits.add(i)
                print(f'错误: 服务 {services[i][0]} 已退出，退出码 {p.returncode}')
                stop_all_processes()
                sys.exit(p.returncode or 1)

if __name__ == '__main__':
    main()
