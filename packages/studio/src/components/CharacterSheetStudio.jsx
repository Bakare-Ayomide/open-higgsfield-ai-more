"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generateI2I, uploadFile } from "../muapi.js";
import {
  Upload,
  Camera,
  Download,
  RefreshCw,
  Check,
  Sparkles,
  Sliders,
  Grid,
  Columns,
  Layers,
  User,
  Trash2,
  Maximize2,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCw,
  Square,
  History,
  FileText,
  AlertCircle
} from "lucide-react";

// ─── Camera Angles Definitions ───────────────────────────────────────────────

const DEFAULT_ANGLES = [
  {
    id: "front",
    name: "Front View",
    degree: "0°",
    perspective: "Eye Level Front",
    description: "Direct frontal eye-level view showing facial symmetry, front torso, and full frontal clothing details.",
    promptTemplate: "Character sheet model turnaround, direct front view at 0 degrees eye-level facing camera directly, neutral standing pose, identical face, same facial features, hairstyle, clothing, colors, and textures as in the reference image. Clean neutral studio light gray background, even soft illumination, professional character concept art sheet.",
    defaultSelected: true,
  },
  {
    id: "three_quarter",
    name: "3/4 Front View",
    degree: "45°",
    perspective: "Three-Quarter Turn",
    description: "Classic three-quarter front angle showing facial bone structure, side hair, and three-dimensional silhouette.",
    promptTemplate: "Character sheet model turnaround, three-quarter front view turned 45 degrees, showing depth of facial contours, cheekbones, side hairstyle and costume layers, exact same character with identical face, clothing, and accessories from reference image. Clean neutral studio background, uniform soft lighting.",
    defaultSelected: true,
  },
  {
    id: "profile",
    name: "Side Profile",
    degree: "90°",
    perspective: "Profile Side",
    description: "Direct side profile view showcasing nose bridge, jawline, posture, and lateral costume silhouette.",
    promptTemplate: "Character sheet model turnaround, 90-degree lateral side profile view facing sideways, clean silhouette showing facial profile, nose, jawline, ear placement, and side outfit, exact same character from reference image with identical features and clothes. Clean neutral studio background.",
    defaultSelected: true,
  },
  {
    id: "back",
    name: "Back View",
    degree: "180°",
    perspective: "Rear 180°",
    description: "Complete rear view displaying back of the head, hairstyle flow, back of garments, and posture.",
    promptTemplate: "Character sheet model turnaround, direct back view from behind at 180 degrees, showing back of head, hairstyle styling, rear clothing details, spine alignment, exact same character and outfit from reference image. Clean neutral studio background, even lighting.",
    defaultSelected: true,
  },
  {
    id: "closeup",
    name: "Close-up Portrait",
    degree: "Detail",
    perspective: "Facial Close-up",
    description: "Tight facial portrait capturing fine eye reflections, skin tone, facial expression, and hairline.",
    promptTemplate: "Character sheet detailed close-up portrait, bust shot focusing on facial features, eye details, mouth, skin texture, and hair flow, exact same character with identical facial structure from reference image. Clean soft portrait studio lighting, neutral background.",
    defaultSelected: false,
  },
  {
    id: "three_quarter_rear",
    name: "3/4 Rear View",
    degree: "135°",
    perspective: "Three-Quarter Back",
    description: "Over-the-shoulder rear angle completing the rotational turnaround perspective.",
    promptTemplate: "Character sheet model turnaround, three-quarter rear view turned 135 degrees from behind, showing rear-lateral angle of head, shoulder silhouette, and back jacket details, exact same character from reference image. Clean neutral studio background.",
    defaultSelected: false,
  },
  {
    id: "low_angle",
    name: "Low Angle (Heroic)",
    degree: "Low 30°",
    perspective: "Worm's Eye",
    description: "Slightly low camera angle looking up, lending stature, presence, and dynamic posture.",
    promptTemplate: "Character sheet dynamic low camera angle looking upward at the character, heroic presence and stature, maintaining exact same face, hair, clothing, and textures from reference image. Clean neutral studio backdrop, cinematic soft rim lighting.",
    defaultSelected: false,
  },
  {
    id: "high_angle",
    name: "High Angle (Elevated)",
    degree: "High 30°",
    perspective: "Elevated View",
    description: "Elevated perspective looking slightly downward, revealing hair crown and shoulder planes.",
    promptTemplate: "Character sheet high camera angle looking slightly downward at 30 degrees, showing top of hair, crown, shoulder lines, and posture, identical character from reference image. Clean neutral studio background, uniform lighting.",
    defaultSelected: false,
  }
];

const MODELS = [
  {
    id: "nano-banana-pro-edit",
    name: "Nano Banana Pro Edit",
    badge: "Recommended",
    description: "Highest consistency, detailed identity retention & resolution up to 4K",
    supportsResolution: true
  },
  {
    id: "nano-banana-edit",
    name: "Nano Banana Edit",
    badge: "Fast",
    description: "Fast multi-angle image-to-image character edits",
    supportsResolution: false
  },
  {
    id: "nano-banana-2-edit",
    name: "Nano Banana 2 Edit",
    badge: "v2",
    description: "Nano Banana generation 2 edit pipeline",
    supportsResolution: true
  }
];

const ASPECT_RATIOS = ["1:1", "3:4", "4:5", "9:16", "16:9"];
const RESOLUTIONS = ["1k", "2k", "4k"];

const STORAGE_KEY_HISTORY = "muapi_character_sheets_history";

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CharacterSheetStudio({ apiKey }) {
  // Model & Generation Config
  const [selectedModel, setSelectedModel] = useState("nano-banana-pro-edit");
  const [aspectRatio, setAspectRatio] = useState("3:4");
  const [resolution, setResolution] = useState("2k");
  const [characterName, setCharacterName] = useState("Hero Character");
  const [characterDescription, setCharacterDescription] = useState("");
  const [enforceNeutralBackground, setEnforceNeutralBackground] = useState(true);

  // Reference Image State
  const [referenceFile, setReferenceFile] = useState(null);
  const [referencePreview, setReferencePreview] = useState(null);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Angles & Results State
  const [angles, setAngles] = useState(DEFAULT_ANGLES);
  const [selectedAngleIds, setSelectedAngleIds] = useState(() =>
    DEFAULT_ANGLES.filter((a) => a.defaultSelected).map((a) => a.id)
  );
  // angleResults: { [angleId]: { url, timestamp, status: 'idle'|'generating'|'done'|'error', error?: string } }
  const [angleResults, setAngleResults] = useState({});
  const [activeGeneratingId, setActiveGeneratingId] = useState(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const abortControllerRef = useRef(null);

  // UI View Mode & Inspection
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'strip'
  const [inspectImage, setInspectImage] = useState(null); // { url, title, angle }
  const [isExportingMaster, setIsExportingMaster] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedAnglePromptId, setExpandedAnglePromptId] = useState(null);

  const fileInputRef = useRef(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  // Save history helper
  const saveSheetToHistory = useCallback((name, refUrl, resultsMap) => {
    try {
      const entry = {
        id: "sheet_" + Date.now(),
        name: name || "Character Sheet",
        timestamp: Date.now(),
        referenceUrl: refUrl,
        results: resultsMap,
      };
      setHistory((prev) => {
        const next = [entry, ...prev.filter((h) => h.id !== entry.id)].slice(0, 20);
        try {
          localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (e) {
      console.error("Failed to save character sheet history", e);
    }
  }, []);

  // ─── Reference Image Handlers ──────────────────────────────────────────────

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
  };

  const processSelectedFile = async (file) => {
    setUploadError(null);
    setReferenceFile(file);

    // Create local object URL for instant preview
    const previewUrl = URL.createObjectURL(file);
    setReferencePreview(previewUrl);

    // Upload to server/Muapi to obtain persistent URL
    setIsUploadingRef(true);
    try {
      const remoteUrl = await uploadFile(apiKey, file);
      setReferenceUrl(remoteUrl);
    } catch (err) {
      console.error("Reference upload error:", err);
      setUploadError("Upload failed: " + (err.message || "Failed to reach upload service"));
    } finally {
      setIsUploadingRef(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await processSelectedFile(file);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setReferenceUrl(urlInput.trim());
    setReferencePreview(urlInput.trim());
    setReferenceFile(null);
    setShowUrlInput(false);
    setUploadError(null);
  };

  const clearReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
    setReferenceUrl("");
    setUrlInput("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Presets ───────────────────────────────────────────────────────────────

  const applyPreset = (presetKey) => {
    if (presetKey === "standard4") {
      setSelectedAngleIds(["front", "three_quarter", "profile", "back"]);
    } else if (presetKey === "turnaround6") {
      setSelectedAngleIds(["front", "three_quarter", "profile", "three_quarter_rear", "back", "closeup"]);
    } else if (presetKey === "portraitPack") {
      setSelectedAngleIds(["closeup", "front", "low_angle", "high_angle"]);
    } else if (presetKey === "all") {
      setSelectedAngleIds(angles.map((a) => a.id));
    } else if (presetKey === "none") {
      setSelectedAngleIds([]);
    }
  };

  const toggleAngleSelection = (id) => {
    setSelectedAngleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ─── Prompt Assembly for an Angle ──────────────────────────────────────────

  const buildPromptForAngle = (angle) => {
    const parts = [];

    // Optional Character descriptor
    if (characterName && characterName.trim()) {
      parts.push(`Character: ${characterName.trim()}`);
    }
    if (characterDescription && characterDescription.trim()) {
      parts.push(`Description & traits: ${characterDescription.trim()}`);
    }

    // Core angle prompt
    parts.push(angle.promptTemplate);

    // Consistency reinforcement for Nano Banana
    parts.push(
      "Maintain exact facial identity, hair color and style, eyes, skin tone, garments, proportions, textures, and details strictly matching the reference image."
    );

    if (enforceNeutralBackground) {
      parts.push("Neutral clean gray studio background, uniform diffuse lighting, no background distractions.");
    }

    return parts.join(". ");
  };

  // ─── Single Angle Generation ───────────────────────────────────────────────

  const generateSingleAngle = async (angleId) => {
    if (!referenceUrl) {
      alert("Please upload or provide a character reference image first.");
      return;
    }

    const angle = angles.find((a) => a.id === angleId);
    if (!angle) return;

    setActiveGeneratingId(angleId);
    setAngleResults((prev) => ({
      ...prev,
      [angleId]: {
        ...(prev[angleId] || {}),
        status: "generating",
        error: null,
      },
    }));

    try {
      const prompt = buildPromptForAngle(angle);

      const params = {
        model: selectedModel,
        prompt,
        images_list: [referenceUrl],
        image_url: referenceUrl,
        aspect_ratio: aspectRatio,
      };

      const modelDef = MODELS.find((m) => m.id === selectedModel);
      if (modelDef?.supportsResolution) {
        params.resolution = resolution;
      }

      const res = await generateI2I(apiKey, params);
      const outputUrl = res.url || res.outputs?.[0] || res.output?.url;

      if (!outputUrl) {
        throw new Error("No output image URL returned from Nano Banana");
      }

      setAngleResults((prev) => {
        const updated = {
          ...prev,
          [angleId]: {
            url: outputUrl,
            timestamp: Date.now(),
            status: "done",
            error: null,
          },
        };
        saveSheetToHistory(characterName, referenceUrl, updated);
        return updated;
      });
    } catch (err) {
      console.error(`Generation error for ${angle.name}:`, err);
      setAngleResults((prev) => ({
        ...prev,
        [angleId]: {
          ...(prev[angleId] || {}),
          status: "error",
          error: err.message || "Generation failed",
        },
      }));
    } finally {
      setActiveGeneratingId(null);
    }
  };

  // ─── Batch Multi-Angle Generation ──────────────────────────────────────────

  const handleBatchGenerate = async () => {
    if (!referenceUrl) {
      alert("Please upload or provide a character reference image first.");
      return;
    }
    if (selectedAngleIds.length === 0) {
      alert("Please select at least one camera angle to generate.");
      return;
    }

    setIsBatchGenerating(true);
    abortControllerRef.current = false;

    // Set all selected to queued
    setAngleResults((prev) => {
      const next = { ...prev };
      selectedAngleIds.forEach((id) => {
        next[id] = { ...(next[id] || {}), status: "queued", error: null };
      });
      return next;
    });

    for (let i = 0; i < selectedAngleIds.length; i++) {
      if (abortControllerRef.current) break;

      const angleId = selectedAngleIds[i];
      await generateSingleAngle(angleId);
    }

    setIsBatchGenerating(false);
  };

  const handleCancelBatch = () => {
    abortControllerRef.current = true;
    setIsBatchGenerating(false);
    setActiveGeneratingId(null);
  };

  // ─── Export Composite Master Sheet (Collage Canvas) ────────────────────────

  const handleExportMasterSheet = async () => {
    const completedAngles = angles.filter(
      (a) => angleResults[a.id]?.status === "done" && angleResults[a.id]?.url
    );

    if (completedAngles.length === 0 && !referenceUrl) {
      alert("No completed camera angle images or reference to export yet.");
      return;
    }

    setIsExportingMaster(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Items to display: reference (if available) + all completed angles
      const itemsToDraw = [];
      if (referenceUrl) {
        itemsToDraw.push({
          title: "REFERENCE",
          subtitle: "Input Model",
          url: referencePreview || referenceUrl,
        });
      }
      completedAngles.forEach((a) => {
        itemsToDraw.push({
          title: a.name.toUpperCase(),
          subtitle: a.degree,
          url: angleResults[a.id].url,
        });
      });

      // Canvas dimensions
      const colWidth = 600;
      const colHeight = 800;
      const padding = 40;
      const gap = 24;
      const headerHeight = 160;

      const totalCols = itemsToDraw.length;
      canvas.width = padding * 2 + totalCols * colWidth + (totalCols - 1) * gap;
      canvas.height = padding * 2 + headerHeight + colHeight + 60;

      // Dark background
      ctx.fillStyle = "#0c0c0e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header Banner
      ctx.fillStyle = "#18181b";
      ctx.fillRect(padding, padding, canvas.width - padding * 2, headerHeight - 20);

      // Title & metadata
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText(characterName || "CHARACTER TURNAROUND SHEET", padding + 32, padding + 60);

      ctx.fillStyle = "#d9ff00";
      ctx.font = "600 22px monospace";
      ctx.fillText(`NANO BANANA MODEL SHEET  •  ${selectedModel.toUpperCase()}`, padding + 32, padding + 100);

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "18px sans-serif";
      const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      ctx.fillText(`Open Higgsfield AI Studio  |  Turnaround Angles: ${completedAngles.length}  |  Date: ${dateStr}`, padding + 32, padding + 128);

      // Helper to load image via Image object
      const loadImage = (src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => {
            // Fallback without crossOrigin or fail softly
            const fallbackImg = new Image();
            fallbackImg.onload = () => resolve(fallbackImg);
            fallbackImg.onerror = () => reject(new Error("Failed to load " + src));
            fallbackImg.src = src;
          };
          img.src = src;
        });
      };

      // Draw each column
      for (let i = 0; i < itemsToDraw.length; i++) {
        const item = itemsToDraw[i];
        const x = padding + i * (colWidth + gap);
        const y = padding + headerHeight;

        // Card frame
        ctx.fillStyle = "#141417";
        ctx.strokeStyle = "#27272a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, colWidth, colHeight, 16);
        ctx.fill();
        ctx.stroke();

        // Image boundary
        const imgPadding = 16;
        const imgX = x + imgPadding;
        const imgY = y + imgPadding;
        const imgW = colWidth - imgPadding * 2;
        const imgH = colHeight - 110;

        try {
          const img = await loadImage(item.url);
          // Scale to fit cover
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, imgW, imgH, 12);
          ctx.clip();

          // Calculate aspect ratio covering
          const hRatio = imgW / img.width;
          const vRatio = imgH / img.height;
          const ratio = Math.max(hRatio, vRatio);
          const centerShiftX = (imgW - img.width * ratio) / 2;
          const centerShiftY = (imgH - img.height * ratio) / 2;

          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            imgX + centerShiftX,
            imgY + centerShiftY,
            img.width * ratio,
            img.height * ratio
          );
          ctx.restore();
        } catch (imgErr) {
          console.warn("Could not draw image for canvas export:", item.title, imgErr);
          ctx.fillStyle = "#27272a";
          ctx.fillRect(imgX, imgY, imgW, imgH);
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.font = "20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Preview Unavailable", imgX + imgW / 2, imgY + imgH / 2);
          ctx.textAlign = "start";
        }

        // Label box below image
        ctx.fillStyle = "#0c0c0e";
        ctx.fillRect(x + imgPadding, y + colHeight - 80, colWidth - imgPadding * 2, 64);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText(item.title, x + imgPadding + 16, y + colHeight - 48);

        ctx.fillStyle = "#d9ff00";
        ctx.font = "600 16px monospace";
        ctx.fillText(item.subtitle, x + imgPadding + 16, y + colHeight - 24);
      }

      // Trigger download
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const cleanName = (characterName || "character")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");
      a.download = `${cleanName}-nano-banana-turnaround-sheet.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to export master sheet:", err);
      alert("Failed to export master sheet: " + err.message);
    } finally {
      setIsExportingMaster(false);
    }
  };

  const downloadImageDirectly = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const completedCount = angles.filter((a) => angleResults[a.id]?.status === "done").length;

  return (
    <div className="h-full flex flex-col bg-[#050505] text-white overflow-hidden">
      {/* ─── Top Control Strip ─── */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-white/5 bg-[#09090b] flex flex-wrap items-center justify-between gap-4">
        {/* Title & Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#d9ff00]/10 border border-[#d9ff00]/30 flex items-center justify-center text-[#d9ff00]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">Character Sheet Studio</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[#d9ff00]/20 text-[#d9ff00] border border-[#d9ff00]/40">
                Nano Banana
              </span>
            </div>
            <p className="text-xs text-white/50">
              Upload a character reference to generate consistent multi-angle camera turnarounds
            </p>
          </div>
        </div>

        {/* Configurations: Model, Ratio, Resolution */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Model Selector */}
          <div className="flex items-center bg-[#18181b] border border-white/10 rounded-lg p-1">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  selectedModel === m.id
                    ? "bg-[#d9ff00] text-black font-semibold shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title={m.description}
              >
                {m.name.replace("Nano Banana ", "")}
              </button>
            ))}
          </div>

          {/* Aspect Ratio */}
          <div className="flex items-center bg-[#18181b] border border-white/10 rounded-lg px-2 py-1 gap-1 text-xs">
            <span className="text-white/40 text-[11px] font-medium mr-1">Ratio:</span>
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-2 py-1 rounded transition-colors ${
                  aspectRatio === ar ? "bg-white/20 text-white font-bold" : "text-white/50 hover:text-white"
                }`}
              >
                {ar}
              </button>
            ))}
          </div>

          {/* Resolution (if supported) */}
          {MODELS.find((m) => m.id === selectedModel)?.supportsResolution && (
            <div className="flex items-center bg-[#18181b] border border-white/10 rounded-lg px-2 py-1 gap-1 text-xs">
              <span className="text-white/40 text-[11px] font-medium mr-1">Res:</span>
              {RESOLUTIONS.map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`px-2 py-1 rounded uppercase transition-colors ${
                    resolution === res ? "bg-white/20 text-white font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          )}

          {/* Master Sheet Export */}
          <button
            onClick={handleExportMasterSheet}
            disabled={isExportingMaster || (completedCount === 0 && !referenceUrl)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Stitch reference and generated angles into a single turnaround model sheet PNG"
          >
            {isExportingMaster ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-[#d9ff00]" />
            )}
            Export Master Sheet
          </button>

          {/* History Modal Toggle */}
          <button
            onClick={() => setShowHistory(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 text-xs"
            title="Saved character turnaround history"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Main Two-Column Workspace ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── Left Sidebar: Reference & Config ─── */}
        <div className="w-96 flex-shrink-0 border-r border-white/5 bg-[#0a0a0c] flex flex-col overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Reference Upload Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#d9ff00]" />
                  Character Reference
                </label>
                {referencePreview && (
                  <button
                    onClick={clearReference}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              {!referencePreview ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 hover:border-[#d9ff00]/60 bg-white/[0.02] hover:bg-[#d9ff00]/[0.03] rounded-2xl p-6 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-3 min-h-[220px]"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-[#d9ff00]/20 flex items-center justify-center text-white/50 group-hover:text-[#d9ff00] transition-all">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90 group-hover:text-white">
                      Drop character image here
                    </p>
                    <p className="text-xs text-white/40 mt-1">PNG, JPG, WEBP up to 20MB</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white/5 text-[11px] text-white/60 group-hover:bg-[#d9ff00] group-hover:text-black font-semibold transition-all">
                    Browse File
                  </span>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black group aspect-[3/4] max-h-[300px]">
                  <img
                    src={referencePreview}
                    alt="Character Reference"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-3 opacity-90 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/60 text-[#d9ff00] border border-[#d9ff00]/40 backdrop-blur-sm">
                        INPUT REFERENCE
                      </span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 rounded bg-black/70 hover:bg-black text-white text-[11px] backdrop-blur-sm transition-colors"
                      >
                        Change
                      </button>
                    </div>

                    <div>
                      {isUploadingRef ? (
                        <div className="flex items-center gap-2 text-xs text-[#d9ff00] bg-black/80 p-2 rounded-lg backdrop-blur-sm">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading reference to Nano Banana...</span>
                        </div>
                      ) : referenceUrl ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-black/80 px-2 py-1 rounded backdrop-blur-sm">
                          <Check className="w-3 h-3" /> Ready for turnaround generation
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {uploadError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* URL input fallback */}
              {!referencePreview && (
                <div className="pt-1">
                  {!showUrlInput ? (
                    <button
                      onClick={() => setShowUrlInput(true)}
                      className="text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Or load from image URL
                    </button>
                  ) : (
                    <div className="flex gap-1.5 mt-1">
                      <input
                        type="text"
                        placeholder="https://example.com/character.jpg"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#d9ff00]"
                      />
                      <button
                        onClick={handleApplyUrl}
                        className="px-2.5 py-1 rounded-lg bg-[#d9ff00] text-black font-semibold text-xs"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => setShowUrlInput(false)}
                        className="px-2 py-1 rounded-lg bg-white/5 text-white/50 text-xs hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Character Info & Consistency Options */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1">
                  Character Name / Title
                </label>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="e.g. Cyberpunk Mercenary"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#d9ff00]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1">
                  Extra Character Details (Optional)
                </label>
                <textarea
                  value={characterDescription}
                  onChange={(e) => setCharacterDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g., Braided silver hair, golden mechanical arm, worn brown leather jacket, emerald eyes"
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#d9ff00] resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <div>
                  <p className="text-xs font-medium text-white/80">Neutral Studio Backdrop</p>
                  <p className="text-[10px] text-white/40">Keeps background clean & lighting identical across all angles</p>
                </div>
                <input
                  type="checkbox"
                  checked={enforceNeutralBackground}
                  onChange={(e) => setEnforceNeutralBackground(e.target.checked)}
                  className="w-4 h-4 accent-[#d9ff00] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Presets Selector */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/70 block">
                Turnaround Angle Presets
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  onClick={() => applyPreset("standard4")}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 text-left transition-colors"
                >
                  Standard 4-Pack (90° turn)
                </button>
                <button
                  onClick={() => applyPreset("turnaround6")}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 text-left transition-colors"
                >
                  Full 6-Turnaround
                </button>
                <button
                  onClick={() => applyPreset("portraitPack")}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 text-left transition-colors"
                >
                  Portraits & Angles
                </button>
                <button
                  onClick={() => applyPreset("all")}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 text-left transition-colors"
                >
                  Select All (8)
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              {isBatchGenerating ? (
                <button
                  onClick={handleCancelBatch}
                  className="w-full py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4" /> Stop Generation
                </button>
              ) : (
                <button
                  onClick={handleBatchGenerate}
                  disabled={!referenceUrl || selectedAngleIds.length === 0 || isUploadingRef}
                  className="w-full py-3 px-4 rounded-xl bg-[#d9ff00] hover:bg-[#cbf000] text-black font-bold text-sm transition-all shadow-lg shadow-[#d9ff00]/10 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate {selectedAngleIds.length} Camera {selectedAngleIds.length === 1 ? "Angle" : "Angles"}
                </button>
              )}
              <p className="text-[11px] text-center text-white/40 mt-2">
                Powered by Nano Banana edit consistency engine
              </p>
            </div>
          </div>
        </div>

        {/* ─── Right Area: Angles Display & Workspace ─── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#070708]">
          {/* Sub-Header / View Mode Toolbar */}
          <div className="flex-shrink-0 px-6 py-2.5 border-b border-white/5 flex items-center justify-between bg-[#0b0b0e]">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-white/60 font-medium">
                Angles: <strong className="text-white">{selectedAngleIds.length} selected</strong>
              </span>
              <span className="text-white/20">•</span>
              <span className="text-white/60 font-medium">
                Completed:{" "}
                <strong className="text-[#d9ff00]">
                  {completedCount} / {angles.length}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                    viewMode === "grid" ? "bg-white/20 text-white font-semibold" : "text-white/40 hover:text-white"
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" /> Grid View
                </button>
                <button
                  onClick={() => setViewMode("strip")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                    viewMode === "strip" ? "bg-white/20 text-white font-semibold" : "text-white/40 hover:text-white"
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" /> Turnaround Strip
                </button>
              </div>
            </div>
          </div>

          {/* Active Generation Banner */}
          {isBatchGenerating && (
            <div className="bg-[#d9ff00]/10 border-b border-[#d9ff00]/20 px-6 py-2 flex items-center justify-between text-xs text-[#d9ff00]">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  Nano Banana is generating camera angles...{" "}
                  {activeGeneratingId ? `Currently rendering: ${angles.find((a) => a.id === activeGeneratingId)?.name}` : ""}
                </span>
              </div>
              <button
                onClick={handleCancelBatch}
                className="text-[11px] underline hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Angles View Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {angles.map((angle) => {
                  const isSelected = selectedAngleIds.includes(angle.id);
                  const result = angleResults[angle.id];
                  const isGenerating = activeGeneratingId === angle.id || result?.status === "generating";
                  const isDone = result?.status === "done" && result?.url;
                  const isError = result?.status === "error";

                  return (
                    <div
                      key={angle.id}
                      className={`relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden bg-[#111114] ${
                        isSelected
                          ? isDone
                            ? "border-[#d9ff00]/40 shadow-lg shadow-black/40"
                            : "border-white/20"
                          : "border-white/5 opacity-70"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAngleSelection(angle.id)}
                            className="w-4 h-4 accent-[#d9ff00] rounded cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-semibold text-white block">
                              {angle.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#d9ff00]/80">
                              {angle.degree} • {angle.perspective}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isGenerating ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#d9ff00]/20 text-[#d9ff00] border border-[#d9ff00]/30 animate-pulse">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Rendering
                            </span>
                          ) : isDone ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <Check className="w-2.5 h-2.5" /> Generated
                            </span>
                          ) : isError ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                              Failed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-white/40 bg-white/5">
                              Ready
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Image Preview / Placeholder */}
                      <div className="relative aspect-[3/4] bg-black/40 flex items-center justify-center overflow-hidden group">
                        {isDone ? (
                          <>
                            <img
                              src={result.url}
                              alt={angle.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                              <button
                                onClick={() =>
                                  setInspectImage({
                                    url: result.url,
                                    title: `${characterName || "Character"} — ${angle.name}`,
                                    angle: angle.degree,
                                  })
                                }
                                className="p-2.5 rounded-full bg-white/20 hover:bg-white text-black transition-colors"
                                title="Inspect fullscreen"
                              >
                                <Maximize2 className="w-4 h-4 text-white hover:text-black" />
                              </button>
                              <button
                                onClick={() =>
                                  downloadImageDirectly(
                                    result.url,
                                    `${characterName.toLowerCase().replace(/\s+/g, "-")}-${angle.id}.png`
                                  )
                                }
                                className="p-2.5 rounded-full bg-white/20 hover:bg-[#d9ff00] text-white hover:text-black transition-colors"
                                title="Download image"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => generateSingleAngle(angle.id)}
                                disabled={isGenerating || !referenceUrl}
                                className="p-2.5 rounded-full bg-white/20 hover:bg-white text-white hover:text-black transition-colors"
                                title="Regenerate this camera angle"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : isGenerating ? (
                          <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                            <div className="w-10 h-10 rounded-full border-2 border-[#d9ff00] border-t-transparent animate-spin" />
                            <p className="text-xs font-semibold text-[#d9ff00]">
                              Generating with Nano Banana...
                            </p>
                            <p className="text-[11px] text-white/40">Aligning camera angle to {angle.degree}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 text-center gap-2 text-white/30 group-hover:text-white/50 transition-colors">
                            <Camera className="w-8 h-8 stroke-[1.5]" />
                            <p className="text-xs font-medium">{angle.perspective}</p>
                            <p className="text-[11px] text-white/30 max-w-[180px]">
                              {angle.description}
                            </p>
                            <button
                              onClick={() => generateSingleAngle(angle.id)}
                              disabled={!referenceUrl || isGenerating}
                              className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#d9ff00] hover:text-black text-white/70 text-xs font-semibold border border-white/10 transition-all disabled:opacity-30"
                            >
                              Generate Angle
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Prompt View / Edit */}
                      <div className="p-2.5 bg-white/[0.01] border-t border-white/5 text-xs">
                        <button
                          onClick={() =>
                            setExpandedAnglePromptId(
                              expandedAnglePromptId === angle.id ? null : angle.id
                            )
                          }
                          className="w-full flex items-center justify-between text-white/50 hover:text-white transition-colors text-[11px]"
                        >
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Angle Prompt
                          </span>
                          {expandedAnglePromptId === angle.id ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {expandedAnglePromptId === angle.id && (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <textarea
                              rows={3}
                              value={angle.promptTemplate}
                              onChange={(e) => {
                                const newText = e.target.value;
                                setAngles((prev) =>
                                  prev.map((a) =>
                                    a.id === angle.id ? { ...a, promptTemplate: newText } : a
                                  )
                                );
                              }}
                              className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-[11px] text-white/80 focus:outline-none focus:border-[#d9ff00] resize-none"
                            />
                            <p className="text-[10px] text-white/40 mt-1">
                              Custom prompt override for this specific angle
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ─── Turnaround Strip View ─── */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#111114] border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {characterName || "Character"} — Turnaround Strip Alignment
                      </h3>
                      <p className="text-xs text-white/40">
                        Horizontal turnaround strip for 3D modeling and character consistency check
                      </p>
                    </div>
                    <button
                      onClick={handleExportMasterSheet}
                      disabled={completedCount === 0 && !referenceUrl}
                      className="px-3 py-1.5 rounded-lg bg-[#d9ff00] text-black font-semibold text-xs hover:bg-[#cbf000] transition-colors flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Strip
                    </button>
                  </div>

                  <div className="overflow-x-auto pb-4">
                    <div className="flex items-start gap-4 min-w-max">
                      {/* Reference Column */}
                      {referencePreview && (
                        <div className="w-60 flex-shrink-0 flex flex-col rounded-xl overflow-hidden border border-white/20 bg-black">
                          <div className="p-2 bg-white/10 text-[11px] font-bold text-[#d9ff00] text-center border-b border-white/10">
                            REFERENCE
                          </div>
                          <div className="aspect-[3/4] overflow-hidden">
                            <img
                              src={referencePreview}
                              alt="Reference"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-2 text-center text-[10px] text-white/50 bg-white/[0.02]">
                            Input Character
                          </div>
                        </div>
                      )}

                      {/* Generated Angles Columns */}
                      {angles.map((angle) => {
                        const res = angleResults[angle.id];
                        const isDone = res?.status === "done" && res?.url;

                        return (
                          <div
                            key={angle.id}
                            className="w-60 flex-shrink-0 flex flex-col rounded-xl overflow-hidden border border-white/10 bg-[#141417]"
                          >
                            <div className="p-2 bg-white/5 text-[11px] font-semibold text-white text-center border-b border-white/5 flex items-center justify-between px-3">
                              <span>{angle.name}</span>
                              <span className="font-mono text-[#d9ff00]">{angle.degree}</span>
                            </div>
                            <div className="aspect-[3/4] bg-black/60 flex items-center justify-center overflow-hidden">
                              {isDone ? (
                                <img
                                  src={res.url}
                                  alt={angle.name}
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={() =>
                                    setInspectImage({
                                      url: res.url,
                                      title: angle.name,
                                      angle: angle.degree,
                                    })
                                  }
                                />
                              ) : (
                                <div className="text-center p-4">
                                  <Camera className="w-6 h-6 text-white/20 mx-auto mb-2" />
                                  <p className="text-[11px] text-white/40">Not generated</p>
                                  <button
                                    onClick={() => generateSingleAngle(angle.id)}
                                    disabled={!referenceUrl}
                                    className="mt-2 text-[10px] px-2.5 py-1 rounded bg-white/10 hover:bg-[#d9ff00] hover:text-black transition-colors"
                                  >
                                    Render
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="p-2 text-center text-[10px] text-white/40 bg-white/[0.02] border-t border-white/5">
                              {angle.perspective}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Lightbox / Inspect Modal ─── */}
      {inspectImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
          <div className="relative max-w-4xl max-h-[90vh] bg-[#111] rounded-2xl border border-white/15 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{inspectImage.title}</h3>
                <span className="text-xs font-mono text-[#d9ff00]">Angle: {inspectImage.angle}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    downloadImageDirectly(inspectImage.url, `${inspectImage.title}.png`)
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#d9ff00] text-black text-xs font-semibold flex items-center gap-1.5 hover:bg-[#cbf000] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={() => setInspectImage(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black">
              <img
                src={inspectImage.url}
                alt={inspectImage.title}
                className="max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── History Modal ─── */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-2xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#d9ff00]" />
                <h2 className="text-base font-bold text-white">Character Sheets History</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-xs">
                  No saved character sheet sessions yet. Generate camera angles to build your turnaround history.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {item.referenceUrl && (
                        <img
                          src={item.referenceUrl}
                          alt={item.name}
                          className="w-12 h-16 object-cover rounded-lg border border-white/10"
                        />
                      )}
                      <div>
                        <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                        <p className="text-xs text-white/40">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                        <span className="text-[11px] text-[#d9ff00] font-mono">
                          {Object.keys(item.results || {}).length} angles generated
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCharacterName(item.name);
                          if (item.referenceUrl) {
                            setReferenceUrl(item.referenceUrl);
                            setReferencePreview(item.referenceUrl);
                          }
                          if (item.results) {
                            setAngleResults(item.results);
                          }
                          setShowHistory(false);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#d9ff00] text-black text-xs font-semibold hover:bg-[#cbf000] transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => {
                          const filtered = history.filter((h) => h.id !== item.id);
                          setHistory(filtered);
                          try {
                            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
                          } catch {}
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
