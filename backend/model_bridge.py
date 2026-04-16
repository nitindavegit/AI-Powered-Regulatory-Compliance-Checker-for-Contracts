import base64
import json
import sys
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[1]
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from analyze_contract import analyze_contract_file_bytes, analyze_contract_text  # noqa: E402


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        text = payload.get("text")
        file_name = payload.get("fileName") or "uploaded_contract.txt"
        file_content_base64 = payload.get("fileContentBase64")

        if file_content_base64:
            file_bytes = base64.b64decode(file_content_base64)
            result = analyze_contract_file_bytes(file_bytes, file_name)
        elif text and str(text).strip():
            result = analyze_contract_text(str(text))
        else:
            raise ValueError("Either fileContentBase64 or text is required.")

        sys.stdout.write(json.dumps(result))
        return 0
    except Exception as exc:
        sys.stderr.write(str(exc))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
