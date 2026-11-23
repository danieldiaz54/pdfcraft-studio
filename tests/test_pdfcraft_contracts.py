"""Architectural, strict-typing, security, and anti-AI-slop contract suite for pdfcraft-studio."""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


class TestPdfCraftArchitectureAndAntiSlop(unittest.TestCase):
    def test_typescript_strict_and_zero_any(self) -> None:
        tsconfig = json.loads((REPO_ROOT / "tsconfig.json").read_text(encoding="utf-8"))
        opts = tsconfig["compilerOptions"]
        self.assertTrue(opts["strict"])
        self.assertTrue(opts["noUncheckedIndexedAccess"])

        any_pattern = re.compile(r"(:\s*any\b|\bas\s+any\b|<any>)")
        ts_files = list((REPO_ROOT / "src").rglob("*.ts")) + list(
            (REPO_ROOT / "src").rglob("*.tsx")
        )
        self.assertGreaterEqual(len(ts_files), 14)
        for path in ts_files:
            text = path.read_text(encoding="utf-8")
            self.assertIsNone(
                any_pattern.search(text),
                f"Forbidden 'any' type detected in {path.relative_to(REPO_ROOT)}",
            )

    def test_hexagonal_domain_purity(self) -> None:
        domain_files = list((REPO_ROOT / "src" / "domain").rglob("*.ts"))
        self.assertGreaterEqual(len(domain_files), 5)
        forbidden_imports = (
            "from \"react\"",
            "from \"pdf-lib\"",
            "from \"pdfjs-dist\"",
            "infrastructure/",
            "window.",
            "document.",
            "indexedDB",
        )
        for path in domain_files:
            content = path.read_text(encoding="utf-8")
            for needle in forbidden_imports:
                self.assertNotIn(
                    needle,
                    content,
                    f"Domain purity violation ({needle}) in {path.relative_to(REPO_ROOT)}",
                )

    def test_zero_unsafe_dom_sinks_or_network_uploads(self) -> None:
        ts_files = list((REPO_ROOT / "src").rglob("*.ts")) + list(
            (REPO_ROOT / "src").rglob("*.tsx")
        )
        for path in ts_files:
            content = path.read_text(encoding="utf-8")
            for sink in ("innerHTML", "outerHTML", "dangerouslySetInnerHTML", "eval("):
                self.assertNotIn(sink, content, f"Unsafe sink {sink} in {path}")
            self.assertNotIn("fetch(", content, f"Unexpected network fetch() in {path}")
            self.assertNotIn("XMLHttpRequest", content)

    def test_anti_ai_slop_typography_and_palette(self) -> None:
        index_html = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        tokens_css = (REPO_ROOT / "src" / "ui" / "styles" / "tokens.css").read_text(
            encoding="utf-8"
        )
        for font in ("Bricolage Grotesque", "Public Sans", "JetBrains Mono"):
            self.assertIn(font, tokens_css)
            self.assertIn(font.replace(" ", "+"), index_html)

        for banned_font in ('"Inter"', '"Roboto"', '"Open Sans"'):
            self.assertNotIn(banned_font, tokens_css)
        self.assertNotIn("#8B5CF6", tokens_css.upper())

    def test_sdd_contracts_adr_and_security_audit_exist(self) -> None:
        required_files = [
            "PRODUCT.md",
            "DESIGN.md",
            ".specs/01-domain/pdfcraft-product-and-architecture.spec.md",
            ".specs/02-ux/v2-prepress-light-table-ux.spec.md",
            ".specs/04-security/security-audit-report.spec.md",
            "docs/adr/001-hexagonal-local-first-pdf-pipeline.md",
        ]
        for rel in required_files:
            self.assertTrue((REPO_ROOT / rel).is_file(), f"Missing {rel}")

        canvas_src = (REPO_ROOT / "src" / "ui" / "components" / "DocumentCanvas.tsx").read_text(
            encoding="utf-8"
        )
        welcome_src = (REPO_ROOT / "src" / "ui" / "components" / "EmptyDropzone.tsx").read_text(
            encoding="utf-8"
        )
        self.assertIn("ResizeObserver", canvas_src)
        self.assertIn("onResizeAnnotation", canvas_src)
        self.assertIn("pc-specimen-stage", welcome_src)


if __name__ == "__main__":
    unittest.main()
