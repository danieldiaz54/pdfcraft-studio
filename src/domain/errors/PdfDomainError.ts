export type PdfDomainErrorCode =
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "EMPTY_EXPORT"
  | "CORRUPT_PDF"
  | "LAST_PAGE_PROTECTED"
  | "INVALID_ANNOTATION";

/** Explicit typed domain error with user-facing recovery guidance in Spanish. */
export class PdfDomainError extends Error {
  public readonly code: PdfDomainErrorCode;
  public readonly recoveryHint: string;

  public constructor(
    code: PdfDomainErrorCode,
    message: string,
    recoveryHint: string,
  ) {
    super(message);
    this.name = "PdfDomainError";
    this.code = code;
    this.recoveryHint = recoveryHint;
  }
}
