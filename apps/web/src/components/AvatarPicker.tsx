import { useRef } from 'react';

interface Props {
  name: string;
  avatarUrl: string | null;
  onChange: (dataUrl: string | null) => void;
}

export default function AvatarPicker({ name, avatarUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function initials() {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 150;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      onChange(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = url;
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 hover:border-ink transition-colors focus:outline-none focus:ring-2 focus:ring-ink"
        title="Change photo"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center w-full h-full bg-slate-100 text-slate-600 text-lg font-semibold">
            {initials()}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-medium">
          Edit
        </span>
      </button>
      <div className="text-sm text-slate-500">
        <p>Click to upload a photo.</p>
        {avatarUrl && (
          <button
            type="button"
            className="text-rose-500 hover:underline text-xs mt-0.5"
            onClick={() => onChange(null)}
          >
            Remove photo
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
