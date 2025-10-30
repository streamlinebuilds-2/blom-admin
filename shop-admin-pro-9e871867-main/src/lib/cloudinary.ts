export async function uploadToCloudinary(file: File, opts: { slug: string; folder?: string }) {
  const folder = opts.folder ?? `products/${opts.slug}`;
  const endpoint = `https://api.cloudinary.com/v1_1/dd89enrjz/auto/upload`;
  const fd = new FormData();
  fd.append("upload_preset", "blom_unsigned");
  fd.append("folder", folder);
  fd.append("file", file);

  const res = await fetch(endpoint, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${await res.text()}`);
  const json = await res.json();
  return {
    public_id: json.public_id as string,
    format: json.format as string,
    secure_url: json.secure_url as string,
  };
}

export function cld(
  imgPublicId: string,
  params?: { w?: number; h?: number; fit?: "fill" | "fit" | "pad" | "scale" }
) {
  const w = params?.w ?? 1200;
  const h = params?.h;
  const fit = params?.fit ?? "fit";
  const base = `https://res.cloudinary.com/dd89enrjz/image/upload`;
  const trans = [
    "f_auto",
    "q_auto",
    "dpr_auto",
    fit === "fill" ? "c_fill" : fit === "pad" ? "c_pad" : fit === "scale" ? "c_scale" : "c_fit",
    `w_${w}`,
    h ? `h_${h}` : null,
  ]
    .filter(Boolean)
    .join(",");
  return `${base}/${trans}/${imgPublicId}`;
}


