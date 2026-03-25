import importlib.util
import os
import subprocess
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent
VENV_DIR = PROJECT_ROOT / ".venv"
REQUIREMENTS_FILE = BASE_DIR / "requirements.txt"
MANAGE_PY = BASE_DIR / "manage.py"


def get_venv_python():
    if os.name == "nt":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def ensure_virtualenv():
    venv_python = get_venv_python()
    if venv_python.exists():
        return venv_python
    subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True, cwd=PROJECT_ROOT)
    return venv_python


def package_installed(python_executable: Path, package_name: str):
    command = [
        str(python_executable),
        "-c",
        f"import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('{package_name}') else 1)",
    ]
    result = subprocess.run(command, cwd=PROJECT_ROOT)
    return result.returncode == 0


def ensure_requirements(python_executable: Path):
    required_packages = ("django", "psycopg")
    if all(package_installed(python_executable, package_name) for package_name in required_packages):
        return
    subprocess.run(
        [str(python_executable), "-m", "pip", "install", "-r", str(REQUIREMENTS_FILE)],
        check=True,
        cwd=PROJECT_ROOT,
    )


def main():
    if len(sys.argv) < 2:
        raise SystemExit("请传入 Django manage.py 子命令")

    venv_python = ensure_virtualenv()
    ensure_requirements(venv_python)
    command = [str(venv_python), str(MANAGE_PY), *sys.argv[1:]]
    result = subprocess.run(command, cwd=PROJECT_ROOT)
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
