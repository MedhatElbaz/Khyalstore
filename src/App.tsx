import { useEffect, useMemo, useState } from 'react'
import {
  Search, ShoppingCart, Menu, X, Heart, House, CookingPot, Zap,
  Sparkles, Package, Phone, SlidersHorizontal, Plus, Pencil, Trash2,
  LogIn, LogOut, LayoutDashboard, ChevronLeft, MessageCircle, CheckCircle2
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Product = {
  id: string
  name: string
  category: string
  brand: string
  price: number
  old_price?: number | null
  description?: string | null
  image_url?: string | null
  stock: number
  is_featured?: boolean
  is_published?: boolean
  color_variants?: { name: string; hex: string; image_url: string; stock?: number }[]
}

const demoProducts: Product[] = [
  { id:'demo-1', name:'طقم حلل جرانيت 10 قطع', category:'الحلل وأدوات الطهي', brand:'خيال', price:2450, old_price:2890, stock:8, is_featured:true, image_url:'https://images.unsplash.com/photo-1584990347449-a9f2a3f6f6b8?auto=format&fit=crop&w=800&q=80', description:'طقم عملي للمطبخ بتصميم أنيق.' },
  { id:'demo-2', name:'طقم حلل استانلس ستيل', category:'الحلل وأدوات الطهي', brand:'خيال', price:1890, stock:12, is_featured:true, image_url:'https://images.unsplash.com/photo-1584990347449-a9f2a3f6f6b8?auto=format&fit=crop&w=800&q=80', description:'أدوات طهي للاستخدام اليومي.' },
  { id:'demo-3', name:'طقم أدوات مطبخ 12 قطعة', category:'رفايع المطبخ', brand:'خيال', price:420, old_price:500, stock:20, is_featured:true, image_url:'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', description:'أساسيات مفيدة لكل مطبخ.' },
  { id:'demo-4', name:'غلاية مياه كهربائية', category:'أجهزة كهربائية', brand:'خيال', price:650, stock:7, is_featured:true, image_url:'https://images.unsplash.com/photo-1608354580875-30bd4168b351?auto=format&fit=crop&w=800&q=80', description:'غلاية للاستخدام المنزلي اليومي.' },
  { id:'demo-5', name:'علب حفظ الطعام — طقم', category:'التخزين والتنظيم', brand:'خيال', price:280, stock:16, image_url:'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80', description:'لترتيب المطبخ وحفظ الأطعمة.' },
  { id:'demo-6', name:'طقم أطباق تقديم', category:'الصيني والتقديم', brand:'خيال', price:760, stock:5, image_url:'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80', description:'طقم تقديم مناسب للبيت والضيوف.' },
]

const categories = [
  { name:'الكل', icon:House },
  { name:'الحلل وأدوات الطهي', icon:CookingPot },
  { name:'رفايع المطبخ', icon:Sparkles },
  { name:'أجهزة كهربائية', icon:Zap },
  { name:'الصيني والتقديم', icon:Package },
  { name:'التخزين والتنظيم', icon:SlidersHorizontal },
]

const money = (n:number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n) + ' ج.م'

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [category, setCategory] = useState('الكل')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [notice, setNotice] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({})
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [detailColor, setDetailColor] = useState('')
  const [detailQty, setDetailQty] = useState(1)
  const [form, setForm] = useState({ name:'', category:'رفايع المطبخ', brand:'خيال', price:'', old_price:'', stock:'0', image_url:'', description:'', color_variants: [] as {name:string;hex:string;image_url:string}[] })

  useEffect(() => {
    if (!supabase) {
      setNotice('اتصال قاعدة البيانات غير مفعّل في نسخة المتجر المنشورة. راجع إعدادات النشر في GitHub Actions.')
      return
    }

    const client = supabase
    let active = true
    const load = async () => {
      const { data, error } = await client.from('products')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (!active) return
      if (error) {
        console.error('KHYAL product load failed:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        setNotice(`تعذر تحميل المنتجات من قاعدة البيانات (${error.code || 'خطأ اتصال'}). افتح المتجر مجددًا بعد قليل أو راجع صلاحيات Supabase.`)
        return
      }

      setProducts((data || []) as Product[])
      if (!data?.length) {
        setNotice('اتصل المتجر بقاعدة البيانات، لكن لا توجد منتجات منشورة ظاهرة للزوار. راجع حالة النشر وصلاحيات القراءة.')
      } else {
        setNotice('')
      }
    }

    client.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    })
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    load()
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const filtered = useMemo(() => products.filter(p => {
    const matchCategory = category === 'الكل' || p.category === category
    const matchQuery = `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(query.toLowerCase())
    return matchCategory && matchQuery && p.is_published !== false
  }), [products, category, query])

  const cartItems = Object.entries(cart).filter(([,qty])=>qty>0).map(([key,qty])=>{ const [productId,colorName='']=key.split('::'); const product=products.find(p=>p.id===productId); if(!product)return null; const variant=product.color_variants?.find(v=>v.name===colorName); return {key,product,qty,colorName,variant,image:variant?.image_url||product.image_url,stock:variant?(variant.stock??product.stock):product.stock} }).filter((item):item is {key:string;product:Product;qty:number;colorName:string;variant:{name:string;hex:string;image_url:string;stock?:number}|undefined;image:string|null|undefined;stock:number}=>item!==null)
  const cartTotal = cartItems.reduce((sum,item)=>sum+item.product.price*item.qty,0)
  // Egypt number in international format; can still be overridden by deployment variable.
  const whatsapp = import.meta.env.VITE_WHATSAPP_NUMBER || '201028846518'
  const cartKey=(p:Product,colorName='')=>colorName?`${p.id}::${colorName}`:p.id
  const openProduct=(p:Product)=>{setDetailProduct(p);setDetailColor(p.color_variants?.[0]?.name||'');setDetailQty(1)}
  const addToCart=(p:Product,colorName='',quantity=1)=>{const variant=p.color_variants?.find(v=>v.name===colorName);if(p.color_variants?.length&&!variant){setNotice('اختار اللون الأول');return}const available=variant?(variant.stock??p.stock):p.stock;if(available<=0){setNotice('اللون ده غير متاح حاليًا');return}const key=cartKey(p,colorName);setCart(prev=>{const current=prev[key]||0;if(current+quantity>available){setNotice(`المتاح من اللون ده ${available} طقم فقط`);return prev}return {...prev,[key]:current+quantity}});setNotice('تمت إضافة اختيارك للسلة');window.setTimeout(()=>setNotice(''),2400)}
  const orderWhatsApp = () => {
    if (!whatsapp) { setNotice('أضف رقم واتساب في إعدادات المشروع أولًا'); return }
    const lines = cartItems.map(item => `${item.product.name}${item.colorName ? ` — اللون: ${item.colorName}` : ''} × ${item.qty} طقم — ${money(item.product.price * item.qty)}`).join('\n')
    const text = encodeURIComponent(`طلب جديد من متجر KHYAL\n${lines}\nالإجمالي: ${money(cartTotal)}\nيرجى التواصل لتأكيد الطلب.`)
    window.open(`https://wa.me/${whatsapp.replace(/\D/g,'')}?text=${text}`, '_blank', 'noopener,noreferrer')
  }
  const login = async (e:React.FormEvent) => {
    e.preventDefault(); setLoginError('')
    if (!supabase) { setLoginError('اربط المشروع بـ Supabase أولًا حسب ملف README.'); return }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError(`فشل تسجيل الدخول: ${error.message}`)
  }
  const logout = async () => { if (supabase) await supabase.auth.signOut(); setSession(null) }
  const resetForm = () => { setEditing(null); setForm({ name:'', category:'رفايع المطبخ', brand:'خيال', price:'', old_price:'', stock:'0', image_url:'', description:'', color_variants: [] }) }
  const editProduct = (p:Product) => {
    setEditing(p)
    setForm({ name:p.name, category:p.category, brand:p.brand || 'خيال', price:String(p.price), old_price:p.old_price ? String(p.old_price) : '', stock:String(p.stock), image_url:p.image_url || '', description:p.description || '', color_variants:p.color_variants || [] })
  }
  const uploadProductImage = async (file?: File) => {
    if (!file) return
    if (!supabase || !session) { setNotice('سجّل دخول المدير واربط قاعدة البيانات أولًا'); return }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setNotice('ارفع صورة JPG أو PNG أو WEBP'); return }
    if (file.size > 5 * 1024 * 1024) { setNotice('حجم الصورة لازم يكون أقل من 5 ميجابايت'); return }
    setUploadingImage(true)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false, contentType: file.type })
    if (error) { setNotice('فشل رفع الصورة. تأكد من تنفيذ إعدادات Supabase وصلاحيات التخزين.'); setUploadingImage(false); return }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    setForm(prev => ({ ...prev, image_url: data.publicUrl }))
    setNotice('تم رفع الصورة، احفظ المنتج لتأكيد التغييرات')
    setUploadingImage(false)
  }

  const saveProduct = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !session) return
    const requestedStock = Number(form.stock)
    const payload = { name:form.name.trim(), category:form.category, brand:form.brand.trim(), price:Number(form.price), old_price:form.old_price ? Number(form.old_price) : null, image_url:form.image_url.trim() || null, description:form.description.trim(), color_variants:form.color_variants.filter(v=>v.name.trim()).map(v=>({...v,name:v.name.trim(),image_url:v.image_url.trim(),stock:Number(v.stock ?? requestedStock)})), is_published:true }
    if (!payload.name || !Number.isFinite(payload.price) || payload.price < 0 || !Number.isInteger(requestedStock) || requestedStock < 0) { setNotice('راجع اسم المنتج والسعر والمخزون'); return }
    const result = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('products').insert(payload).select().single()
    if (result.error || !result.data) { setNotice('لم يتم حفظ بيانات المنتج. راجع صلاحيات قاعدة البيانات.'); return }
    const savedProduct = result.data as Product
    const { error: stockError } = await supabase.rpc('set_product_stock', { p_product_id: savedProduct.id, p_new_stock: requestedStock, p_reason: editing ? 'manual_adjustment' : 'opening_balance', p_note: editing ? 'تعديل المخزون من لوحة الإدارة بموافقة المدير' : 'رصيد افتتاحي لمنتج جديد' })
    if (stockError) {
      const { data: freshProduct } = await supabase.from('products').select('*').eq('id', savedProduct.id).single()
      if (freshProduct) setProducts(prev => editing ? prev.map(p => p.id === savedProduct.id ? freshProduct as Product : p) : [freshProduct as Product, ...prev])
      setNotice('تم حفظ بيانات المنتج لكن لم يتغير المخزون. نفّذ ترحيل المخزون في Supabase ثم أعد المحاولة.')
      return
    }
    const finalProduct = { ...savedProduct, stock: requestedStock }
    setProducts(prev => editing ? prev.map(p => p.id === savedProduct.id ? finalProduct : p) : [finalProduct, ...prev])
    resetForm(); setNotice('تم حفظ المنتج وتسجيل حركة المخزون بنجاح')
  }
  const deleteProduct = async (p:Product) => {
    if (!supabase || !session || !confirm(`حذف المنتج "${p.name}"؟`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) { setNotice('تعذر الحذف. راجع الصلاحيات.'); return }
    setProducts(prev => prev.filter(item => item.id !== p.id))
  }

  return <div className="app-shell">
    <div className="top-strip">خيال — كل اللي بيتك محتاجه في مكان واحد</div>
    <header className="site-header">
      <button className="icon-button mobile-only" aria-label="فتح القائمة" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X/> : <Menu/>}</button>
      <a className="brand" href="#" aria-label="KHYAL الصفحة الرئيسية"><span className="brand-mark">خ</span><span><strong>KHYAL</strong><small>خيال للأدوات المنزلية</small></span></a>
      <div className="search-box"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بتدور على إيه؟ حلل، رفايع، أجهزة..." aria-label="ابحث عن منتج"/></div>
      <div className="header-actions">
        <button className="icon-button" onClick={()=>setAdminOpen(true)} title="لوحة الإدارة"><LayoutDashboard/><span className="desktop-label">الإدارة</span></button>
        <button className="icon-button cart-button" onClick={()=>setCartOpen(true)} aria-label="سلة التسوق"><ShoppingCart/><span>السلة</span><b>{Object.values(cart).reduce((a,b)=>a+b,0)}</b></button>
      </div>
    </header>
    <nav className={`category-nav ${mobileMenu ? 'nav-open':''}`}>
      {categories.map(c => <button key={c.name} className={category===c.name?'active':''} onClick={()=>{setCategory(c.name);setMobileMenu(false)}}><c.icon size={17}/>{c.name}</button>)}
    </nav>

    <main>
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><Sparkles size={15}/> اختيارات تليق ببيتك</span><h1>تفاصيل صغيرة<br/><em>تفرق في بيتك</em></h1><p>اكتشف أدوات مطبخ، حلل، رفايع وأجهزة منزلية مختارة بعناية وبأسعار مناسبة.</p><button className="primary-button" onClick={()=>document.getElementById('products')?.scrollIntoView({behavior:'smooth'})}>تسوق المنتجات <ChevronLeft size={18}/></button><div className="hero-points"><span><CheckCircle2 size={16}/> اختيارات متنوعة</span><span><CheckCircle2 size={16}/> طلب سهل</span></div></div>
        <div className="hero-art"><div className="hero-circle"></div><div className="hero-card card-one"><CookingPot size={68}/><span>أدوات طهي</span></div><div className="hero-card card-two"><Sparkles size={42}/><span>رفايع المطبخ</span></div><div className="hero-card card-three"><Zap size={40}/><span>أجهزة منزلية</span></div><span className="art-star">✦</span></div>
      </section>

      <section className="trust-row"><div><Package/><span><b>تشكيلة متنوعة</b><small>احتياجات البيت اليومية</small></span></div><div><Heart/><span><b>اختيارات عملية</b><small>للمطبخ والبيت</small></span></div><div><MessageCircle/><span><b>تواصل بسهولة</b><small>للاستفسار عن المنتجات</small></span></div></section>

      <section className="products-section" id="products">
        <div className="section-heading"><div><span className="eyebrow">تسوق على مزاجك</span><h2>{category==='الكل'?'منتجات مختارة ليك':category}</h2><p>اختار اللي يناسب بيتك وميزانيتك</p></div><span className="results-count">{filtered.length} منتجات</span></div>
        <div className="mobile-search search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن منتج..."/></div>
        <div className="product-grid">
          {filtered.map(p=><article className="product-card" key={p.id} onClick={()=>openProduct(p)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')openProduct(p)}}><div className="product-image">{(p.color_variants?.find(v=>v.name===selectedColors[p.id])?.image_url || p.image_url) ? <img src={p.color_variants?.find(v=>v.name===selectedColors[p.id])?.image_url || p.image_url || ''} alt={p.name} loading="lazy" onError={e=>{e.currentTarget.style.display='none';e.currentTarget.parentElement?.classList.add('image-failed')}}/> : <div className="image-placeholder"><CookingPot size={48}/></div>}{p.old_price && p.old_price>p.price && <span className="discount-badge">خصم {Math.round((1-p.price/p.old_price!)*100)}٪</span>}<button className="quick-add" onClick={e=>{e.stopPropagation();openProduct(p)}} aria-label={`تفاصيل ${p.name}`}><Plus size={19}/></button></div><div className="product-info"><span className="product-category">{p.category}</span><h3>{p.name}</h3>{!!p.color_variants?.length && <div className="color-choices" aria-label="اختار اللون"><small>اللون: {selectedColors[p.id] || 'اختار اللون'}</small><div>{p.color_variants.map(v=><button type="button" key={v.name} title={v.name} aria-label={v.name} className={`color-swatch ${selectedColors[p.id]===v.name?'selected':''}`} style={{backgroundColor:v.hex || '#ddd'}} onClick={e=>{e.stopPropagation();setSelectedColors(prev=>({...prev,[p.id]:v.name}))}}/>)}</div></div>}<div className="price-line"><strong>{money(p.price)}</strong>{p.old_price && p.old_price>p.price && <del>{money(p.old_price)}</del>}</div><div className="stock-line">{p.stock>0?'متاح للطلب':'اسأل عن التوفر'}</div><button className="add-button" onClick={e=>{e.stopPropagation();openProduct(p)}}><ShoppingCart size={17}/> أضف للسلة</button></div></article>)}
        </div>
        {filtered.length===0 && <div className="empty-state"><Search size={35}/><h3>ملقيناش منتجات مطابقة</h3><p>جرب كلمة بحث مختلفة أو اختار قسم تاني.</p><button className="secondary-button" onClick={()=>{setQuery('');setCategory('الكل')}}>عرض كل المنتجات</button></div>}
      </section>
      <section className="bottom-cta"><div><span className="eyebrow">محتاج مساعدة؟</span><h2>مش لاقي اللي بتدور عليه؟</h2><p>تواصل معانا واسأل عن المنتج المناسب ليك.</p></div><button className="primary-button" onClick={()=>whatsapp?window.open(`https://wa.me/${whatsapp.replace(/\D/g,'')}`,'_blank','noopener,noreferrer'):setNotice('أضف رقم واتساب في إعدادات المشروع أولًا')}><Phone size={18}/> تواصل معنا</button></section>
    </main>
    <footer><a className="brand footer-brand" href="#"><span className="brand-mark">خ</span><span><strong>KHYAL</strong><small>خيال للأدوات المنزلية</small></span></a><p>اختيارات عملية لبيت أجمل.</p><small>© {new Date().getFullYear()} KHYAL — جميع الحقوق محفوظة</small></footer>

    {detailProduct && <div className="overlay detail-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setDetailProduct(null)}}><section className="product-detail"><button className="icon-button detail-close" onClick={()=>setDetailProduct(null)} aria-label="إغلاق"><X/></button><div className="detail-layout"><div className="detail-photo">{(detailProduct.color_variants?.find(v=>v.name===detailColor)?.image_url || detailProduct.image_url) ? <img src={detailProduct.color_variants?.find(v=>v.name===detailColor)?.image_url || detailProduct.image_url || ''} alt={detailProduct.name}/> : <div className="image-placeholder"><CookingPot size={54}/></div>}</div><div className="detail-copy"><span className="product-category">{detailProduct.category}</span><h2>{detailProduct.name}</h2><div className="price-line"><strong>{money(detailProduct.price)}</strong>{detailProduct.old_price&&detailProduct.old_price>detailProduct.price&&<del>{money(detailProduct.old_price)}</del>}</div><p>{detailProduct.description || 'منتج عملي وأنيق لبيتك.'}</p>{!!detailProduct.color_variants?.length&&<div className="detail-colors"><b>اختار اللون</b><div>{detailProduct.color_variants.map(v=><button type="button" key={v.name} className={detailColor===v.name?'detail-color selected':'detail-color'} onClick={()=>setDetailColor(v.name)}><span style={{backgroundColor:v.hex||'#ddd'}}/>{v.name}</button>)}</div><small>المتاح من اللون المختار: {detailProduct.color_variants.find(v=>v.name===detailColor)?.stock ?? detailProduct.stock} طقم</small></div>}<div className="detail-quantity"><b>الكمية (عدد الأطقم)</b><div className="quantity-control"><button type="button" disabled={detailQty<=1} onClick={()=>setDetailQty(q=>Math.max(1,q-1))}>−</button><span>{detailQty}</span><button type="button" disabled={detailQty >= (detailProduct.color_variants?.length ? (detailProduct.color_variants.find(v=>v.name===detailColor)?.stock ?? detailProduct.stock) : detailProduct.stock)} onClick={()=>setDetailQty(q=>q+1)}>+</button></div></div><button className="primary-button full-button" onClick={()=>{addToCart(detailProduct,detailColor,detailQty);setDetailProduct(null)}}><ShoppingCart size={18}/> أضف للسلة</button></div></div></section></div>}
    {cartOpen && <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="drawer"><div className="drawer-head"><h2><ShoppingCart/> سلة التسوق</h2><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="إغلاق"><X/></button></div>{cartItems.length===0?<div className="empty-state"><ShoppingCart size={36}/><h3>السلة لسه فاضية</h3><p>ضيف المنتجات اللي عجبتك.</p></div>:<><div className="cart-list">{cartItems.map(item=><div className="cart-item" key={item.key}><div className="cart-thumb">{item.image&&<img src={item.image} alt=""/>}</div><div className="cart-item-info"><b>{item.product.name}</b>{item.colorName&&<small>اللون: {item.colorName}</small>}<strong>{money(item.product.price)}</strong><div className="quantity-control"><button onClick={()=>setCart(c=>({...c,[item.key]:Math.max(0,(c[item.key]||0)-1)}))}>−</button><span>{item.qty}</span><button disabled={item.qty>=item.stock} onClick={()=>setCart(c=>({...c,[item.key]:Math.min(item.stock,(c[item.key]||0)+1)}))}>+</button></div></div><button className="icon-button danger" onClick={()=>setCart(c=>({...c,[item.key]:0}))} aria-label="حذف"><Trash2 size={17}/></button></div>)}</div><div className="cart-footer"><div className="total-line"><span>الإجمالي المبدئي</span><strong>{money(cartTotal)}</strong></div><small>مصاريف الشحن يتم تأكيدها مع المتجر.</small><button className="primary-button full-button" onClick={orderWhatsApp}><MessageCircle size={18}/> أكمل الطلب على واتساب</button></div></>}</aside></div>}

    {adminOpen && <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setAdminOpen(false)}}><aside className="admin-panel"><div className="drawer-head"><h2><LayoutDashboard/> لوحة إدارة خيال</h2><button className="icon-button" onClick={()=>setAdminOpen(false)} aria-label="إغلاق"><X/></button></div>{!isSupabaseConfigured?<div className="setup-note"><h3>خطوة إعداد مطلوبة</h3><p>اتصال قاعدة البيانات غير مفعّل في النسخة الحالية. أضف بيانات اتصال Supabase في ملف <code>.env</code> ونفّذ ملف <code>supabase/schema.sql</code>.</p><p>راجع README لمعرفة خطوات إنشاء أول حساب مدير بطريقة آمنة.</p></div>:!session?<form className="admin-login" onSubmit={login}><h3>تسجيل دخول المدير</h3><label>البريد الإلكتروني<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{loginError&&<p className="form-error">{loginError}</p>}<button className="primary-button full-button"><LogIn size={17}/> تسجيل الدخول</button><small>يجب إنشاء حساب المدير مسبقًا من Supabase وتعيين دوره حسب ملف التعليمات.</small></form>:<div className="admin-content"><div className="admin-welcome"><div><b>أهلًا بيك في الإدارة</b><small>{session.user.email}</small></div><button className="secondary-button" onClick={logout}><LogOut size={16}/> خروج</button></div><div className="admin-stats"><div><small>المنتجات المعروضة</small><b>{products.length}</b></div><div><small>إجمالي وحدات المخزون</small><b>{products.reduce((s,p)=>s+p.stock,0)}</b></div></div><form className="product-form" onSubmit={saveProduct}><h3>{editing?'تعديل منتج':'إضافة منتج جديد'}</h3><label>اسم المنتج<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label><div className="form-row"><label>القسم<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.filter(c=>c.name!=='الكل').map(c=><option key={c.name}>{c.name}</option>)}</select></label><label>الماركة<input value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></label></div><div className="form-row"><label>السعر بالجنيه<input type="number" min="0" step="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required/></label><label>السعر قبل العرض<input type="number" min="0" step="1" value={form.old_price} onChange={e=>setForm({...form,old_price:e.target.value})}/></label></div><div className="form-row"><label>المخزون<input type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} required/></label><label>رفع صورة المنتج (JPG / PNG / WEBP)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadProductImage(e.target.files?.[0])} disabled={uploadingImage}/>{uploadingImage&&<small>جاري رفع الصورة...</small>}<small>حد أقصى 5 ميجابايت</small></label></div><label>رابط الصورة (اختياري)<input type="url" value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="أو الصق رابط صورة موجودة"/></label>{form.image_url&&<div className="image-preview"><img src={form.image_url} alt="معاينة صورة المنتج"/></div>}<section className="variant-editor"><div><b>ألوان المنتج</b><small>أضف كل لون مع صورته؛ العميل يختار اللون من صفحة المنتج.</small></div>{form.color_variants.map((v,i)=><div className="variant-row" key={i}><label>اسم اللون<input value={v.name} onChange={e=>setForm(prev=>({...prev,color_variants:prev.color_variants.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))} placeholder="مثلاً: أسود مطفي"/></label><label>عدد الأطقم من اللون<input type="number" min="0" step="1" value={v.stock ?? 0} onChange={e=>setForm(prev=>({...prev,color_variants:prev.color_variants.map((x,j)=>j===i?{...x,stock:Number(e.target.value)}:x)}))}/></label><label>لون العرض<input type="color" value={v.hex || '#d9d9d9'} onChange={e=>setForm(prev=>({...prev,color_variants:prev.color_variants.map((x,j)=>j===i?{...x,hex:e.target.value}:x)}))}/></label><label>صورة اللون<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(!file||!supabase||!session)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setNotice('ارفع صورة JPG أو PNG أو WEBP أقل من 5 ميجابايت');return}setUploadingImage(true);const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';const path='colors/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;const up=await supabase.storage.from('product-images').upload(path,file,{upsert:false,contentType:file.type});if(up.error){setNotice('فشل رفع صورة اللون؛ راجع صلاحيات التخزين')}else{const url=supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;setForm(prev=>({...prev,color_variants:prev.color_variants.map((x,j)=>j===i?{...x,image_url:url}:x)}));setNotice('تم رفع صورة اللون')}setUploadingImage(false)}}/>{v.image_url&&<img className="variant-preview" src={v.image_url} alt={v.name}/>}</label><button type="button" className="secondary-button" onClick={()=>setForm(prev=>({...prev,color_variants:prev.color_variants.filter((_,j)=>j!==i)}))}>حذف اللون</button></div>)}<button type="button" className="secondary-button" onClick={()=>setForm(prev=>({...prev,color_variants:[...prev.color_variants,{name:'',hex:'#d9d9d9',image_url:''}]}))}><Plus size={16}/> إضافة لون وصورة</button></section><label>الوصف<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="form-row"><button className="primary-button" type="submit">{editing?'حفظ التعديلات':'إضافة المنتج'}</button>{editing&&<button className="secondary-button" type="button" onClick={resetForm}>إلغاء</button>}</div></form><h3>إدارة المنتجات</h3><div className="admin-product-list">{products.map(p=><div className="admin-product" key={p.id}><div><b>{p.name}</b><small>{money(p.price)} · المخزون {p.stock}</small></div><button className="icon-button" onClick={()=>editProduct(p)} aria-label="تعديل"><Pencil size={17}/></button><button className="icon-button danger" onClick={()=>deleteProduct(p)} aria-label="حذف"><Trash2 size={17}/></button></div>)}</div></div>}</aside></div>}
    {notice && <div className="toast" role="status">{notice}</div>}
  </div>
}
