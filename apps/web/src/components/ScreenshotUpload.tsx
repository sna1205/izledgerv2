import { useCallback, useState, useRef } from "react";
import { CameraOff, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScreenshotUploadProps {
  screenshots: string[];
  onChange: (screenshots: string[]) => void;
  maxFiles?: number;
}

export function ScreenshotUpload({ screenshots, onChange, maxFiles = 3 }: ScreenshotUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = maxFiles - screenshots.length;
    const toProcess = Array.from(files).slice(0, remaining);
    
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onChange([...screenshots, result]);
      };
      reader.readAsDataURL(file);
    });
  }, [screenshots, onChange, maxFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleFiles(new DataTransfer().files); // trick
        const reader = new FileReader();
        reader.onload = (ev) => {
          onChange([...screenshots, ev.target?.result as string]);
        };
        if (file) reader.readAsDataURL(file);
      }
    }
  }, [screenshots, onChange]);

  const removeScreenshot = (index: number) => {
    onChange(screenshots.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      {screenshots.length < maxFiles && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            dragOver ? "border-foreground bg-accent" : "border-border hover:border-muted-foreground"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drop, paste, or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {screenshots.length}/{maxFiles} screenshots
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {screenshots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {screenshots.map((src, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border">
              <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-32 object-cover" />
              <button
                type="button"
                onClick={() => removeScreenshot(i)}
                className="absolute top-1 right-1 p-1 rounded bg-foreground/80 text-background opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {screenshots.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CameraOff className="h-3 w-3" />
          <span>No screenshots uploaded</span>
        </div>
      )}
    </div>
  );
}
