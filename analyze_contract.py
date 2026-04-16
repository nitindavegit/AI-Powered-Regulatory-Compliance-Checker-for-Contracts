import json
import os
from io import BytesIO
from typing import Dict, List, Optional, Tuple

try:
    import torch
    import torch.nn.functional as F
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
except Exception:  # pragma: no cover - allow heuristic fallback when ML deps fail
    torch = None
    F = None
    AutoModelForSequenceClassification = None
    AutoTokenizer = None


MODEL_PATH = "distilbert-base-uncased-finetuned-sst-2-english"
DEFAULT_LABEL_MAP = {
    0: "COMPLIANT",
    1: "RISKY",
    2: "NON-COMPLIANT",
    3: "AMBIGUOUS",
}


class ContractAnalyzer:
    def __init__(self, model_path: str = MODEL_PATH, label_map: Optional[Dict[int, str]] = None):
        self.model_path = model_path
        self.label_map = label_map or DEFAULT_LABEL_MAP
        self.tokenizer = None
        self.model = None
        self.model_available = False
        self.model_error = None

    def _load_model(self) -> None:
        if self.model_available and self.tokenizer is not None and self.model is not None:
            return

        if AutoTokenizer is None or AutoModelForSequenceClassification is None or torch is None or F is None:
            self.model_error = "transformer runtime unavailable"
            self.model_available = False
            return

        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_path)
            self.model.eval()
            label_count = int(getattr(self.model.config, "num_labels", 0) or 0)
            self.model_available = label_count == len(self.label_map)
            if not self.model_available:
                self.model_error = (
                    f"model label mismatch: expected {len(self.label_map)} labels, got {label_count}"
                )
        except Exception as exc:
            self.model_error = str(exc)
            self.model_available = False
            self.tokenizer = None
            self.model = None

    def analyze_text(self, contract_text: str) -> Dict:
        clauses = _split_into_clauses(contract_text)
        clause_outputs = []

        for clause in clauses:
            category = _detect_category(clause)
            regulations = _detect_regulations(clause)
            compliance_status, _conf = self.predict_compliance(clause, category)
            risk_level = _assess_risk(clause, category, compliance_status)
            issue, recommended_clause = _issue_and_recommendation(
                clause, category, regulations, compliance_status, risk_level
            )

            clause_outputs.append(
                {
                    "clause_text": clause,
                    "category": category,
                    "regulation": regulations,
                    "compliance_status": compliance_status,
                    "risk_level": risk_level,
                    "issue": issue,
                    "recommended_clause": recommended_clause,
                }
            )

        missing_clauses = _detect_missing_clauses(clause_outputs)

        risk_order = ["LOW RISK", "MEDIUM RISK", "HIGH RISK", "CRITICAL RISK"]
        max_risk_index = 0
        for clause_output in clause_outputs:
            idx = risk_order.index(clause_output["risk_level"])
            if idx > max_risk_index:
                max_risk_index = idx

        overall_contract_risk = risk_order[max_risk_index]
        summary = (
            f"The contract is assessed as {overall_contract_risk} based on clause-level data protection compliance, "
            f"with {len(missing_clauses)} key areas where important clauses appear to be missing or insufficient."
        )

        return {
            "clauses": clause_outputs,
            "missing_clauses": missing_clauses,
            "overall_contract_risk": overall_contract_risk,
            "summary": summary,
        }

    def analyze_file_bytes(self, file_bytes: bytes, filename: str) -> Dict:
        contract_text = extract_text_from_file_bytes(file_bytes, filename)
        return self.analyze_text(contract_text)

    def analyze_file_path(self, path: str) -> Dict:
        contract_text = extract_text_from_file_path(path)
        return self.analyze_text(contract_text)

    def predict_compliance(self, clause: str, category: str = "") -> Tuple[str, float]:
        self._load_model()
        if not self.model_available or self.tokenizer is None or self.model is None:
            return _predict_compliance_heuristic(clause, category)

        inputs = self.tokenizer(clause, return_tensors="pt", truncation=True, padding=True)

        with torch.no_grad():
            outputs = self.model(**inputs)

        probs = F.softmax(outputs.logits, dim=1)
        prediction = int(torch.argmax(probs, dim=1).item())
        confidence = float(probs.max().item())
        compliance_status = self.label_map.get(prediction, "UNKNOWN")
        if compliance_status == "UNKNOWN":
            return _predict_compliance_heuristic(clause, category)
        return compliance_status, confidence


_default_analyzer: Optional[ContractAnalyzer] = None


def get_analyzer(model_path: str = MODEL_PATH) -> ContractAnalyzer:
    global _default_analyzer
    if _default_analyzer is None or _default_analyzer.model_path != model_path:
        _default_analyzer = ContractAnalyzer(model_path=model_path)
    return _default_analyzer


def extract_text_from_file_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Extract text from uploaded document bytes.

    Supported formats: .txt, .pdf, .docx
    """
    ext = os.path.splitext(filename.lower())[1]

    if ext == ".txt":
        return file_bytes.decode("utf-8", errors="ignore").strip()

    if ext == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("PDF support requires the 'pypdf' package.") from exc

        reader = PdfReader(BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages).strip()

    if ext == ".docx":
        try:
            from docx import Document
        except ImportError as exc:
            raise RuntimeError("DOCX support requires the 'python-docx' package.") from exc

        document = Document(BytesIO(file_bytes))
        paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
        return "\n".join(paragraphs).strip()

    raise ValueError(f"Unsupported file type: '{ext}'. Use .txt, .pdf, or .docx.")


def extract_text_from_file_path(path: str) -> str:
    with open(path, "rb") as f:
        file_bytes = f.read()
    return extract_text_from_file_bytes(file_bytes, path)


def _split_into_clauses(text: str) -> List[str]:
    """
    Very simple clause splitter.
    Prefer user-provided clause boundaries (new lines, semicolons, periods).
    """
    # First split on new lines
    raw_parts = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        # Further split on sentence boundaries
        for part in line.replace(";", ".").split("."):
            part = part.strip()
            if part:
                raw_parts.append(part)

    # Filter out very short fragments
    clauses: List[str] = [c for c in raw_parts if len(c.split()) >= 3]
    return clauses


def _detect_category(clause: str) -> str:
    c = clause.lower()

    if any(k in c for k in ["collect", "gather", "obtain", "acquire data", "personal data", "pii"]):
        return "Data Collection"
    if any(k in c for k in ["process", "use of data", "processing activities", "profiling"]):
        return "Data Processing"
    if any(k in c for k in ["retain", "retention", "storage period", "stored for", "archive"]):
        return "Data Retention"
    if any(k in c for k in ["consent", "permission", "opt-in", "opt in", "opt-out", "opt out"]):
        return "User Consent"
    if any(k in c for k in ["share", "disclose", "transfer", "third party", "affiliate", "sub-processor", "subprocessor"]):
        return "Data Sharing"
    if any(k in c for k in ["encrypt", "encryption", "pseudonymisation", "security", "access control", "firewall", "security measures"]):
        return "Security Measures"
    if any(k in c for k in ["breach", "incident", "security incident", "notify", "notification", "data breach"]):
        return "Breach Notification"
    if any(k in c for k in ["processor", "controller", "sub-processor", "subprocessor", "data processing agreement"]):
        return "Third-Party Processing"
    if any(k in c for k in ["right of access", "right to access", "erase", "erasure", "delete", "deletion", "rectify", "rectification", "portability"]):
        return "User Rights"
    if any(k in c for k in ["liable", "liability", "indemnify", "indemnification", "hold harmless", "responsibility"]):
        return "Liability and Responsibility"
    if any(k in c for k in ["governing law", "jurisdiction", "venue", "court of", "laws of"]):
        return "Jurisdiction"
    if any(k in c for k in ["confidential", "confidentiality", "non-disclosure", "nda"]):
        return "Confidentiality"
    if any(k in c for k in ["comply with", "compliance with", "in accordance with", "gdpr", "hipaa", "ccpa", "data protection law"]):
        return "Compliance Statements"

    return "Uncategorized"


def _detect_regulations(clause: str) -> List[str]:
    c = clause.lower()
    regs = []

    if "gdpr" in c or "general data protection regulation" in c or "eea" in c or "european union" in c:
        regs.append("GDPR")
    if "hipaa" in c or "phi" in c or "protected health information" in c:
        regs.append("HIPAA")
    if "california" in c or "ccpa" in c or "cpra" in c:
        regs.append("CCPA")

    # Default to GDPR if generally about personal data but no explicit law
    if not regs and any(k in c for k in ["personal data", "pii", "data subject", "controller", "processor"]):
        regs.append("GDPR")

    return regs or ["GENERAL"]


def _assess_risk(clause: str, category: str, compliance_status: str) -> str:
    c = clause.lower()

    if compliance_status == "COMPLIANT":
        return "LOW RISK"
    if compliance_status == "RISKY":
        return "MEDIUM RISK"
    if compliance_status == "AMBIGUOUS":
        return "MEDIUM RISK"

    # Non-compliant or ambiguous cases
    # Critical risk examples
    if category in ["Data Retention", "Data Sharing", "Security Measures", "Breach Notification"]:
        if "indefinite" in c or "without limitation" in c or "any purpose" in c:
            return "CRITICAL RISK"
        if category == "Security Measures" and not any(k in c for k in ["encrypt", "encryption", "security", "appropriate technical and organisational"]):
            return "CRITICAL RISK"
        if category == "Breach Notification" and not any(k in c for k in ["notify", "notification", "hours", "days"]):
            return "CRITICAL RISK"

    # High risk
    if category in ["User Consent", "User Rights", "Third-Party Processing"] and compliance_status == "NON-COMPLIANT":
        return "HIGH RISK"

    if category == "Uncategorized" and compliance_status == "NON-COMPLIANT":
        return "MEDIUM RISK"

    return "MEDIUM RISK"


def _issue_and_recommendation(clause: str, category: str, regulations: List[str], compliance_status: str, risk_level: str) -> Tuple[str, str]:
    if compliance_status == "COMPLIANT":
        return "", ""

    regs_str = ", ".join(regulations)

    # Generic defaults
    issue = f"Clause appears {compliance_status.lower()} with {regs_str} requirements for {category}."
    recommended = (
        "The parties shall ensure that the collection and use of personal data is limited to what is necessary "
        "for specified, explicit and legitimate purposes and is carried out in compliance with all applicable "
        "data protection laws, including the implementation of appropriate technical and organisational measures."
    )

    c = clause.lower()

    if category == "Data Retention":
        issue = "Data retention is not clearly limited in duration or tied to specific purposes, risking non-compliance with storage limitation principles."
        recommended = (
            "Personal data shall be retained only for as long as necessary to fulfil the purposes for which it was collected, "
            "after which it shall be securely deleted or anonymised, unless a longer retention period is required by applicable law. "
            "The parties shall maintain a documented retention schedule specifying retention periods for each category of data."
        )
    elif category == "User Consent":
        issue = "User consent is not clearly defined as informed, specific, freely given and unambiguous."
        recommended = (
            "Where processing is based on consent, the controller shall obtain the data subject's prior, informed, specific and unambiguous consent, "
            "document such consent, and provide an easy mechanism for the data subject to withdraw consent at any time without detriment."
        )
    elif category == "Data Sharing":
        issue = "Data sharing with third parties is not subject to clear limitations, safeguards, or contractual controls."
        recommended = (
            "Personal data shall only be disclosed to third parties where necessary for the agreed purposes and subject to written agreements "
            "imposing data protection obligations that are no less protective than those set out in this Agreement and applicable data protection laws. "
            "Data shall not be sold or used for unrelated purposes without a separate lawful basis and, where required, explicit consent."
        )
    elif category == "Security Measures":
        issue = "Security obligations are vague and may not ensure an appropriate level of protection for personal data."
        recommended = (
            "Each party shall implement and maintain appropriate technical and organisational measures to protect personal data against "
            "unauthorised or unlawful processing and against accidental loss, destruction or damage, taking into account the state of the art, "
            "implementation costs, the nature, scope, context and purposes of processing and the risk to data subjects."
        )
    elif category == "Breach Notification":
        issue = "The agreement does not specify clear timeframes and content requirements for data breach notifications."
        recommended = (
            "In the event of a personal data breach, the processor shall notify the controller without undue delay and, in any event, "
            "no later than 72 hours after becoming aware of the breach, providing all information reasonably required for the controller to comply "
            "with its legal obligations, including the nature of the breach, categories and number of data subjects and records concerned, "
            "likely consequences, and measures taken or proposed to address the breach."
        )
    elif category == "User Rights":
        issue = "The clause does not adequately address data subject rights such as access, rectification, erasure and portability."
        recommended = (
            "The controller shall implement procedures to enable data subjects to exercise their rights of access, rectification, erasure, "
            "restriction of processing, data portability and objection, as required under applicable data protection laws, "
            "and shall respond to such requests without undue delay and within applicable statutory time limits."
        )

    # Slightly adapt generic recommendation where clause mentions health or California
    if "health" in c or "phi" in c:
        recommended += " Where protected health information is processed, the parties shall comply with HIPAA and any implementing regulations."
    if "california" in c:
        recommended += " Where data subjects are California residents, the parties shall ensure compliance with CCPA/CPRA, including notice, opt-out and non-discrimination obligations."

    return issue, recommended


def _detect_missing_clauses(clause_summaries: List[Dict]) -> List[str]:
    present_categories = {c["category"] for c in clause_summaries}
    missing = []

    required_mapping = {
        "Explicit user consent requirements": "User Consent",
        "Data retention policy": "Data Retention",
        "Data deletion and user rights": "User Rights",
        "Breach notification obligations": "Breach Notification",
        "Data processing purpose limitation": "Data Processing",
        "Data protection safeguards": "Security Measures",
        "Third-party data sharing restrictions": "Data Sharing",
    }

    for description, category in required_mapping.items():
        if category not in present_categories:
            missing.append(description)

    return missing


def _predict_compliance_heuristic(clause: str, category: str) -> Tuple[str, float]:
    text = clause.lower()

    strong_controls = [
        "shall", "must", "within", "days", "hours", "encrypt", "encryption",
        "delete", "erasure", "notify", "consent", "access", "rectification",
        "retention period", "data processing agreement", "appropriate technical",
        "organisational measures", "limited to", "solely for", "lawful basis",
    ]
    vague_terms = [
        "may", "as needed", "from time to time", "reasonable efforts",
        "where appropriate", "if practicable", "as soon as possible",
        "including but not limited to",
    ]

    if any(term in text for term in vague_terms):
        return "AMBIGUOUS", 0.51

    if category == "Data Retention":
        if any(term in text for term in ["years", "months", "days", "retain only", "retention period"]):
            return "COMPLIANT", 0.79
        return "NON-COMPLIANT", 0.76

    if category == "User Consent":
        if any(term in text for term in ["explicit consent", "prior consent", "withdraw consent", "opt-out", "opt out"]):
            return "COMPLIANT", 0.8
        return "NON-COMPLIANT", 0.77

    if category == "Data Sharing":
        if any(term in text for term in ["third party agreement", "solely for", "only as necessary", "subprocessor agreement"]):
            return "COMPLIANT", 0.77
        return "RISKY", 0.66

    if category == "Security Measures":
        if any(term in text for term in ["encrypt", "access control", "audit", "security measures", "technical and organisational"]):
            return "COMPLIANT", 0.82
        return "NON-COMPLIANT", 0.78

    if category == "Breach Notification":
        if "notify" in text and any(term in text for term in ["24 hours", "48 hours", "72 hours", "without undue delay"]):
            return "COMPLIANT", 0.81
        return "NON-COMPLIANT", 0.79

    if category == "User Rights":
        if any(term in text for term in ["access", "rectification", "erasure", "deletion", "portability", "objection"]):
            return "COMPLIANT", 0.79
        return "NON-COMPLIANT", 0.75

    if category == "Data Processing":
        if any(term in text for term in ["specified purpose", "legitimate purpose", "limited to", "solely for"]):
            return "COMPLIANT", 0.74
        return "RISKY", 0.63

    if len(text.split()) < 8:
        return "AMBIGUOUS", 0.54

    if any(term in text for term in strong_controls):
        return "COMPLIANT", 0.68

    return "RISKY", 0.6


def analyze_contract_text(contract_text: str) -> Dict:
    return get_analyzer().analyze_text(contract_text)


def analyze_contract_file_bytes(file_bytes: bytes, filename: str) -> Dict:
    return get_analyzer().analyze_file_bytes(file_bytes, filename)


def analyze_contract_file_path(path: str) -> Dict:
    return get_analyzer().analyze_file_path(path)


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        # read contract from the provided file path
        path = sys.argv[1]
        try:
            contract_text = extract_text_from_file_path(path)
        except Exception as e:
            print(f"Failed to read '{path}': {e}")
            sys.exit(1)
    else:
        # fall back to interactive input
        print("Enter contract text (finish with an empty line):")
        lines: List[str] = []
        while True:
            try:
                line = input()
            except EOFError:
                break
            if line.strip() == "":
                break
            lines.append(line)

        contract_text = "\n".join(lines)

    result = analyze_contract_text(contract_text)
    print(json.dumps(result, indent=2))

