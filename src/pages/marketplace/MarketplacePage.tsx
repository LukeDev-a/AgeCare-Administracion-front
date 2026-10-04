import { useState } from 'react';
import { CaregiversPanel } from './CaregiversPanel';
import { ProductsPanel } from './ProductsPanel';

export function MarketplacePage() {
  const [tab, setTab] = useState<'products' | 'caregivers'>('products');

  return (
    <>
      <div className="marketplace-tabs" role="tablist" aria-label="Secciones del marketplace">
        <button type="button" className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Productos
        </button>
        <button type="button" className={tab === 'caregivers' ? 'active' : ''} onClick={() => setTab('caregivers')}>
          Cuidadoras
        </button>
      </div>

      {tab === 'products' && <ProductsPanel />}
      {tab === 'caregivers' && <CaregiversPanel />}
    </>
  );
}