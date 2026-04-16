import json
import sys
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[1]
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from analyze_contract import analyze_contract_text  # noqa: E402


def main() -> None:
    sample_text = (
        "This is a sample data processing clause about personal data and user consent. "
        "The processor shall implement appropriate security measures."
    )
    result = analyze_contract_text(sample_text)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()


