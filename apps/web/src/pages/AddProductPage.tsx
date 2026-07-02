import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductUnit } from '@homestock/types';
import { useCategories, useCreateProduct, useExtractProductFromImage } from '../api/queries';
import { Input, Select } from '../components/Input';
import Button from '../components/Button';
import CategoryPicker from '../components/CategoryPicker';

const UNITS: ProductUnit[] = ['ml', 'g', 'units', 'sheets', 'doses'];

export default function AddProductPage() {
  const nav = useNavigate();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const extract = useExtractProductFromImage();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('ml');
  const [packageSize, setPackageSize] = useState<number | ''>('');
  const [packages, setPackages] = useState<number>(1);
  const [fillPercent, setFillPercent] = useState<number>(100);

  const effectiveQuantity = packages <= 0 ? 0 : (packages - 1) + fillPercent / 100;
  const [extractError, setExtractError] = useState<string | null>(null);

  function applyExtracted(data: {
    name: string | null;
    brand: string | null;
    suggestedCategory: string | null;
    unit: ProductUnit | null;
    packageSize: number | null;
  }) {
    if (data.name) setName(data.name);
    if (data.brand) setBrand(data.brand);
    if (data.unit) setUnit(data.unit);
    if (data.packageSize) setPackageSize(data.packageSize);
    if (data.suggestedCategory) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === data.suggestedCategory!.toLowerCase(),
      );
      if (match) setCategoryId(match.id);
    }
  }

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractError(null);
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const base64 = await fileToBase64(file);
    try {
      const result = await extract.mutateAsync({ imageBase64: base64, mimeType: mime });
      applyExtracted(result);
    } catch (err) {
      setExtractError((err as Error).message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (packageSize === '' || Number(packageSize) <= 0) return;
    const created = await createProduct.mutateAsync({
      name,
      brand: brand || null,
      categoryId: categoryId || undefined,
      unit,
      packageSize: Number(packageSize),
      currentQuantity: effectiveQuantity,
    });
    nav(`/products/${created.id}`);
  }

  return (
    <div className="max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Add product</h1>
        <p className="text-sm text-slate-600">Upload a photo or fill the form manually.</p>
      </header>

      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
        <label className="block text-sm font-medium mb-1">Photo (optional)</label>
        <input type="file" accept="image/jpeg,image/png" onChange={handlePhoto} />
        {extract.isPending && (
          <p className="text-xs text-slate-500 mt-2">Extracting…</p>
        )}
        {extractError && <p className="text-xs text-rose-600 mt-2">{extractError}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <CategoryPicker
          categories={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as ProductUnit)}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Select>
          <Input
            label="Package size"
            type="number"
            min={0.001}
            step="any"
            required
            value={packageSize}
            onChange={(e) =>
              setPackageSize(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        </div>
        <div className="space-y-3">
          <Input
            label="Packages on hand"
            type="number"
            min={0}
            step={1}
            required
            value={packages}
            onChange={(e) => {
              const n = Math.max(0, Math.floor(Number(e.target.value)));
              if (n > packages) setFillPercent(100);
              setPackages(n);
            }}
            hint="How many sealed/unopened packages you have (including the current one)."
          />
          {packages >= 1 && (
            <label className="block">
              <span className="block text-sm font-medium text-slate-800 mb-1">
                Current package fill level —{' '}
                <span className="text-indigo-600 font-semibold">{fillPercent}%</span>
                <span className="text-slate-400 font-normal text-xs ml-2">
                  ({effectiveQuantity.toFixed(2)} effective packages)
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={fillPercent}
                onChange={(e) => setFillPercent(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>Empty</span>
                <span>Full</span>
              </div>
            </label>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={() => nav(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createProduct.isPending}>
            {createProduct.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>

        {createProduct.isError && (
          <p className="text-sm text-rose-600">
            {(createProduct.error as Error).message}
          </p>
        )}
      </form>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const idx = result.indexOf('base64,');
      resolve(idx >= 0 ? result.slice(idx + 'base64,'.length) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
