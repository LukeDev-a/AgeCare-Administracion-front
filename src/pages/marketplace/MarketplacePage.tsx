import { useState } from 'react';
import { CaregiversPanel } from './CaregiversPanel';
import { ProductsPanel } from './ProductsPanel';
import { marketStyles as s } from './marketStyles';

export function MarketplacePage() {
  const [tab, setTab] = useState<'products' | 'caregivers'>('products');
  return <div className="tw:space-y-6 tw:text-base tw:leading-relaxed tw:text-ink">
    <header className={s.panel}>
      <h2 className={s.heading}>Catálogos del marketplace</h2>
      <p className={`tw:mt-2 tw:max-w-3xl ${s.muted}`}>Consulta los productos y los perfiles de cuidadoras. Cada sección tiene sus propios filtros y acciones de revisión.</p>
      <div className={`tw:mt-6 ${s.actions}`} role="group" aria-label="Secciones del marketplace">
        <button type="button" aria-pressed={tab === 'products'} className={`${s.button} ${tab === 'products' ? s.primary : ''}`} onClick={() => setTab('products')}>Productos</button>
        <button type="button" aria-pressed={tab === 'caregivers'} className={`${s.button} ${tab === 'caregivers' ? s.primary : ''}`} onClick={() => setTab('caregivers')}>Cuidadoras</button>
      </div>
    </header>
    {tab === 'products' ? <ProductsPanel /> : <CaregiversPanel />}
  </div>;
}
