import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDrop({
  accept,
  title,
  hint,
  fileName,
  onFile,
}: {
  accept: string;
  title: string;
  hint: string;
  fileName?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={cn(
        "w-full rounded-md border border-dashed px-4 py-5 text-center transition-colors",
        over
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-accent/40",
      )}
    >
      <Upload className="mx-auto h-4 w-4 text-muted-foreground" />
      <div className="mt-2 text-sm font-medium">{fileName ?? title}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {fileName ? "Click or drop to replace" : hint}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}
