import { useState, useRef } from "react";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder = "uploads",
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await apiClient.storage
        .from("images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = apiClient.storage.from("images").getPublicUrl(fileName);
      onChange(data.publicUrl);
      toast.success("Gambar berhasil diupload");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal mengupload gambar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  if (value) {
    return (
      <div className={cn("relative group", className)}>
        <img
          src={value}
          alt="Preview"
          className="w-full h-40 object-cover rounded-lg border border-border"
        />
        <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemove}
          >
            <X className="w-4 h-4 mr-1" />
            Hapus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 h-40",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          isUploading && "pointer-events-none opacity-50"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Mengupload...</span>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Klik atau drag gambar</p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP, GIF (max 5MB)
              </p>
            </div>
          </>
        )}
      </div>
      <div className="mt-2">
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Atau masukkan URL gambar"
          className="text-sm"
        />
      </div>
    </div>
  );
}


