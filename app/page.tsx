'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ClipboardList, LayoutDashboard, Menu, Package, Plus, Search, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; name: string; category: string; unit: string; current: number; minimum: number; ideal: number }
type Movement = { id: string; productId: string; type: 'Entrada' | 'Saída'; quantity: number; date: string }
type PurchaseItem = { id: string; productId: string; quantity: number }
type PurchaseOrder = { id: string; createdAt: string; status: 'criado' | 'recebido' | 'cancelado'; items: PurchaseItem[] }

const categories = ['Saladas e Frutas', 'Mercearia e Secos', 'Congelados e Prontos', 'Carnes e Laticínios', 'Limpeza', 'Embalagens', 'Bebidas Bar', 'Bebidas Salão']
const initialProducts: Product[] = [
  { id: 'idalfaceamericana1', name: 'Alface americana', category: 'Saladas e Frutas', unit: 'cx', current: 12, minimum: 4, ideal: 20 },
  { id: 'idtomatelongavida2', name: 'Tomate longa vida', category: 'Saladas e Frutas', unit: 'cx', current: 8, minimum: 3, ideal: 15 },
  { id: 'idcebola5', name: 'Cebola', category: 'Saladas e Frutas', unit: 'kg', current: 18, minimum: 8, ideal: 30 },
  { id: 'idovos16', name: 'Ovos', category: 'Mercearia e Secos', unit: 'cartela', current: 10, minimum: 4, ideal: 18 },
  { id: 'idoleodesoja17', name: 'Óleo de soja', category: 'Mercearia e Secos', unit: 'cx', current: 6, minimum: 3, ideal: 12 },
  { id: 'idbatata', name: 'Batata frita congelada', category: 'Congelados e Prontos', unit: 'pct', current: 22, minimum: 8, ideal: 40 },
  { id: 'idqueijo', name: 'Queijo mussarela', category: 'Carnes e Laticínios', unit: 'kg', current: 9, minimum: 4, ideal: 16 },
  { id: 'idheineken', name: 'Heineken 600ml', category: 'Bebidas Bar', unit: 'un', current: 40, minimum: 30, ideal: 200 },
  { id: 'idcoca', name: 'Coca-Cola', category: 'Bebidas Bar', unit: 'un', current: 18, minimum: 24, ideal: 60 },
  { id: 'idgelo', name: 'Gelo', category: 'Bebidas Bar', unit: 'saco', current: 3, minimum: 6, ideal: 15 },
  { id: 'idcopo', name: 'Copo descartável 300ml', category: 'Embalagens', unit: 'pct', current: 14, minimum: 5, ideal: 25 },
  { id: 'idmultiuso', name: 'Desinfetante', category: 'Limpeza', unit: 'un', current: 7, minimum: 3, ideal: 12 },
]

const today = () => new Date().toISOString()
const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export default function Page() {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [movements, setMovements] = useState<Movement[]>([])
  const [view, setView] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [toast, setToast] = useState('')
  const [historyFilter, setHistoryFilter] = useState('Todos')
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [purchaseQuantities, setPurchaseQuantities] = useState<Record<string, number>>({})
  const [purchaseCategory, setPurchaseCategory] = useState('Todas as categorias')

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    const supabase = createClient()
    void Promise.all([
      supabase.from('stock_products').select('id,name,category,unit,current_quantity,minimum_quantity,ideal_quantity').order('name'),
      supabase.from('stock_movements').select('id,product_id,movement_type,quantity,movement_date').order('movement_date', { ascending: true }),
      supabase.from('pedidos_compra').select('id,data_criacao,status').order('data_criacao', { ascending: false }),
    ]).then(async ([productResult, movementResult, orderResult]) => {
      if (productResult.error || movementResult.error) return
      const databaseProducts = productResult.data ?? []
      if (!databaseProducts.length) {
        const { error: seedError } = await supabase.from('stock_products').upsert(initialProducts.map((p) => ({ id: p.id, name: p.name, category: p.category, unit: p.unit, current_quantity: p.current, minimum_quantity: p.minimum, ideal_quantity: p.ideal })))
        if (seedError) {
          console.error('[v0] Erro ao carregar produtos iniciais:', seedError)
          setToast(`Erro ao carregar produtos: ${seedError.message}`)
          return
        }
        setProducts(initialProducts)
      } else {
        setProducts(databaseProducts.map((p) => ({ id: p.id, name: p.name, category: p.category, unit: p.unit, current: p.current_quantity, minimum: p.minimum_quantity, ideal: p.ideal_quantity })))
      }
      setMovements((movementResult.data ?? []).map((m) => ({ id: m.id, productId: m.product_id, type: m.movement_type as Movement['type'], quantity: m.quantity, date: m.movement_date })))
      if (!orderResult.error) {
        const orderRows = orderResult.data ?? []
        const itemResult = await supabase.from('itens_pedido_compra').select('id,pedido_id,produto_id,quantidade').in('pedido_id', orderRows.map((o) => o.id))
        const itemsByOrder = new Map<string, PurchaseItem[]>()
        ;(itemResult.data ?? []).forEach((item) => itemsByOrder.set(item.pedido_id, [...(itemsByOrder.get(item.pedido_id) ?? []), { id: item.id, productId: item.produto_id, quantity: item.quantidade }]))
        setOrders(orderRows.map((o) => ({ id: o.id, createdAt: o.data_criacao, status: o.status, items: itemsByOrder.get(o.id) ?? [] })))
      }
    })
  }, [])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t) } }, [toast])

  const lowStock = products.filter((p) => p.current <= p.minimum)
  const weekMovements = movements.filter((m) => Date.now() - new Date(m.date).getTime() <= 7 * 86400000)
  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  const visibleMovements = movements.filter((m) => historyFilter === 'Todos' || m.type === historyFilter).slice().reverse()

  async function registerMovement(type: 'Entrada' | 'Saída') {
    const amount = Number(quantity)
    const product = products.find((p) => p.id === selectedProduct)
    if (!product || !Number.isInteger(amount) || amount <= 0) return setToast('Informe um produto e uma quantidade válida.')
    if (type === 'Saída' && amount > product.current) return setToast('A saída não pode deixar o estoque negativo.')
    const supabase = createClient()
    const nextQuantity = type === 'Entrada' ? product.current + amount : product.current - amount
    const movementId = crypto.randomUUID()
    const movementDate = today()
    const { error: movementError } = await supabase.from('stock_movements').insert({ id: movementId, product_id: product.id, movement_type: type, quantity: amount, movement_date: movementDate })
    if (movementError) {
      console.error('[v0] Erro ao inserir movimentação:', movementError)
      return setToast(`Erro ao salvar movimentação: ${movementError.message}`)
    }
    const { error: productError } = await supabase.from('stock_products').update({ current_quantity: nextQuantity, updated_at: movementDate }).eq('id', product.id)
    if (productError) {
      console.error('[v0] Erro ao atualizar estoque:', productError)
      await supabase.from('stock_movements').delete().eq('id', movementId)
      return setToast(`Erro ao atualizar estoque: ${productError.message}`)
    }
    setProducts((current) => current.map((p) => p.id === product.id ? { ...p, current: nextQuantity } : p))
    setMovements((current) => [...current, { id: movementId, productId: product.id, type, quantity: amount, date: movementDate }])
    setQuantity(''); setSelectedProduct(''); setToast(`${type} registrada para ${product.name}.`)
  }
  async function saveProduct() { if (!editing?.name.trim()) return; const supabase = createClient(); const payload = { id: editing.id, name: editing.name.trim(), category: editing.category, unit: editing.unit.trim(), current_quantity: editing.current, minimum_quantity: editing.minimum, ideal_quantity: editing.ideal, updated_at: today() }; const { error } = await supabase.from('stock_products').upsert(payload); if (error) return setToast('Não foi possível salvar o produto.'); setProducts((current) => current.some((p) => p.id === editing.id) ? current.map((p) => p.id === editing.id ? editing : p) : [...current, editing]); setEditing(null); setToast('Produto atualizado com sucesso') }
  async function removeProduct(id: string) { const { error } = await createClient().from('stock_products').delete().eq('id', id); if (error) return setToast('Não foi possível remover o produto.'); setProducts((current) => current.filter((p) => p.id !== id)); setMovements((current) => current.filter((m) => m.productId !== id)); setToast('Produto removido.') }
  async function confirmPurchase(items: Array<{ productId: string; quantity: number }>) {
    const validItems = items.filter((item) => Number.isInteger(item.quantity) && item.quantity > 0)
    if (!validItems.length) return setToast('Informe ao menos uma quantidade para comprar.')
    const supabase = createClient()
    const orderId = crypto.randomUUID()
    const createdAt = today()
    const { error: orderError } = await supabase.from('pedidos_compra').insert({ id: orderId, data_criacao: createdAt, status: 'criado' })
    if (orderError) return setToast('Não foi possível criar o pedido.')
    const rows = validItems.map((item) => ({ id: crypto.randomUUID(), pedido_id: orderId, produto_id: item.productId, quantidade: item.quantity }))
    const { error: itemError } = await supabase.from('itens_pedido_compra').insert(rows)
    if (itemError) { await supabase.from('pedidos_compra').delete().eq('id', orderId); return setToast('Não foi possível salvar os itens do pedido.') }
    setOrders((current) => [{ id: orderId, createdAt, status: 'criado', items: rows.map((row) => ({ id: row.id, productId: row.produto_id, quantity: row.quantidade })) }, ...current])
    setPurchaseQuantities({})
    setToast(`Pedido criado com sucesso · ${orderId.slice(0, 8).toUpperCase()}`)
  }
  function go(viewName: string) { setView(viewName); setMenuOpen(false) }

  return <div className="app-shell">
    <header className="topbar"><div className="brand">Estoque <span>Vai Mais BG</span></div><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu"><Menu size={22} /></button><div className="top-date">{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</div></header>
    <nav className={`nav ${menuOpen ? 'open' : ''}`}>{[['dashboard', 'Dashboard', LayoutDashboard], ['products', 'Produtos', Package], ['entry', 'Entrada de estoque', ArrowDownToLine], ['exit', 'Registrar saída', ArrowUpFromLine], ['history', 'Histórico', ClipboardList], ['purchase', 'Sugestão de compra', AlertTriangle], ['orders', 'Pedidos de compra', ClipboardList]].map(([key, label, Icon]) => <button key={key as string} className={view === key ? 'active' : ''} onClick={() => go(key as string)}><Icon size={17} />{label as string}</button>)}</nav>
    <main className="content">{view === 'dashboard' && <Dashboard products={products} lowStock={lowStock} movements={movements} onNavigate={go} />}
      {view === 'products' && <><PageTitle title="Produtos" subtitle={`${products.length} produtos cadastrados`} action={<div className="title-actions"><button className="primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', category: categories[0], unit: 'un', current: 0, minimum: 0, ideal: 0 })}><Plus size={17} /> Novo produto</button></div>} /><div className="search"><Search size={17} /><input placeholder="Buscar produto" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="product-list">{filteredProducts.map((p) => <div className="product-card" key={p.id}><div><strong>{p.name}</strong><small>{p.category} · {p.unit}</small></div><div className="stock-number"><b className={p.current <= p.minimum ? 'low' : ''}>{p.current}</b><small>atual / mín. {p.minimum}</small></div><button className="icon-button" onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`}>Editar</button></div>)}</div></>}
      {(view === 'entry' || view === 'exit') && <CategoryMovementForm type={view === 'entry' ? 'Entrada' : 'Saída'} products={products} category={selectedCategory} selected={selectedProduct} quantity={quantity} setCategory={(value) => { setSelectedCategory(value); setSelectedProduct('') }} setSelected={setSelectedProduct} setQuantity={setQuantity} submit={registerMovement} />}
      {view === 'history' && <><PageTitle title="Histórico de movimentações" subtitle="Entradas e saídas registradas" /><div className="filters">{['Todos', 'Entrada', 'Saída'].map((item) => <button className={historyFilter === item ? 'selected' : ''} key={item} onClick={() => setHistoryFilter(item)}>{item}</button>)}</div><div className="history-list">{visibleMovements.length ? visibleMovements.map((m) => <div className="history-row" key={m.id}><span className={`movement-dot ${m.type === 'Entrada' ? 'in' : 'out'}`}>{m.type === 'Entrada' ? '+' : '−'}</span><div><strong>{products.find((p) => p.id === m.productId)?.name ?? 'Produto removido'}</strong><small>{m.type} · {formatDate(m.date)}</small></div><b>{m.quantity} un.</b></div>) : <Empty text="Nenhuma movimentação registrada ainda." />}</div></>}
      {view === 'purchase' && <CategoryPurchase products={products} movements={weekMovements} category={purchaseCategory} setCategory={setPurchaseCategory} quantities={purchaseQuantities} setQuantities={setPurchaseQuantities} confirm={confirmPurchase} />}
      {view === 'orders' && <Orders orders={orders} products={products} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} />}
    </main>
    {editing && <ProductModal product={editing} setProduct={setEditing} save={saveProduct} remove={products.some((p) => p.id === editing.id) ? () => { removeProduct(editing.id); setEditing(null) } : undefined} />}
    {toast && <div className="toast">{toast}</div>}
  </div>
}

function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div> }
function Empty({ text }: { text: string }) { return <div className="empty">{text}</div> }
function Dashboard({ products, lowStock, movements, onNavigate }: { products: Product[]; lowStock: Product[]; movements: Movement[]; onNavigate: (v: string) => void }) { const recent = movements.slice(-4).reverse(); return <><PageTitle title="Olá, equipe 👋" subtitle="Visão rápida do estoque" /><div className="stats"><button onClick={() => onNavigate('products')}><Package /><b>{products.length}</b><span>Produtos</span></button><button className={lowStock.length ? 'warning' : ''} onClick={() => onNavigate('products')}><AlertTriangle /><b>{lowStock.length}</b><span>Estoque baixo</span></button><button onClick={() => onNavigate('history')}><ArrowUpFromLine /><b>{movements.filter((m) => Date.now() - new Date(m.date).getTime() < 7 * 86400000).reduce((sum, m) => sum + (m.type === 'Saída' ? m.quantity : 0), 0)}</b><span>Consumo na semana</span></button></div>{lowStock.length > 0 && <section className="alert-card"><div className="section-heading"><h2>Estoque baixo</h2><button onClick={() => onNavigate('purchase')}>Ver sugestão</button></div>{lowStock.slice(0, 4).map((p) => <div className="alert-row" key={p.id}><span>{p.name}</span><b>{p.current} {p.unit}<small>mín. {p.minimum}</small></b></div>)}</section>}<section className="quick-actions"><h2>Ações rápidas</h2><div><button onClick={() => onNavigate('entry')}><ArrowDownToLine />Entrada</button><button onClick={() => onNavigate('exit')}><ArrowUpFromLine />Registrar saída</button></div></section><section><div className="section-heading"><h2>Últimas movimentações</h2><button onClick={() => onNavigate('history')}>Ver histórico</button></div>{recent.length ? recent.map((m) => <div className="history-row compact" key={m.id}><span className={`movement-dot ${m.type === 'Entrada' ? 'in' : 'out'}`}>{m.type === 'Entrada' ? '+' : '−'}</span><div><strong>{products.find((p) => p.id === m.productId)?.name}</strong><small>{m.type} · {formatDate(m.date)}</small></div><b>{m.quantity}</b></div>) : <Empty text="As movimentações aparecerão aqui." />}</section></> }
function StockCategoryCards({ products, selected, onSelect }: { products: Product[]; selected: string; onSelect: (category: string) => void }) { const grouped = Array.from(new Set(products.map((p) => p.category))).sort((a, b) => a.localeCompare(b, 'pt-BR')); const statusFor = (category: string) => { const items = products.filter((p) => p.category === category); if (items.some((p) => p.current <= p.minimum)) return { label: 'Crítico', tone: 'critical' }; if (items.some((p) => p.current <= p.minimum * 1.25)) return { label: 'Atenção', tone: 'attention' }; return { label: 'Normal', tone: 'normal' } }; return <div className="category-grid">{grouped.map((category) => { const status = statusFor(category); const count = products.filter((p) => p.category === category).length; return <button type="button" key={category} className={`category-card ${selected === category ? 'selected' : ''}`} onClick={() => onSelect(category)}><span className={`stock-status-dot ${status.tone}`} aria-label={`Estoque ${status.label}`} /><div><strong>{category}</strong><small>{count} {count === 1 ? 'produto' : 'produtos'}</small></div><span className={`stock-status ${status.tone}`}>{status.label}</span></button>})}</div> }

function CategoryMovementForm({ type, products, category, selected, quantity, setCategory, setSelected, setQuantity, submit }: { type: 'Entrada' | 'Saída'; products: Product[]; category: string; selected: string; quantity: string; setCategory: (v: string) => void; setSelected: (v: string) => void; setQuantity: (v: string) => void; submit: (t: 'Entrada' | 'Saída') => void }) { const product = products.find((p) => p.id === selected); const categoryProducts = category ? products.filter((p) => p.category === category) : []; return <><PageTitle title={type === 'Entrada' ? 'Entrada de estoque' : 'Registrar saída'} subtitle="Escolha uma categoria para continuar" />{!category ? <StockCategoryCards products={products} selected={category} onSelect={setCategory} /> : <div className="category-flow"><button className="back-category" type="button" onClick={() => { setCategory(''); setSelected('') }}>← Todas as categorias</button><h2>{category}</h2><div className="category-products">{categoryProducts.map((p) => <button type="button" className={`category-product ${selected === p.id ? 'selected' : ''}`} key={p.id} onClick={() => setSelected(p.id)}><span><strong>{p.name}</strong><small>Estoque: {p.current} {p.unit} · Mínimo: {p.minimum}</small></span><b className={p.current <= p.minimum ? 'critical-text' : ''}>{p.current}</b></button>)}</div>{product && <div className="movement-form"><label>Quantidade<input type="number" min="1" inputMode="numeric" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label><div className="current-stock">Estoque atual <b>{product.current} {product.unit}</b></div><button className="submit-large" onClick={() => submit(type)}>{type === 'Entrada' ? 'Confirmar entrada' : 'Confirmar saída'}</button></div>}</div>}</> }

function MovementForm({ type, products, category, selected, quantity, setCategory, setSelected, setQuantity, submit }: { type: 'Entrada' | 'Saída'; products: Product[]; category: string; selected: string; quantity: string; setCategory: (v: string) => void; setSelected: (v: string) => void; setQuantity: (v: string) => void; submit: (t: 'Entrada' | 'Saída') => void }) { const product = products.find((p) => p.id === selected); const categories = Array.from(new Set(products.map((p) => p.category))).sort((a, b) => a.localeCompare(b, 'pt-BR')); const categoryProducts = category ? products.filter((p) => p.category === category) : []; return <><PageTitle title={type === 'Entrada' ? 'Entrada de estoque' : 'Registrar saída'} subtitle={type === 'Entrada' ? 'Adicione produtos recebidos' : 'Atualize o consumo do bar'} /><div className="movement-form"><label>Categoria<select className="touch-select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Selecione uma categoria</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Produto<select className="touch-select" value={selected} disabled={!category} onChange={(e) => setSelected(e.target.value)}><option value="">{category ? 'Selecione um produto' : 'Escolha uma categoria primeiro'}</option>{categoryProducts.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.current} {p.unit}</option>)}</select></label><label>Quantidade<input type="number" min="1" inputMode="numeric" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>{product && <div className="current-stock">Estoque atual <b>{product.current} {product.unit}</b></div>}<button className="submit-large" onClick={() => submit(type)}>{type === 'Entrada' ? 'Confirmar entrada' : 'Confirmar saída'}</button></div></> }
function CategoryPurchase({ products, movements, category, setCategory, quantities, setQuantities, confirm }: { products: Product[]; movements: Movement[]; category: string; setCategory: (value: string) => void; quantities: Record<string, number>; setQuantities: (value: Record<string, number>) => void; confirm: (items: Array<{ productId: string; quantity: number }>) => void }) { const suggestions = products.map((p) => { const consumed = movements.filter((m) => m.productId === p.id && m.type === 'Saída').reduce((sum, m) => sum + m.quantity, 0); return { ...p, consumed, suggestion: Math.max(0, p.ideal - p.current) } }).filter((p) => p.suggestion > 0 || p.consumed > 0); const selectedProducts = category ? suggestions.filter((p) => p.category === category) : []; const valueFor = (p: Product & { suggestion: number }) => quantities[p.id] ?? p.suggestion; return <><PageTitle title="Sugestão de compra" subtitle="Escolha uma categoria para revisar as compras" />{!category ? <StockCategoryCards products={suggestions} selected="" onSelect={setCategory} /> : <div className="category-flow"><button className="back-category" type="button" onClick={() => setCategory('')}>← Todas as categorias</button><h2>{category}</h2><div className="purchase-list">{selectedProducts.length ? selectedProducts.map((p) => <div className="purchase-row" key={p.id}><div><strong>{p.name}</strong><small>Estoque atual: {p.current} · consumo semanal: {p.consumed}</small></div><input aria-label={`Quantidade para comprar de ${p.name}`} type="number" min="0" value={valueFor(p)} onChange={(e) => setQuantities({ ...quantities, [p.id]: Number(e.target.value) })} /><span>{p.unit}</span></div>) : <Empty text="Nenhuma compra sugerida nesta categoria." />}</div>{selectedProducts.length > 0 && <button className="submit-large" onClick={() => confirm(selectedProducts.map((p) => ({ productId: p.id, quantity: valueFor(p) })))}>Criar pedido de compra</button>}</div>}</> }

function Purchase({ products, movements, category, setCategory, quantities, setQuantities, confirm }: { products: Product[]; movements: Movement[]; category: string; setCategory: (value: string) => void; quantities: Record<string, number>; setQuantities: (value: Record<string, number>) => void; confirm: (items: Array<{ productId: string; quantity: number }>) => void }) { const categoryOptions = Array.from(new Set(products.map((p) => p.category))).sort((a, b) => a.localeCompare(b, 'pt-BR')); const suggestions = products.map((p) => { const consumed = movements.filter((m) => m.productId === p.id && m.type === 'Saída').reduce((sum, m) => sum + m.quantity, 0); return { ...p, consumed, suggestion: Math.max(0, p.ideal - p.current) } }).filter((p) => (category === 'Todas as categorias' || p.category === category) && (p.suggestion > 0 || p.consumed > 0)).sort((a, b) => b.suggestion - a.suggestion); const valueFor = (p: Product & { suggestion: number }) => quantities[p.id] ?? p.suggestion; return <><PageTitle title="Sugestão de compra" subtitle="Baseada no consumo dos últimos 7 dias" /><div className="purchase-note">Revise as quantidades antes de confirmar o pedido.</div><div className="purchase-filter"><label htmlFor="purchase-category">Categoria</label><select id="purchase-category" className="touch-select" value={category} onChange={(e) => setCategory(e.target.value)}><option>Todas as categorias</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></div><div className="purchase-list">{suggestions.length ? suggestions.map((p) => <div className="purchase-row" key={p.id}><div><strong>{p.name}</strong><small>Estoque atual: {p.current} · consumo semanal: {p.consumed}</small></div><input aria-label={`Quantidade para comprar de ${p.name}`} type="number" min="0" value={valueFor(p)} onChange={(e) => setQuantities({ ...quantities, [p.id]: Number(e.target.value) })} /><span>{p.unit}</span></div>) : <Empty text="Nenhuma compra sugerida nesta categoria." />}<button className="primary full" onClick={() => confirm(suggestions.map((p) => ({ productId: p.id, quantity: valueFor(p) })))}>Confirmar pedido</button></div></> }

function Orders({ orders, products, selectedOrder, setSelectedOrder }: { orders: PurchaseOrder[]; products: Product[]; selectedOrder: string | null; setSelectedOrder: (id: string | null) => void }) { const selected = orders.find((order) => order.id === selectedOrder); return <><PageTitle title="Pedidos de compra" subtitle={`${orders.length} pedidos registrados`} />{selected ? <section className="purchase-list"><button className="secondary" onClick={() => setSelectedOrder(null)}>Voltar aos pedidos</button><h2>Pedido #{selected.id.slice(0, 8).toUpperCase()}</h2><p>{new Date(selected.createdAt).toLocaleString('pt-BR')} · {selected.status}</p>{selected.items.map((item) => <div className="purchase-row" key={item.id}><div><strong>{products.find((p) => p.id === item.productId)?.name ?? 'Produto'}</strong></div><b>{item.quantity}</b></div>)}</section> : <div className="purchase-list">{orders.length ? orders.map((order) => <button className="history-row" key={order.id} onClick={() => setSelectedOrder(order.id)}><div><strong>Pedido #{order.id.slice(0, 8).toUpperCase()}</strong><small>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</small></div><span>{order.status} · {order.items.length} itens</span></button>) : <Empty text="Nenhum pedido de compra criado ainda." />}</div>}</> }
function ProductModal({ product, setProduct, save, remove }: { product: Product; setProduct: (p: Product | null) => void; save: () => void; remove?: () => void }) { const update = (key: keyof Product, value: string | number) => setProduct({ ...product, [key]: ['current', 'minimum', 'ideal'].includes(key) ? Number(value) : value }); const close = () => setProduct(null); return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-product-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="modal-kicker">Cadastro de estoque</span><h2 id="edit-product-title">{remove ? 'Editar produto' : 'Novo produto'}</h2></div><button className="modal-close" onClick={close} aria-label="Fechar edição"><X size={21} /></button></div><div className="edit-fields">{[['name', 'Nome do produto'], ['category', 'Categoria'], ['unit', 'Unidade'], ['current', 'Estoque atual'], ['minimum', 'Estoque mínimo'], ['ideal', 'Estoque ideal']].map(([key, label]) => <label key={key}>{label}{key === 'category' ? <select value={product[key as keyof Product] as string} onChange={(e) => update(key as keyof Product, e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select> : <input type={key === 'name' || key === 'unit' ? 'text' : 'number'} min={key === 'name' || key === 'unit' ? undefined : 0} inputMode={key === 'name' || key === 'unit' ? 'text' : 'numeric'} value={product[key as keyof Product] as string | number} onChange={(e) => update(key as keyof Product, e.target.value)} />}</label>)}</div><div className="edit-actions"><button className="submit-large" onClick={save}>Salvar alterações</button><button className="secondary cancel-edit" onClick={close}>Cancelar</button>{remove && <button className="delete-button" onClick={remove}><Trash2 size={16} /> Remover produto</button>}</div></section></div> }
