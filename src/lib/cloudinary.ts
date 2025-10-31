export type UploadedImage = {
  public_id: string
  hero: string
  thumb: string
  original: string
}

export async function uploadToCloudinary(file: File, slug: string): Promise<UploadedImage> {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dd89enrjz"
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "blom_unsigned"
  const endpoint = `https://api.cloudinary.com/v1_1/${cloud}/auto/upload`

  const fd = new FormData()
  fd.append("upload_preset", preset)
  fd.append("folder", `products/${slug || "temp"}`)
  fd.append("file", file)

  const res = await fetch(endpoint, { method: "POST", body: fd })
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${await res.text()}`)
  const j = await res.json()

  const base = `https://res.cloudinary.com/${cloud}/image/upload`
  const hero  = `${base}/f_auto,q_auto,dpr_auto,w_1200/${j.public_id}`
  const thumb = `${base}/f_auto,q_auto,dpr_auto,c_fill,w_600,h_600/${j.public_id}`
  return { public_id: j.public_id, hero, thumb, original: j.secure_url }
}


