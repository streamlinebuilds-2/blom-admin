export function PreviewBar({
  prNumber, prUrl, previewUrl, branch,
  onPublish
}: {
  prNumber?: number|null;
  prUrl?: string|null;
  previewUrl?: string|null;
  branch?: string|null;
  onPublish?: (prNumber:number)=>void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center border rounded p-2">
      {prUrl && <a className="px-3 py-1 border rounded" target="_blank" href={prUrl}>Open PR</a>}
      {previewUrl && <a className="px-3 py-1 border rounded" target="_blank" href={previewUrl}>Open Preview</a>}
      {prNumber ? (
        <button className="px-3 py-1 rounded bg-emerald-600 text-white"
          onClick={()=>onPublish?.(prNumber!)}>Publish</button>
      ) : (
        <span className="text-xs text-gray-500">No PR yet</span>
      )}
      {branch && <span className="text-xs text-gray-400">Branch: {branch}</span>}
    </div>
  );
}


