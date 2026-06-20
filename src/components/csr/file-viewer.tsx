"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileViewerProps {
  fileName: string;
  label: string;
  description?: string;
  content: string;
  language?: "text" | "bash" | "pem";
  variant?: "default" | "warning";
}

export function FileViewer({
  fileName,
  label,
  description,
  content,
  language = "text",
  variant = "default",
}: FileViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback - select text
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lineCount = content.split("\n").length;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden bg-card",
        variant === "warning" && "border-amber-300 dark:border-amber-700/50"
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm truncate">{label}</span>
            {description && (
              <span className="text-xs text-muted-foreground truncate">
                {description}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 gap-1.5 text-xs"
            aria-label={`کپی ${label}`}
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span>کپی شد</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>کپی</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 gap-1.5 text-xs"
            aria-label={`دانلود ${fileName}`}
          >
            <Download className="size-3.5" />
            <span>دانلود</span>
          </Button>
        </div>
      </div>
      <div className="relative">
        <div className="absolute top-2 left-3 z-10 text-[10px] font-mono text-muted-foreground/70 select-none">
          {fileName} · {lineCount} خط
        </div>
        <pre
          dir="ltr"
          className={cn(
            "code-block overflow-x-auto p-4 pt-8 text-xs leading-relaxed max-h-80 scrollbar-thin",
            "text-foreground/90"
          )}
        >
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
}
