import debug from "debug";
import dotenv from "dotenv";
import { fileTypeFromBuffer } from "file-type";

// Import shared authentication utilities
import sharp from "sharp";
import { hasSufficientTier } from "../../shared/tier-gating.js";
import {
    fetchFromLeastBusyFluxServer,
    getNextTurboServerUrl,
} from "./availableServers.ts";
import {
    addPollinationsLogoWithImagemagick,
    getLogoPath,
} from "./imageOperations.ts";
import { sanitizeString } from "./translateIfNecessary.ts";
import {
    analyzeImageSafety,
    analyzeTextSafety,
    type ContentSafetyFlags,
} from "./utils/azureContentSafety.ts";
import type { TrackingData } from "./utils/trackingHeaders.ts";

// Import GPT Image logging utilities
import { logGptImageError, logGptImagePrompt } from "./utils/gptImageLogger.ts";
// Import user stats tracker for violation logging
import { userStatsTracker } from "./utils/userStatsTracker.ts";
// Import violation ratio checker
import { checkViolationRatio, recordGptImageRequest } from "./utils/violationRatioChecker.ts";
// Import Vertex AI Gemini image generator
import { callVertexAIGemini } from "./vertexAIImageGenerator.js";
import { writeExifMetadata } from "./writeExifMetadata.ts";
import type { ImageParams } from "./params.ts";
import { withTimeoutSignal } from "./util.ts";
import type { ProgressManager } from "./progressBar.ts";

// Import model handlers
import { callBPAIGenWithKontextFallback } from "./models/bpaigenModel.ts";
import { callSeedreamAPI } from "./models/seedreamModel.ts";
import { callAzureFluxKontext, type ImageGenerationResult as FluxImageGenerationResult } from "./models/azureFluxKontextModel.js";

dotenv.config();