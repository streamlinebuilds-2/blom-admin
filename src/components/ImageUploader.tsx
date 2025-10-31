import { useRef, useState } from "react";
import { uploadToCloudinary, type UploadedImage } from "@/lib/cloudinary";

export function ImageUploader({
  slug,
  onAdd,
  label = "Upload image",
  accept = "image/*",
  maxMB = 8
}: {
  slug: string;
  onAdd: (img: UploadedImage) => void;
  label?: string;
  accept?: string;
  maxMB?: number;
}) {
  const inputRef = useRef<HTMLInputElement|null>(null);
  const [busy, setBusy] = useState(false);

  function pick() {
    inputRef.current?.click();
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > maxMB * 1024 * 1024) { alert(`Max ${maxMB}MB`); e.target.value=""; return; }
    setBusy(true);
    try {
      const img = await uploadToCloudinary(file, slug);
      onAdd(img);
      e.target.value="";
    } catch (err: any) {
      alert("Upload failed: " + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
      <button type="button" onClick={pick} disabled={busy}
        className="px-3 py-2 border rounded disabled:opacity-60">
        {busy ? "Uploading…" : label}
      </button>
    </div>
  );
}


