import { Router, Request, Response } from "express";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { storagePut } from "./storage";
import { createPaper, updatePaper } from "./db";
import { runFullAnalysis } from "./paperAnalysis";
import { sdk } from "./_core/sdk";

// Configure multer for memory storage (files stay in RAM, then go to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word documents are supported"));
    }
  },
});

/**
 * Extract text from uploaded file buffer based on mimetype.
 */
async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === "application/pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    await parser.destroy();
    return textResult.text;
  } else if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error(`Unsupported file type: ${mimetype}`);
}

export function registerUploadRoutes(app: Router): void {
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Authenticate user from session cookie
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        return res.status(401).json({ error: "Authentication required" });
      }
      const userId = user.id;

      // 1. Upload file to S3
      const fileKey = `papers/${userId}/${Date.now()}-${file.originalname}`;
      const { key, url } = await storagePut(fileKey, file.buffer, file.mimetype);

      // 2. Create paper record
      const paperId = await createPaper({
        userId,
        fileKey: key,
        fileUrl: url,
        fileName: file.originalname,
        fileSize: file.size,
        status: "extracting",
      });

      // 3. Extract text
      let extractedText: string;
      try {
        extractedText = await extractText(file.buffer, file.mimetype);
        await updatePaper(paperId, {
          extractedText,
          status: "analyzing",
        });
      } catch (extractError) {
        await updatePaper(paperId, {
          status: "failed",
          errorMessage: `Text extraction failed: ${extractError instanceof Error ? extractError.message : "Unknown error"}`,
        });
        return res.status(200).json({ paperId, status: "failed", error: "Text extraction failed" });
      }

      // 4. Get user API key if provided
      const userApiKey = req.headers["x-openai-api-key"] as string | undefined;

      // 5. Start analysis in background (don't await)
      runFullAnalysis(paperId, extractedText, userApiKey).catch((err) => {
        console.error(`[Upload] Background analysis failed for paper ${paperId}:`, err);
      });

      // 5. Return immediately with paper ID
      return res.status(200).json({
        paperId,
        status: "analyzing",
        fileName: file.originalname,
      });
    } catch (error) {
      console.error("[Upload] Error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  });
}
