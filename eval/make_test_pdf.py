"""Generate the fictional test document used by the RAG evaluation.

Fictional on purpose: the LLM cannot answer these from prior knowledge, so the
eval genuinely tests retrieval + grounding, not the model's memory.

    python eval/make_test_pdf.py
-> writes eval/test_corpus/zephyr_one_manual.pdf
"""
import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

NL = {"new_x": XPos.LMARGIN, "new_y": YPos.NEXT}  # reset to left margin, next line

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_corpus")
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, "zephyr_one_manual.pdf")

SECTIONS = [
    ("Zephyr One - Owner's Manual & Company Guide", None),
    ("1. About Zephyr Dynamics", [
        "Zephyr Dynamics Inc. was founded in March 2019 in Boulder, Colorado.",
        "The company was founded by Dr. Elena Marsh, who currently serves as Chief Executive Officer.",
        "As of 2025, Zephyr Dynamics employs 240 people across three offices.",
        "The company's flagship consumer product is the Zephyr One quadcopter drone.",
    ]),
    ("2. Zephyr One - Technical Specifications", [
        "The Zephyr One has a takeoff weight of 249 grams.",
        "Maximum flight time is 34 minutes on a single fully charged battery.",
        "The maximum transmission range is 12 kilometers in an unobstructed environment.",
        "The onboard camera is 48 megapixels and records 4K video at 60 frames per second.",
        "The battery is a 2200 mAh lithium-polymer pack with a charge time of 68 minutes.",
        "In Sport mode the Zephyr One reaches a maximum speed of 68 kilometers per hour.",
        "Wind resistance is rated up to Level 5, which is approximately 38 kilometers per hour.",
        "The operating temperature range is -10 degrees Celsius to 40 degrees Celsius.",
        "Internal storage is 32 GB and a microSD card of up to 512 GB is supported.",
        "The drone is controlled with the 'Zephyr Pilot' mobile app for iOS and Android.",
        "The current firmware version at launch is 4.2.1.",
    ]),
    ("3. Pricing", [
        "The Zephyr One Standard kit is priced at 799 US dollars.",
        "The Zephyr One Fly More combo, which adds two extra batteries and a carry case, costs 1,049 US dollars.",
    ]),
    ("4. Warranty and Support", [
        "The Zephyr One includes a 24-month warranty from the date of purchase.",
        "The warranty covers manufacturing defects but does not cover crash damage or water damage.",
        "Zephyr Care Plus is an optional protection plan costing 129 US dollars per year.",
        "Zephyr Care Plus covers accidental damage and includes up to two replacement units per year.",
        "Products may be returned within 30 days of purchase for a full refund.",
        "Customer support is available by email at support@zephyrdynamics.example.",
        "The support phone line is +1-800-555-0142.",
        "Support hours are Monday to Friday, 8:00 AM to 6:00 PM Mountain Time.",
    ]),
    ("5. Safety and Regulations", [
        "By default, the flight altitude is software-capped to 500 meters above the takeoff point.",
        "The absolute maximum service ceiling is 6,000 meters above sea level.",
        "Do not operate the Zephyr One within 5 kilometers of any airport.",
        "In the United States, recreational flights are limited to 400 feet (122 meters) above ground level without a waiver.",
        "Because the Zephyr One weighs 249 grams, it falls under the 250-gram threshold and does not require FAA registration for recreational use.",
    ]),
]


def build():
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    for i, (title, bullets) in enumerate(SECTIONS):
        if bullets is None:  # cover title
            pdf.set_font("Helvetica", "B", 18)
            pdf.multi_cell(0, 12, title, **NL)
            pdf.ln(4)
            pdf.set_font("Helvetica", "I", 11)
            pdf.multi_cell(0, 8, "Zephyr Dynamics Inc. - Confidential product documentation (fictional, for testing).", **NL)
            pdf.ln(6)
            continue
        pdf.set_font("Helvetica", "B", 14)
        pdf.multi_cell(0, 10, title, **NL)
        pdf.set_font("Helvetica", "", 12)
        for b in bullets:
            pdf.multi_cell(0, 8, f"- {b}", **NL)
        pdf.ln(4)
    pdf.output(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
