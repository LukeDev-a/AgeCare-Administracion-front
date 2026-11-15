import type { Product } from '../../api/marketplace';
import { money, ticketDate } from '../../lib/format';
import { MARKET_STATUS_META } from '../../lib/marketMeta';
import { marketStyles as s, statusColor } from './marketStyles';
interface ProductsTableProps { items: Product[]; selectedId: string | null; onSelect: (id: string) => void; }
export function ProductsTable({ items, selectedId, onSelect }: ProductsTableProps) {
  if (!items.length) return <div className="tw:py-12 tw:text-center"><p className="tw:font-semibold">No hay productos para este filtro.</p><p className={`tw:mt-2 ${s.muted}`}>Prueba otro nombre, proveedor o categoría.</p></div>;
  return <div className={s.scroll}><table className={s.table}>
    <thead><tr><th>Producto</th><th>Proveedor y categoría</th><th>Precio referencial</th><th>Estado</th><th>Último cambio</th><th>Detalle</th></tr></thead>
    <tbody>{items.map(product => <tr key={product.id} className={selectedId === product.id ? 'tw:bg-canvas' : 'tw:hover:bg-canvas/50'}>
      <td className="tw:max-w-64 tw:font-semibold tw:break-words">{product.name}</td>
      <td><p>{product.vendor}</p><p className={`tw:mt-1 ${s.muted}`}>{product.category}</p></td>
      <td>{product.price_clp == null ? 'Precio no informado' : money(product.price_clp)}</td>
      <td><span className={`${s.badge} ${statusColor(product.status)}`}>{MARKET_STATUS_META[product.status]?.label ?? product.status}</span></td>
      <td>{ticketDate(product.updated_at)}</td>
      <td><button type="button" className={s.button} aria-label={`Ver producto ${product.name}`} onClick={() => onSelect(product.id)}>Ver detalle</button></td>
    </tr>)}</tbody>
  </table></div>;
}
