import base64
import re
from pathlib import Path
from pypdf import PdfReader


PDF_PATH = Path(__file__).resolve().parents[1] / "pdf_form.pdf"
PDF_ASSET_PATH = Path(__file__).resolve().parents[1] / "pdf-assets.js"
EXPECTED_FIELDS = {
    "เขียนที่", "วันที่", "ผู้กู้", "ตําแหน่ง", "สังกัด",
    "จำนวนเงินที่ขอกู้", "จำนวนเงินเป็นตัวอักษร", "ระยะเวลาผ่อน (เดือน)",
    "ยอดผ่อนรายเดือน", "วันที่รับเงิน", "เดือนที่รับเงิน",
    "เดือนที่ชําระเงินกู้งวดสุดท้าย", "ปี พ.ศ. ที่รับเงิน",
    "ปี พ.ศ. ที่ชําระเงินกู้งวดสุดท้าย", "ผู้ค้ำ ที่1", "ผู้ค้ำ ที่2",
    "loan_purpose", "attachment_1_1", "attachment_1_2",
    "attachment_1_3", "attachment_1_4", "attachment_1_5", "attachment_1_6",
    "attachment_1_7",
}


reader = PdfReader(PDF_PATH)
fields = reader.get_fields() or {}
missing = sorted(EXPECTED_FIELDS - set(fields))
assert not missing, f"PDF form is missing fields: {missing}"

asset_content = PDF_ASSET_PATH.read_text(encoding="utf-8")
asset_match = re.search(r"PDF_TEMPLATE_BASE64\s*=\s*'([^']+)'", asset_content)
assert asset_match, "PDF asset is missing PDF_TEMPLATE_BASE64"
assert base64.b64decode(asset_match.group(1)) == PDF_PATH.read_bytes(), (
    "Embedded PDF template is outdated. Regenerate pdf-assets.js from pdf_form.pdf."
)

purpose = fields["loan_purpose"]
purpose_options = {str(option).lstrip("/") for option in purpose.get("/_States_", [])}
assert {"education", "housing", "equipment", "emergency", "retirement"}.issubset(purpose_options), purpose_options

print(f"PDF field mapping passed ({len(EXPECTED_FIELDS)} required fields; embedded template is current)")
