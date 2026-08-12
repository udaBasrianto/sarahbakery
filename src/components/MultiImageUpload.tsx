import { useState, useRef } from "react";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MultiImageUploadProps {
  images: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  maxImages?: number;
  className?: string;
}

export function MultiImageUpload({
  images,
  onChange,
  folder = "products",
  maxImages = 8,
  className,
}: MultiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} bukan file gambar`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} melebihi 5MB`);
        return false;
      }
      return true;
    });

    const remaining = maxImages - images.length;
    if (validFiles.length > remaining) {
      toast.error(`Maksimal ${maxImages} gambar. Sisa slot: ${remaining}`);
      return;
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = validFiles.map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await apiClient.storage
          .from("images")
          .upload(fileName, file);
        if (error) throw error;

        const { data } = apiClient.storage.from("images").getPublicUrl(fileName);
        return data.publicUrl;
      });

      const newUrls = await Promise.all(uploadPromises);
      onChange([...images, ...newUrls]);
      toast.success(`${newUrls.length} gambar berhasil diupload`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal mengupload gambar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    onChange(newImages);
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
    if (e.dataTransfer.files?.length) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleUpload(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-secondary">
              <img
                src={url}
                alt={`Gambar ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  Utama
                </span>
              )}
              <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleMoveUp(index)}
                  >
                    <GripVertical className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleRemove(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {images.length < maxImages && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
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
              "border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
              isUploading && "pointer-events-none opacity-50"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Mengupload...</span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Klik atau drag gambar</p>
                  <p className="text-xs text-muted-foreground">
                    Bisa pilih banyak sekaligus (max {maxImages}, 5MB/file)
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}


