import type { Product } from '../../api/marketplace';
import { money, ticketDate } from '../../lib/format';
import { MARKET_STATUS_META } from '../../lib/marketMeta';

interface ProductsTableProps {
  items: Product[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ProductsTable({ items, selectedId, onSelect }: ProductsTableProps) {
  if (items.length === 0) {
    return (
      <table className="data">
        <tbody>
          <tr><td colSpan={6}>No hay productos para este filtro.</td></tr>
        </tbody>
      </table>
    );
  }

  return (
    <table className="data">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Categoría</th>
          <th>Proveedor</th>
          <th>Precio</th>
          <th>Estado</th>
          <th>Actualizado</th>
        </tr>
      </thead>
      <tbody>
        {items.map(product => {
          const status = MARKET_STATUS_META[product.status] ?? MARKET_STATUS_META.draft;
          return (
            <tr
              key={product.id}
              className={`marketplace-row${selectedId === product.id ? ' selected' : ''}`}
              onClick={() => onSelect(product.id)}
            >
              <td><button className="action-button" type="button" onClick={event => { event.stopPropagation(); onSelect(product.id); }}>{product.name}</button></td>
              <td>{product.category}</td>
              <td>{product.vendor}</td>
              <td>{product.price_clp == null ? 'Precio no informado' : money(product.price_clp)}</td>
              <td><span className={`chip ${status.className}`}>{status.label}</span></td>
              <td>{ticketDate(product.updated_at)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
